document.addEventListener('DOMContentLoaded', () => {
  const addButton = document.getElementById('addButton');
  const channelInput = document.getElementById('channelInput');
  const channelList = document.getElementById('channelList');
  const credentialsWarning = document.getElementById('credentialsWarning');
  const container = document.querySelector('.container');

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

            // Immediately check if the new channel is live
            chrome.runtime.sendMessage({
              action: 'checkChannelStatus',
              channelName: channelName
            }, response => {
              console.log('Message sent for channel:', channelName);
              if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
              }
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
            chrome.storage.sync.set({ channels: updatedChannels }, () => {
              // If channel was just enabled, immediately check if it's live
              if (toggleInput.checked) {
                chrome.runtime.sendMessage({
                  action: 'checkChannelStatus',
                  channelName: channel.name
                });
              }
            });
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

  // Settings Modal Elements
  const settingsButton = document.getElementById('settingsButton');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const saveSettings = document.getElementById('saveSettings');
  const clearSettings = document.getElementById('clearSettings');
  const clientIdInput = document.getElementById('clientId');
  const clientSecretInput = document.getElementById('clientSecret');

  // Add these new elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const checkIntervalInput = document.getElementById('checkInterval');

  console.log('Initial element check:');
  console.log('- Settings button found:', !!settingsButton);
  console.log('- Settings modal found:', !!settingsModal);
  console.log('- Close button found:', !!closeSettings);

  settingsButton.addEventListener('click', () => {
    console.log('Settings button clicked');
    settingsModal.style.display = 'block';
    console.log('Modal display style:', settingsModal.style.display);
    // Update player list when modal is opened
    updatePlayerList();
  });

  closeSettings.addEventListener('click', () => {
    console.log('Close button clicked');
    settingsModal.style.display = 'none';
    console.log('Modal display style after close:', settingsModal.style.display);
  });

  // Log event delegation for modal clicks
  settingsModal.addEventListener('click', (event) => {
    console.log('Modal clicked, target:', event.target.id);
    if (event.target === settingsModal) {
      console.log('Clicking outside modal');
      settingsModal.style.display = 'none';
    }
  });

  // Tab switching logic
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Show corresponding tab content
      const tabId = button.dataset.tab + 'Tab';
      tabContents.forEach(content => {
        content.style.display = content.id === tabId ? 'block' : 'none';
      });
    });
  });

  // Load all settings
  chrome.storage.sync.get(['clientId', 'clientSecret', 'checkInterval'], (data) => {
    if (data.clientId) clientIdInput.value = data.clientId;
    if (data.clientSecret) clientSecretInput.value = data.clientSecret;
    if (data.checkInterval) checkIntervalInput.value = data.checkInterval;
  });

  // Validate check interval input
  checkIntervalInput.addEventListener('input', () => {
    const value = parseInt(checkIntervalInput.value);
    if (value < 1) checkIntervalInput.value = 1;
    if (value > 60) checkIntervalInput.value = 60;
  });

  // API Settings buttons
  const saveApiSettings = document.getElementById('saveApiSettings');
  const clearApiSettings = document.getElementById('clearApiSettings');

  // Interval Settings buttons
  const saveIntervalSettings = document.getElementById('saveIntervalSettings');
  const restoreDefaultInterval = document.getElementById('restoreDefaultInterval');

  // Player Settings elements
  const playerList = document.getElementById('playerList');
  const customPlayerPattern = document.getElementById('customPlayerPattern');
  const customPlayerName = document.getElementById('customPlayerName');
  const addCustomPattern = document.getElementById('addCustomPattern');
  const resetPlayerPatterns = document.getElementById('resetPlayerPatterns');

  // Add a function to check credentials and update the warning banner
  function updateCredentialsWarning() {
    chrome.storage.sync.get(['clientId', 'clientSecret'], (data) => {
      if (!data.clientId || !data.clientSecret) {
        credentialsWarning.style.display = 'flex';
        container.classList.add('has-warning');
      } else {
        credentialsWarning.style.display = 'none';
        container.classList.remove('has-warning');
      }
    });
  }

  // Call this function on initial load
  updateCredentialsWarning();

  // Helper function for temporary feedback
  function showFeedback(button, originalText) {
    button.textContent = '✓ Saved';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }

  // API Settings handlers
  saveApiSettings.addEventListener('click', () => {
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();

    if (!clientId || !clientSecret) {
      alert('Please enter both Client ID and Client Secret');
      return;
    }

    chrome.storage.sync.set({ clientId, clientSecret }, () => {
      chrome.runtime.sendMessage({ action: 'refreshToken' });
      // Update warning banner after saving credentials
      updateCredentialsWarning();
      showFeedback(saveApiSettings, 'Save Settings');
    });
  });

  clearApiSettings.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your API credentials?')) {
      chrome.storage.sync.remove(['clientId', 'clientSecret'], () => {
        clientIdInput.value = '';
        clientSecretInput.value = '';
        chrome.runtime.sendMessage({ action: 'clearSettings' });
        // Update warning banner after clearing credentials
        updateCredentialsWarning();
      });
    }
  });

  // Interval Settings handlers
  saveIntervalSettings.addEventListener('click', () => {
    const checkInterval = parseInt(checkIntervalInput.value) || 1;
    chrome.storage.sync.set({ checkInterval }, () => {
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        checkInterval
      });
      showFeedback(saveIntervalSettings, 'Save Settings');
    });
  });

  restoreDefaultInterval.addEventListener('click', () => {
    checkIntervalInput.value = '1';
    chrome.storage.sync.set({ checkInterval: 1 }, () => {
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        checkInterval: 1
      });
    });
  });

  // Player settings functionality
  function updatePlayerList() {
    chrome.storage.sync.get('playerPatterns', (data) => {
      playerList.innerHTML = '';

      const patterns = data.playerPatterns || {};

      if (Object.keys(patterns).length === 0) {
        playerList.innerHTML = '<p>No player patterns configured yet.</p>';
        return;
      }

      Object.entries(patterns).forEach(([key, player]) => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'player-checkbox';
        checkbox.checked = player.enabled;
        checkbox.onchange = () => {
          patterns[key].enabled = checkbox.checked;
          chrome.storage.sync.set({ playerPatterns: patterns }, () => {
            chrome.runtime.sendMessage({ action: 'updatePlayerPatterns' });
          });
        };
        playerItem.appendChild(checkbox);

        // Player info
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';

        const playerName = document.createElement('span');
        playerName.className = 'player-name';
        playerName.textContent = player.name;
        playerInfo.appendChild(playerName);

        const playerPattern = document.createElement('span');
        playerPattern.className = 'player-pattern';
        playerPattern.textContent = player.pattern;
        playerInfo.appendChild(playerPattern);

        playerItem.appendChild(playerInfo);

        // Don't allow deletion of built-in players
        if (key !== 'official') {
          // Remove button
          const removeButton = document.createElement('button');
          removeButton.className = 'remove-player';
          removeButton.innerHTML = '&times;';
          removeButton.onclick = () => {
            delete patterns[key];
            chrome.storage.sync.set({ playerPatterns: patterns }, () => {
              updatePlayerList();
              chrome.runtime.sendMessage({ action: 'updatePlayerPatterns' });
            });
          };
          playerItem.appendChild(removeButton);
        }

        playerList.appendChild(playerItem);
      });
    });
  }

  // Add custom player pattern
  addCustomPattern.addEventListener('click', () => {
    const pattern = customPlayerPattern.value.trim();
    const name = customPlayerName.value.trim();

    if (!pattern || !name) {
      alert('Please enter both a pattern and a name');
      return;
    }

    if (!pattern.includes('CHANNEL_NAME')) {
      alert('Pattern must include CHANNEL_NAME as a placeholder');
      return;
    }

    chrome.storage.sync.get('playerPatterns', (data) => {
      const patterns = data.playerPatterns || {};
      const key = `custom_${Date.now()}`;

      patterns[key] = {
        name: name,
        enabled: true,
        pattern: pattern
      };

      chrome.storage.sync.set({ playerPatterns: patterns }, () => {
        updatePlayerList();
        customPlayerPattern.value = '';
        customPlayerName.value = '';
        chrome.runtime.sendMessage({ action: 'updatePlayerPatterns' });
        showFeedback(addCustomPattern, 'Add Player');
      });
    });
  });

  // Reset player patterns
  resetPlayerPatterns.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all player patterns to defaults?')) {
      // Remove from storage - the background script will reinitialize defaults
      chrome.storage.sync.remove('playerPatterns', () => {
        updatePlayerList();
        chrome.runtime.sendMessage({ action: 'updatePlayerPatterns' });
      });
    }
  });
});
