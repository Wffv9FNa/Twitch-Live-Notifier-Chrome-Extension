const addButton = document.getElementById('addButton');
const channelInput = document.getElementById('channelInput');
const channelList = document.getElementById('channelList');

addButton.addEventListener('click', () => {
  const channelName = channelInput.value.trim();
  if (channelName) {
    chrome.storage.sync.get('channels', data => {
      let channels = data.channels || [];
      if (!channels.some(c => c.name === channelName)) {
        channels.push({ name: channelName, active: true });
        chrome.storage.sync.set({ channels }, () => {
          updateChannelList();
          chrome.runtime.sendMessage({ action: 'checkChannelStatus', channelName });
        });
      }
    });
  }
});

function updateChannelList() {
  chrome.storage.sync.get('channels', data => {
    let channels = data.channels || [];
    channelList.innerHTML = '';

    channels.forEach(channel => {
      const channelElement = document.createElement('div');
      channelElement.textContent = channel.name;
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';

      removeButton.addEventListener('click', () => {
        channels = channels.filter(c => c.name !== channel.name);
        chrome.storage.sync.set({ channels }, () => {
          updateChannelList();
        });
      });

      const toggleLabel = document.createElement('label');
      toggleLabel.classList.add('switch');
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = channel.active;
      const toggleSpan = document.createElement('span');
      toggleSpan.classList.add('slider');

      toggleInput.addEventListener('change', () => {
        channel.active = !channel.active;
        chrome.storage.sync.set({ channels }, () => {
          updateChannelList();
        });
      });

      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(toggleSpan);
      channelElement.appendChild(removeButton);
      channelElement.appendChild(toggleLabel);
      channelList.appendChild(channelElement);
    });
  });
}

updateChannelList();
