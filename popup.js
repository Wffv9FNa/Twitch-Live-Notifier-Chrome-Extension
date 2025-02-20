document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.getElementById('addButton');
  const channelInput = document.getElementById('channelInput');
  const channelList = document.getElementById('channelList');

  // Enable add button if input has value
  channelInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    addButton.disabled = value.length === 0;

    if (value && !/^[a-zA-Z0-9_]{4,25}$/.test(value)) {
      channelInput.setCustomValidity('Invalid Twitch username format');
    } else {
      channelInput.setCustomValidity('');
    }
  });

  // Add channel functionality
  addButton.addEventListener('click', () => {
    const channelName = channelInput.value.trim().toLowerCase();
    if (channelName) {
      chrome.storage.sync.get('channels', data => {
        let channels = data.channels || [];
        if (!channels.some(c => c.name === channelName)) {
          channels.push({ name: channelName, active: true });
          chrome.storage.sync.set({ channels }, () => {
            updateChannelList();
            channelInput.value = '';
            addButton.disabled = true;
            chrome.runtime.sendMessage({
              action: 'checkChannelStatus',
              channelName
            });
          });
        }
      });
    }
  });

  function updateChannelList() {
    chrome.storage.sync.get('channels', data => {
      let channels = data.channels || [];
      channelList.innerHTML = '';

      if (channels.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No channels added yet. Start by adding your favorite Twitch channels above!';
        channelList.appendChild(emptyState);
        return;
      }

      channels.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel-item';

        // Channel name
        const channelName = document.createElement('span');
        channelName.className = 'channel-name';
        channelName.textContent = channel.name;
        channelElement.appendChild(channelName);

        // Remove button
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-button';
        removeButton.textContent = 'Remove';
        removeButton.setAttribute('data-tooltip', 'Remove channel');

        removeButton.onclick = () => {
          chrome.storage.sync.get('channels', data => {
            const updatedChannels = data.channels.filter(c => c.name !== channel.name);
            chrome.storage.sync.set({ channels: updatedChannels }, () => {
              updateChannelList();
            });
          });
        };
        channelElement.appendChild(removeButton);

        // Toggle switch
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'switch';

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = channel.active;

        const toggleSpan = document.createElement('span');
        toggleSpan.className = 'slider';

        toggleInput.onchange = () => {
          chrome.storage.sync.get('channels', data => {
            const updatedChannels = data.channels.map(c =>
              c.name === channel.name ? { ...c, active: toggleInput.checked } : c
            );
            chrome.storage.sync.set({ channels: updatedChannels });
          });
        };

        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSpan);
        channelElement.appendChild(toggleLabel);

        channelList.appendChild(channelElement);
      });
    });
  }

  // Initial load
  updateChannelList();
});
