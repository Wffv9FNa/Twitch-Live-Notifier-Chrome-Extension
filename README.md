# Twitch Live Notifier Chrome Extension

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

2. Open the `background.js` file and replace the `clientId` and `clientSecret` values with your own Twitch API credentials. You can obtain these credentials by [creating a new application](https://dev.twitch.tv/console/apps/create) in the Twitch Developer Dashboard.
3. Save the changes to the `background.js` file.
4. Open the Chrome browser and navigate to the Extensions page (chrome://extensions/).
5. Enable Developer mode in the top right corner.
6. Click on "Load unpacked" button and select the folder containing the extension files.

## Usage

To use the Twitch Live Notifier Chrome extension, follow these steps:

1. Click on the extension icon in the Chrome toolbar to open the popup window.
2. Enter the name of a Twitch channel you want to monitor in the input field and click the "Add" button.
3. The channel will appear in the list of monitored channels, and its status will be checked periodically by the extension.
4. When the channel goes live, the extension will open its stream in a new tab.
5. You can remove a channel from the list by clicking the "Remove" button next to it, or toggle monitoring for the channel on or off using the switch button.

## Development

To develop the Twitch Live Notifier Chrome extension, follow these steps:

1. Clone the repository to your local machine by running the following command in your terminal:

   ```
   git clone https://github.com/Wffv9FNa/Twitch-Live-Notifier-Chrome-Extension/
   ```

2. Open the Chrome browser and navigate to the Extensions page (chrome://extensions/).
3. Enable Developer mode in the top right corner.
4. Click on "Load unpacked" button and select the folder containing the extension files.
5. Make changes to the files as needed.
6. Reload the extension by clicking the "Reload" button in the Extensions page or by pressing "Ctrl+R".
7. Test the changes in the popup window or the background page of the extension.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
