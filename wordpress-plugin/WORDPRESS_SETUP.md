# ConnectNow WordPress Plugin Setup Guide

## Installation

### Via WordPress Admin Panel
1. Go to **Plugins > Add New**
2. Search for "ConnectNow"
3. Click **Install Now** and then **Activate**

### Manual Installation
1. Download the plugin from [thongphamit.site](https://thongphamit.site)
2. Extract to `/wp-content/plugins/connect-now/`
3. Go to **Plugins** and activate ConnectNow

### Via Composer (for developers)
```bash
composer require connectnow/wordpress-plugin
```

## Usage

### Add Meeting Room to Page
Use the shortcode on any page or post:
```
[connect_now room_id="your-room-id"]
```

### Add Lobby/Home Page
```
[connect_now_lobby]
```

## Configuration

### Database Setup
Tables are automatically created on plugin activation:
- `wp_connect_now_rooms` - Room information
- `wp_connect_now_messages` - Chat messages
- `wp_connect_now_call_history` - Call records
- `wp_connect_now_signaling` - WebRTC signaling

### Settings
Admin can configure:
- Default call type (voice/video/team/group)
- Max participants per room
- Auto-delete rooms after X days
- End-call behavior (keep users or kick all)

## Requirements

- WordPress 5.9+
- PHP 7.4+
- MySQL 5.7+
- Modern browser with WebRTC support

## Support

For issues and feature requests, visit [thongphamit.site](https://thongphamit.site)

## License

GPL v2 or later - Copyright © 2026 Hoang Thong Pham
