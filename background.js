// Store these in variables so they can be updated at runtime
let clientId = null;
let clientSecret = null;
let accessToken = null;
let checkInterval = 1; // 1 minute default
let playerPatterns = null; // Will store player detection patterns

console.log('Background script initialized');

// Load credentials on startup
chrome.storage.sync.get(['clientId', 'clientSecret', 'checkInterval', 'playerPatterns'], (data) => {
  console.log('Initial settings loaded:', {
    hasClientId: !!data.clientId,
    hasClientSecret: !!data.clientSecret,
    checkInterval: data.checkInterval || 1,
    hasPlayerPatterns: !!data.playerPatterns
  });

  clientId = data.clientId || null;
  clientSecret = data.clientSecret || null;
  checkInterval = data.checkInterval || 1;
  playerPatterns = data.playerPatterns || initDefaultPlayerPatterns();

  console.log('Global variables set:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret
  });

  if (clientId && clientSecret) {
    console.log('Credentials found, fetching initial token');
    fetchAccessToken();
  }

  // Auto detect installed players
  detectInstalledPlayers();
});

// Initialize default player patterns if none exist
function initDefaultPlayerPatterns() {
  const defaultPatterns = {
    official: {
      name: "Official Twitch",
      enabled: true,
      pattern: `https://www.twitch.tv/CHANNEL_NAME*`
    },
    alternate: {
      name: "Alternate Player for Twitch.tv",
      enabled: true,
      pattern: `chrome-extension://bhplkbgoehhhddaoolmakpocnenplmhf/player.html?channel=CHANNEL_NAME*`
    }
  };

  // Save the default patterns
  chrome.storage.sync.set({ playerPatterns: defaultPatterns });
  return defaultPatterns;
}

// Auto-detect installed player extensions
async function detectInstalledPlayers() {
  console.log('Detecting installed Twitch player extensions');

  const knownPlayers = [
    {
      id: "bhplkbgoehhhddaoolmakpocnenplmhf",
      name: "Alternate Player for Twitch.tv",
      pattern: `chrome-extension://bhplkbgoehhhddaoolmakpocnenplmhf/player.html?channel=CHANNEL_NAME*`
    }
    // Add other known players here in the future
  ];

  let detected = false;

  // Check if the patterns already include this player
  for (const player of knownPlayers) {
    const found = Object.values(playerPatterns).some(p =>
      p.pattern.includes(player.id)
    );

    if (!found) {
      // Try to detect if it's installed
      try {
        const response = await fetch(`chrome-extension://${player.id}/manifest.json`, {
          method: 'HEAD',
          mode: 'no-cors'
        });

        // If we get here, the extension exists
        console.log(`Detected player extension: ${player.name}`);

        // Add to patterns
        const key = player.id.substring(0, 8);
        playerPatterns[key] = {
          name: player.name,
          enabled: true,
          pattern: player.pattern
        };

        detected = true;
      } catch (e) {
        console.log(`Player ${player.name} not detected`);
      }
    }
  }

  // Save updated patterns if changes were made
  if (detected) {
    chrome.storage.sync.set({ playerPatterns });
    console.log('Updated player patterns with detected extensions');
  }
}

// Check if a channel is already open in any tab
async function isChannelAlreadyOpen(channelName) {
  if (!playerPatterns) {
    // Load patterns if not already loaded
    const data = await new Promise(resolve => {
      chrome.storage.sync.get('playerPatterns', data => resolve(data));
    });
    playerPatterns = data.playerPatterns || initDefaultPlayerPatterns();
  }

  // Create URL patterns for all enabled players
  const urlPatterns = Object.values(playerPatterns)
    .filter(p => p.enabled)
    .map(p => p.pattern.replace('CHANNEL_NAME', channelName));

  console.log('Checking for channel tabs with patterns:', urlPatterns);

  // Check each pattern in parallel
  const tabQueryResults = await Promise.all(
    urlPatterns.map(pattern =>
      new Promise(resolve => {
        chrome.tabs.query({ url: pattern }, tabs => resolve(tabs));
      })
    )
  );

  // Flatten results and check if any tabs were found
  const allMatchingTabs = tabQueryResults.flat();
  console.log(`Found ${allMatchingTabs.length} tabs for channel: ${channelName}`,
    allMatchingTabs.map(t => t.url));

  return allMatchingTabs.length > 0;
}

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
        const shouldNotify = streamStartTime > lastNotifiedTime;

        console.log('Stream status for', channel.name, {
          streamStartTime: new Date(streamStartTime),
          lastNotifiedTime: new Date(lastNotifiedTime),
          shouldNotify: shouldNotify
        });

        // Always check if the channel is already open first
        console.log('Checking if channel is already open:', channel.name);
        const isAlreadyOpen = await isChannelAlreadyOpen(channel.name);
        const twitchUrl = `https://www.twitch.tv/${channel.name}`;

        // Handle opening tabs and notifications separately
        if (!isAlreadyOpen) {
          // Create new tab if channel is live and not already open
          console.log('Creating new tab for:', channel.name);
          chrome.tabs.create({
            url: twitchUrl,
            active: true  // Make the tab active when created
          }, (tab) => {
            if (chrome.runtime.lastError) {
              console.error('Failed to create tab:', chrome.runtime.lastError);
              // Try alternative method if the first one fails
              chrome.windows.create({
                url: twitchUrl,
                focused: true
              }, (window) => {
                if (chrome.runtime.lastError) {
                  console.error('Failed to create window:', chrome.runtime.lastError);
                } else {
                  console.log('Successfully created new window for:', channel.name);
                }
              });
            } else {
              console.log('Successfully created new tab for:', channel.name);
            }
          });

          // Only show notification if we haven't notified for this stream yet
          if (shouldNotify) {
            // Create notification
            chrome.notifications.create(`${channel.name}-live`, {
              type: 'basic',
              iconUrl: 'icon128.png',
              title: `${channel.name} is Live!`,
              message: `${stream.title}\nPlaying: ${stream.game_name}`
            });
          }

          // Always update lastNotified when we open a tab, regardless of notification
          lastNotified[channel.name] = Date.now();
          console.log('Updating lastNotified time for:', channel.name, 'to:', new Date(lastNotified[channel.name]));
        } else {
          console.log('Channel already open in a tab, skipping tab creation and notification');

          // Update lastNotified if needed
          if (shouldNotify) {
            lastNotified[channel.name] = Date.now();
          }
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

    case 'updateSettings':
      console.log('Settings update requested:', message);
      if (message.checkInterval) {
        // Update the global check interval
        checkInterval = message.checkInterval;
        console.log('Updated check interval to:', checkInterval, 'minutes');

        // Clear existing alarm and create a new one with updated interval
        chrome.alarms.clear('checkChannelStatus', (wasCleared) => {
          console.log('Cleared existing alarm:', wasCleared);
          chrome.alarms.create('checkChannelStatus', { periodInMinutes: checkInterval });
          console.log('Created new alarm with interval:', checkInterval, 'minutes');
        });
      }
      break;

    case 'updatePlayerPatterns':
      console.log('Player pattern update requested');
      chrome.storage.sync.get('playerPatterns', (data) => {
        playerPatterns = data.playerPatterns;
        console.log('Updated player patterns from storage');
      });
      break;
  }

  return true;
});

// Set up periodic checking - use the checkInterval variable
chrome.alarms.create('checkChannelStatus', { periodInMinutes: checkInterval });

chrome.alarms.onAlarm.addListener(alarm => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'checkChannelStatus') {
    checkChannelStatus();
  }
});

// Initial check
console.log('Performing initial channel check');
checkChannelStatus();