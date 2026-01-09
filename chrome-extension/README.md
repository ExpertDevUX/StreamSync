# ConnectNow Chrome Extension

Official browser extension for ConnectNow video conferencing platform.

## Features

### Quick Meeting Access
- Start instant meetings with friendly room names
- Join existing rooms with room codes
- Schedule meetings with custom settings
- Password-protected room support

### Enhanced Experience
- Recent rooms list for quick rejoining
- Desktop notifications for user joins
- Auto-detect active ConnectNow pages
- One-click room link copying

### Privacy & Security
- Password-protected rooms
- Secure room code generation
- Local storage of preferences
- No data collection or tracking

## Installation

### From Source (Developer Mode)

1. Download or clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder

### From Chrome Web Store

Coming soon! The extension will be available on the Chrome Web Store.

## Usage

### Starting a Meeting

1. Click the extension icon in your browser toolbar
2. Click "Start Instant Meeting" for an immediate meeting
3. Or click "Schedule Meeting" to create a custom room

### Joining a Meeting

1. Click the extension icon
2. Enter the room code or name
3. If password-protected, check the box and enter password
4. Click "Join Room"

### Recent Rooms

The extension automatically saves your last 5 rooms for quick access. Click any recent room to rejoin instantly.

## Configuration

The extension uses your default ConnectNow deployment URL. To use a custom domain:

1. Right-click the extension icon
2. Select "Options" (coming soon)
3. Update the base URL
4. Save changes

## Permissions Explained

- **activeTab**: Detect when you're on a ConnectNow page
- **storage**: Save your preferences and recent rooms
- **tabs**: Open meeting rooms in new tabs
- **notifications**: Alert you when users join your meetings
- **host_permissions**: Communicate with ConnectNow servers

## Privacy

This extension:
- Stores settings locally on your device
- Does not collect or transmit personal data
- Does not track your browsing activity
- Only interacts with ConnectNow domains

## Support

For issues, feature requests, or questions:
- GitHub Issues: [Report an issue](#)
- Email: support@connectnow.app (if applicable)

## Version History

### 3.0.0 (Current)
- Complete UI redesign with modern gradient interface
- Password-protected room support
- Recent rooms list
- Desktop notifications
- Enhanced messaging between extension and webapp
- Background service worker for better performance

### 2.0.0
- Added screen sharing support
- Improved room code generation
- Better error handling

### 1.0.0
- Initial release
- Basic meeting creation and joining

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the ConnectNow extension card
4. Test your changes

## License

This extension is part of the ConnectNow project. See main repository for license details.
