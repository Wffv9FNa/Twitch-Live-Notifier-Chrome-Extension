const clientId = 'your-client-id-here';
const clientSecret = 'your-client-secret-here';
const checkInterval = 60000;

let accessToken;
let channels = [];
let channelStatus = {};

async function fetchAccessToken() {
  const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
    method: 'POST'
  });
  const data = await response.json();
  accessToken = data.access_token;
}

async function checkChannelStatus(channelName) {
  const result = await new Promise(resolve => {
    chrome.storage.sync.get('channels', data => {
      resolve(data.channels);
    });
  });

  channels = result || [];

  if (!accessToken) {
    await fetchAccessToken();
  }

  if (channelName) {
    channels = channels.filter(c => c.name === channelName);
  }

  channels.forEach(async channel => {
    if (!channel.active) {
      return;
    }
    const channelId = channel.name;
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${channelId}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    const isLiveNow = data.data.length > 0;
    const twitchUrl = `https://www.twitch.tv/${channelId}`;

    if (isLiveNow && !channelStatus[channelId]) {
      channelStatus[channelId] = true;

      chrome.tabs.query({ url: twitchUrl }, tabs => {
        if (tabs.length === 0) {
          chrome.tabs.create({ url: twitchUrl });
        }
      });
    } else if (!isLiveNow) {
      channelStatus[channelId] = false;
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('checkChannelStatus', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'checkChannelStatus') {
      checkChannelStatus();
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkChannelStatus') {
    checkChannelStatus(message.channelName);
  }
});

checkChannelStatus();