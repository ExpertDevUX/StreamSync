# StreamSync Chrome Extension

Browser extension for enhanced StreamSync video conferencing experience.

## Features

- Quick access to start new meetings
- Join existing meetings with room codes
- Enhanced keyboard shortcuts
- Automatic detection of StreamSync pages
- Quick copy room links

## Installation

### For Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### For Production

1. Download the extension from Chrome Web Store (coming soon)
2. Or install manually using the steps above

## Usage

Click the extension icon to:
- Start a new meeting instantly
- Join an existing room by entering the room code
- See active StreamSync pages

## Configuration

The extension automatically detects your StreamSync deployment URL. Default URL is set to the Vercel deployment.

To use with a custom domain:
1. Open `popup.js`
2. Update the `baseUrl` variable
3. Reload the extension

## Permissions

- `activeTab`: To detect StreamSync pages
- `storage`: To save user preferences
- `tabs`: To open new meeting tabs

## Support

For issues or feature requests, please visit the main repository.
