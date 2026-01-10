# ConnectNow - Video Meeting & Chat Application

**Copyright © 2026 Hoang Thong Pham. All rights reserved.**

A modern, real-time video conferencing application with chat, screen sharing, and voice calls. Features include password-protected rooms, live translation, call history, and support for both cloud and self-hosted deployments.

## Features

- 🎥 **High-Quality Video & Audio** - Crystal clear HD video and audio with echo cancellation
- 💬 **Live Chat** - Real-time messaging with emoji support and file sharing (images, PDFs, docs)
- 🖥️ **Screen Sharing** - Share your screen with all participants
- 🔒 **Password Protection** - Secure your rooms with password protection
- 🌐 **Auto Translation** - Live message translation to 10+ languages
- 📞 **Call Types** - Voice calls, video calls, team calls, and group calls
- 📱 **Mobile Optimized** - Beautiful responsive design for all devices
- 🔊 **Live Captions** - Real-time speech-to-text with auto-translation
- 📊 **Call History** - Track all your meetings and conversations
- 🌍 **Participant Locations** - See where participants are joining from

## Quick Start

### Cloud Deployment (Vercel)

The application is deployed on Vercel and available at: https://v0-connect-now-8m.vercel.app

### Self-Hosted Installation

#### Linux Installation

```bash
# Clone and install
git clone https://github.com/thongphamit/connect-now.git
cd connect-now
chmod +x install-linux.sh
./install-linux.sh
```

#### Windows Installation

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\install-windows.ps1
```

## Architecture

### Cloud Setup (Vercel + Neon Database)

- **Frontend**: Next.js running on Vercel
- **Database**: Neon PostgreSQL for storing rooms, messages, and call history
- **Signaling**: REST API endpoints for WebRTC signaling

### Self-Hosted Setup

- **Frontend**: Next.js application
- **Signaling Server**: Node.js WebSocket server for real-time signaling
- **Database**: PostgreSQL for persistence
- **Storage**: Local file storage for recordings and uploads

## Configuration

### Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/connectnow

# API Keys (if using external APIs)
NEXT_PUBLIC_SIGNALING_SERVER=http://localhost:3001

# File Upload Limits
MAX_FILE_SIZE=5242880 # 5MB in bytes

# Domain Configuration
NEXT_PUBLIC_APP_DOMAIN=thongphamit.site
NEXT_PUBLIC_APP_NAME=ConnectNow
```

## Server Setup

### Starting the Signaling Server

```bash
# Install dependencies
npm install

# Run signaling server
npm run server:start

# Or use the setup script
./scripts/setup-signaling-server.sh
```

The signaling server will run on port 3001 by default.

## Chrome Extension

The Chrome extension provides quick access to ConnectNow meetings:

1. **Installation**: Load the `chrome-extension` folder as unpacked extension
2. **Configuration**: Click extension icon → Settings to configure custom domain
3. **Features**: Quick meeting creation, room joining, recent rooms history

### Extension Settings

- Custom server domain (e.g., `https://thongphamit.site`)
- Auto-save recent rooms (last 5)
- Password manager integration
- Desktop notifications

## Database Schema

### Key Tables

- `rooms` - Meeting rooms with metadata
- `participants` - Users in each room with location/connection info
- `chat_messages` - Chat history with timestamps
- `call_history` - Call records with duration and participants
- `signaling_messages` - WebRTC peer-to-peer signaling

### Initial Setup

```bash
# Run migrations
npm run migrate

# Or manually:
psql -h localhost -U postgres -d connectnow -f scripts/001_create_tables.sql
psql -h localhost -U postgres -d connectnow -f scripts/002_create_signaling_tables.sql
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### No Audio/Video

1. Check microphone/camera permissions in browser
2. Verify firewall allows WebRTC connections
3. Check browser console for errors

### Connection Issues

1. Verify database connection string
2. Check signaling server is running
3. Review firewall rules for port 3001

### Chat Not Working

1. Ensure database migrations are complete
2. Check file upload permissions
3. Verify virus scan API credentials

## Performance Optimization

- **Video Grid**: Automatically adjusts columns based on participant count
- **Hardware Acceleration**: Enabled for mobile and desktop
- **Lazy Loading**: Components load on-demand
- **Connection Pooling**: Database connection pooling for efficiency

## Security

- **RLS (Row Level Security)**: Database-level access control
- **Password Hashing**: bcrypt for secure password storage
- **HTTPS Only**: All communications encrypted
- **XSS Protection**: Content sanitization
- **CORS**: Restricted to trusted domains

## Support

For issues and feature requests, please visit:
- GitHub: https://github.com/thongphamit/connect-now
- Email: support@thongphamit.site
- Website: https://thongphamit.site

## License

Copyright © 2026 Hoang Thong Pham. All rights reserved.

This project is proprietary software. Unauthorized copying, distribution, or modification is prohibited.

## Changelog

### Version 3.0 (Current)
- Chrome extension support
- Self-hosted signaling server
- Improved WebRTC connections
- Mobile optimizations
- Custom domain support
