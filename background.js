// Store these in variables so they can be updated at runtime
let clientId = null;
let clientSecret = null;
let accessToken = null;
const checkInterval = 60000; // 1 minute

// Load credentials on startup
chrome.storage.sync.get(['clientId', 'clientSecret'], (data) => {
  clientId = data.clientId;
  clientSecret = data.clientSecret;
  if (clientId && clientSecret) {
    fetchAccessToken();
  }
});

async function hasValidCredentials() {
  const data = await new Promise(resolve => {
    chrome.storage.sync.get(['clientId', 'clientSecret'], resolve);
  });

  if (!data.clientId || !data.clientSecret) {
    console.log('Missing Twitch API credentials');
    return false;
  }

  // Update our runtime variables if they've changed
  if (data.clientId !== clientId || data.clientSecret !== clientSecret) {
    clientId = data.clientId;
    clientSecret = data.clientSecret;
  }

  return true;
}

async function fetchAccessToken() {
  if (!await hasValidCredentials()) {
    return;
  }

  try {
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    return accessToken;
  } catch (error) {
    console.error('Failed to fetch access token:', error);
    accessToken = null;
  }
}

async function checkChannelStatus(channelName = null) {
  // First check if we have valid credentials
  if (!await hasValidCredentials()) {
    console.log('Skipping channel check - no valid credentials');
    return;
  }

  // If no access token, try to get one
  if (!accessToken) {
    await fetchAccessToken();
  }

  // If still no access token, return
  if (!accessToken) {
    console.error('No access token available');
    return;
  }

  try {
    // Get channels and notifications from storage
    const data = await new Promise(resolve => {
      chrome.storage.sync.get(['channels', 'lastNotified'], data => resolve({
        channels: data.channels || [],
        lastNotified: data.lastNotified || {}
      }));
    });

    let channels = data.channels;
    let lastNotified = data.lastNotified;

    // If channelName is provided, only check that channel
    if (channelName) {
      channels = channels.filter(c => c.name === channelName);
    }

    // Skip if no channels to check
    if (channels.length === 0) {
      return;
    }

    // Check each active channel
    for (const channel of channels) {
      if (!channel.active) continue;

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
        if (response.status === 401) {
          // Token expired, fetch new one and retry
          await fetchAccessToken();
          return checkChannelStatus(channelName);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const streamData = await response.json();
      const isLiveNow = streamData.data.length > 0;

      if (isLiveNow) {
        const stream = streamData.data[0];
        const streamStartTime = new Date(stream.started_at).getTime();
        const lastNotifiedTime = lastNotified[channel.name] || 0;

        if (streamStartTime > lastNotifiedTime) {
          // Check if the channel's tab is already open
          const twitchUrl = `https://www.twitch.tv/${channel.name}`;
          chrome.tabs.query({ url: twitchUrl }, existingTabs => {
            if (existingTabs.length === 0) {
              chrome.tabs.create({
                url: twitchUrl,
                active: false
              });
            }
          });

          // Update last notified time
          lastNotified[channel.name] = Date.now();

          // Show Chrome notification
          chrome.notifications.create(`${channel.name}-live`, {
            type: 'basic',
            iconUrl: 'icon128.png',
            title: `${channel.name} is Live!`,
            message: `${stream.title}\nPlaying: ${stream.game_name}`
          });
        }
      } else {
        // If channel is offline, remove the last notification time
        delete lastNotified[channel.name];
      }
    }

    // Save updated notification times back to storage
    await chrome.storage.sync.set({ lastNotified });

  } catch (error) {
    console.error('Error checking channel status:', error);
  }
}

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'refreshToken':
      // Clear existing token and fetch new one
      accessToken = null;
      fetchAccessToken().then(() => {
        checkChannelStatus(); // Check all channels with new token
      });
      break;

    case 'clearToken':
      // Clear all credentials and token
      clientId = null;
      clientSecret = null;
      accessToken = null;
      break;

    case 'checkChannelStatus':
      checkChannelStatus(message.channelName);
      break;
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Set up periodic checking
chrome.alarms.create('checkChannelStatus', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'checkChannelStatus') {
    checkChannelStatus();
  }
});

// Check channels when extension is first loaded
// Only if we have credentials
hasValidCredentials().then(valid => {
  if (valid) {
    checkChannelStatus();
  }
});