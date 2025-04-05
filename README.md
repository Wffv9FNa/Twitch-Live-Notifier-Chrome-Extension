# Twitch Live Notifier Chrome Extension

A Chrome extension that monitors Twitch channels and notifies you when they go live.

## Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="./images/main-extension.png" width="380px" alt="Main Extension Interface"/><br/>
        <em>Main Extension Interface</em>
      </td>
      <td align="center">
        <img src="./images/api-settings.png" width="380px" alt="API Credentials Settings"/><br/>
        <em>API Credentials Settings</em>
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="./images/check-interval.png" width="380px" alt="Check Interval Settings"/><br/>
        <em>Check Interval Settings</em>
      </td>
      <td align="center">
        <img src="./images/player-detection.png" width="380px" alt="Player Detection Settings"/><br/>
        <em>Player Detection Settings</em>
      </td>
    </tr>
  </table>
</div>

## Overview

The Twitch Live Notifier is a Chrome extension that monitors Twitch channels and opens them in a new tab when they go live. You can add and remove channels to monitor using the popup window of the extension, and toggle monitoring for individual channels on and off.

## Requirements

To use the Twitch Live Notifier Chrome extension, you will need:

- Google Chrome browser
- Twitch API credentials (client ID and client secret)

## Installation

To install the Twitch Live Notifier Chrome extension, follow these steps:

1. Clone the repository to your local machine by running the following command in your terminal:

   ```
   git clone https://github.com/Wffv9FNa/Twitch-Live-Notifier-Chrome-Extension/
   ```

2. Open Chrome and navigate to the Extensions page (chrome://extensions/)
3. Enable Developer mode in the top right corner
4. Click on "Load unpacked" button and select the folder containing the extension files
5. Click on the extension icon in Chrome toolbar to open the popup
6. Click the settings icon and enter your Twitch API credentials (client ID and client secret)
7. Save the settings

## Usage

To use the Twitch Live Notifier Chrome extension, follow these steps:

1. Click on the extension icon in the Chrome toolbar to open the popup window
2. Enter the name of a Twitch channel you want to monitor in the input field and click the "Add" button
3. The channel will appear in the list of monitored channels, and its status will be checked periodically by the extension
4. When the channel goes live, the extension will open its stream in a new tab
5. You can remove a channel from the list by clicking the "Remove" button next to it, or toggle monitoring for the channel on or off using the switch button

## Configuration

The extension provides several configuration options:

### API Credentials
1. Click the settings icon in the popup
2. Enter your Twitch API credentials (client ID and client secret)
3. Click "Save Settings"

### Check Interval
1. Click the settings icon in the popup
2. Navigate to the "Check Interval" tab
3. Set how often the extension should check if channels are live (in minutes)
4. Click "Save Settings"

### Player Detection
1. Click the settings icon in the popup
2. Navigate to the "Player Detection" tab
3. Enable/disable different Twitch player extensions
4. Add custom player patterns if you use alternative Twitch players
   - Enter a name for the player
   - Add a URL pattern including CHANNEL_NAME as a placeholder
   - Example: `https://example.com/player?channel=CHANNEL_NAME`
5. Click "Add Player" to add your custom player pattern

## Development

To develop the Twitch Live Notifier Chrome extension, follow these steps:

1. Clone the repository to your local machine by running the following command in your terminal:

   ```
   git clone https://github.com/Wffv9FNa/Twitch-Live-Notifier-Chrome-Extension/
   ```

2. Open the Chrome browser and navigate to the Extensions page (chrome://extensions/)
3. Enable Developer mode in the top right corner
4. Click on "Load unpacked" button and select the folder containing the extension files
5. Make changes to the files as needed
6. Reload the extension by clicking the "Reload" button in the Extensions page or by pressing "Ctrl+R"
7. Test the changes in the popup window or the background page of the extension

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
