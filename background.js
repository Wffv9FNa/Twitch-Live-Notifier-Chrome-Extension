// Store these in variables so they can be updated at runtime
let clientId = null;
let clientSecret = null;
let accessToken = null;
let checkInterval = 1; // 1 minute default

console.log('Background script initialized');

// Load credentials on startup
chrome.storage.sync.get(['clientId', 'clientSecret', 'checkInterval'], (data) => {
  console.log('Initial settings loaded:', {
    hasClientId: !!data.clientId,
    hasClientSecret: !!data.clientSecret,
    checkInterval: data.checkInterval || 1
  });

  clientId = data.clientId || null;
  clientSecret = data.clientSecret || null;
  checkInterval = data.checkInterval || 1;

  console.log('Global variables set:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret
  });

  if (clientId && clientSecret) {
    console.log('Credentials found, fetching initial token');
    fetchAccessToken();
  }
});

async function hasValidCredentials() {
  // First check global variables
  if (clientId && clientSecret) {
    console.log('Using cached credentials');
    return true;
  }

  // If not in globals, check storage
  const data = await new Promise(resolve => {
    chrome.storage.sync.get(['clientId', 'clientSecret'], resolve);
  });

  console.log('Checking credentials validity:', {
    hasClientId: !!data.clientId,
    hasClientSecret: !!data.clientSecret
  });

  // Update globals if found in storage
  if (data.clientId && data.clientSecret) {
    clientId = data.clientId;
    clientSecret = data.clientSecret;
    console.log('Updated global credentials from storage');
  }

  return !!(data.clientId && data.clientSecret);
}

async function fetchAccessToken() {
  console.log('Fetching access token with credentials:', {
    clientId: clientId ? 'present' : 'missing',
    clientSecret: clientSecret ? 'present' : 'missing'
  });

  if (!clientId || !clientSecret) {
    console.error('Missing credentials for token fetch');
    return null;
  }

  try {
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Token fetch successful');
    accessToken = data.access_token;
    return accessToken;
  } catch (error) {
    console.error('Failed to fetch access token:', error);
    return null;
  }
}

async function checkChannelStatus(channelName = null) {
  console.log('checkChannelStatus called for:', channelName || 'all channels');

  if (!await hasValidCredentials()) {
    console.log('No valid credentials, skipping check');
    return;
  }

  if (!accessToken) {
    console.log('No access token, attempting to fetch');
    await fetchAccessToken();
  }

  if (!accessToken) {
    console.error('Failed to obtain access token');
    return;
  }

  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get(['channels', 'lastNotified'], data => {
        console.log('Retrieved storage data:', {
          channelCount: (data.channels || []).length,
          lastNotified: data.lastNotified || {}
        });
        resolve({
          channels: data.channels || [],
          lastNotified: data.lastNotified || {}
        });
      });
    });

    let channels = data.channels;
    if (channelName) {
      channels = channels.filter(c => c.name === channelName);
      console.log('Filtered to specific channel:', channelName);
    }

    const lastNotified = data.lastNotified || {};

    for (const channel of channels) {
      if (!channel.active) {
        console.log('Channel inactive, skipping:', channel.name);
        continue;
      }

      console.log('Checking channel:', channel.name);
      const response = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${channel.name}`,
        {
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText);
        continue;
      }

      const streamData = await response.json();
      console.log('Stream data received for', channel.name, ':', streamData);

      const isLiveNow = streamData.data.length > 0;
      if (isLiveNow) {
        const stream = streamData.data[0];
        const streamStartTime = new Date(stream.started_at).getTime();
        const lastNotifiedTime = lastNotified[channel.name] || 0;

        console.log('Stream status for', channel.name, {
          streamStartTime: new Date(streamStartTime),
          lastNotifiedTime: new Date(lastNotifiedTime),
          shouldNotify: streamStartTime > lastNotifiedTime
        });

        if (streamStartTime > lastNotifiedTime) {
          const twitchUrl = `https://www.twitch.tv/${channel.name}`;
          console.log('Checking for existing tabs for:', twitchUrl);

          chrome.tabs.query({ url: twitchUrl }, existingTabs => {
            console.log('Existing tabs found:', existingTabs.length);
            if (existingTabs.length === 0) {
              console.log('Creating new tab for:', channel.name);
              chrome.tabs.create({
                url: twitchUrl,
                active: false
              });
            }
          });

          lastNotified[channel.name] = Date.now();
          console.log('Updating lastNotified time for:', channel.name, 'to:', new Date(lastNotified[channel.name]));

          chrome.notifications.create(`${channel.name}-live`, {
            type: 'basic',
            iconUrl: 'icon128.png',
            title: `${channel.name} is Live!`,
            message: `${stream.title}\nPlaying: ${stream.game_name}`
          });
        }
      } else {
        console.log('Channel is offline:', channel.name);
        delete lastNotified[channel.name];
      }
    }

    console.log('Saving updated lastNotified times:', lastNotified);
    await chrome.storage.sync.set({ lastNotified });

  } catch (error) {
    console.error('Error in checkChannelStatus:', error);
  }
}

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  switch (message.action) {
    case 'refreshToken':
      console.log('Token refresh requested');
      chrome.storage.sync.get(['clientId', 'clientSecret'], (data) => {
        clientId = data.clientId;
        clientSecret = data.clientSecret;
        console.log('Refreshed credentials from storage:', {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        });
        accessToken = null;
        fetchAccessToken().then(() => checkChannelStatus());
      });
      break;

    case 'clearSettings':
      console.log('Settings clear requested');
      clientId = null;
      clientSecret = null;
      accessToken = null;
      break;

    case 'checkChannelStatus':
      console.log('Channel status check requested for:', message.channelName);
      checkChannelStatus(message.channelName);
      break;
  }

  return true;
});

// Set up periodic checking
chrome.alarms.create('checkChannelStatus', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(alarm => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'checkChannelStatus') {
    checkChannelStatus();
  }
});

// Initial check
console.log('Performing initial channel check');
checkChannelStatus();