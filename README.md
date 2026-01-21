# Lumina Dashboard

> Your family's digital command center - A beautiful, privacy-focused family dashboard for managing calendars, orders, photos, and more.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20arm64%20%7C%20amd64-lightgrey.svg)

## ✨ Features

### Core Features
- 📅 **Unified Calendar** - Sync Google Calendar and iCloud in one place
- 🛒 **WooCommerce Workflow Board** - Advanced order management with drag-and-drop kanban
- 👥 **User Management** - Invite family members with granular permissions
- 🔐 **Permission System** - Role-based access control with custom overrides
- 📱 **Mobile Optimized** - Responsive design with touch-friendly interface
- 🎨 **Beautiful UI** - Modern, professional design with smooth animations

### Advanced Features
- 🔄 **Calendar Sharing** - Control who sees your personal calendar events
- ⚙️ **User Profiles** - Personal settings and integration management
- 🌤️ **Weather Widget** - Real-time weather information
- 📸 **Photo Gallery** - *(In Development)* Shared family photo albums
- 🎯 **Setup Wizard** - Easy first-time configuration via GUI

### 🛒 WooCommerce Workflow Board

Advanced order management system with production-ready features:

#### Visual Workflow Management
- **Drag-and-Drop Kanban** - Move orders between workflow stages with smooth animations
- **Custom Stage Support** - Automatically syncs with WooCommerce Order Status Manager plugin
- **Bi-Directional Sync** - Changes in Lumina update WooCommerce, and vice versa
- **Priority Labels** - Mark orders as High (⚡) or Rush (🔥) for visibility
- **Time Tracking** - See how long orders have been in each stage

#### Product Customization Display
- **At-a-Glance Details** - View product specifications directly on order cards
- **Smart Extraction** - Automatically extracts customization from WooCommerce meta fields
- **Production Instructions** - See board style, font, colors, and name count without clicking
- **Example Display**: "Large Board • Ballerina • Strawberry Milkshake • 2 Names"

#### Advanced Filtering
- **Filter by Customization** - Find orders by board style, font, or color instantly
- **Date Range Filters** - Quick presets (7/30 days) or custom date ranges
- **Active Filter Summary** - See all active filters with one-click removal
- **Fast SQL Queries** - Indexed JSON queries for sub-second filtering on 200+ orders

#### Column Visibility
- **Hide/Show Stages** - Eye icon (👁️) on each column to toggle visibility
- **Focus Mode** - Hide completed/cancelled orders to focus on active work
- **Persistent Settings** - Column visibility saved per-user in database

#### Order Tracking
- **Australia Post Integration** - Add tracking numbers directly in Lumina
- **Automatic Emails** - WooCommerce sends completion email with tracking info
- **Track Links** - One-click links to Australia Post tracking page
- **Order History** - Full audit trail of all stage changes and updates

#### Bulk Operations
- **Multi-Select** - Select multiple orders with checkboxes
- **Bulk Stage Move** - Move multiple orders to new stage at once
- **Bulk Priority** - Set priority for multiple orders simultaneously
- **Bulk Assignment** - Assign multiple orders to team members

## 🚀 Quick Start

Get Lumina running in under 2 minutes:

```bash
# Clone the repository
git clone https://github.com/jasoisjaso/lumina.git
cd lumina

# Start with Docker Compose
docker compose up -d

# Open your browser
open http://localhost:3000
```

The setup wizard will guide you through creating your family and admin account!

## 📋 Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- 2GB RAM minimum (4GB recommended)
- 1GB free disk space

### Supported Platforms
- ✅ Linux (x86_64, ARM64)
- ✅ macOS (Intel, Apple Silicon)
- ✅ Windows (with WSL2)
- ✅ Raspberry Pi 4/5 (ARM64)

## 📖 Documentation

- **[Quick Start Guide](docs/README.md)** - Get up and running
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment options
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🎯 Setup Wizard

Lumina uses a user-friendly 5-step setup wizard for first-time configuration:

1. **Welcome** - Introduction to Lumina
2. **Create Family** - Set up your family name and timezone
3. **Create Admin** - Your administrator account
4. **Integrations** - Optional: Configure Weather API and WooCommerce
5. **Review & Launch** - Confirm and complete setup

No manual database configuration required!

## 🔧 Configuration

### Environment Variables

Backend (`.env`):
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=sqlite:///app/data/lumina.db
REDIS_HOST=redis
JWT_SECRET=your-secret-key-change-this
```

Frontend (`.env`):
```bash
REACT_APP_API_URL=http://localhost:3001/api/v1
```

See [`.env.example`](.env.example) for all available options.

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│    Redis    │
│   (React)   │     │  (Node.js)  │     │   (Cache)   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │   SQLite    │
                    │  (Database) │
                    └─────────────┘
```

- **Frontend**: React 18 + TypeScript + Zustand
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (file-based, no server needed)
- **Cache**: Redis for sessions and API caching

## 🔐 Security

- 🔒 **bcrypt** password hashing (10 rounds)
- 🎫 **JWT** authentication (15min access + 7 day refresh tokens)
- 🛡️ **Permission-based** authorization
- 🔑 **Secure** environment variable configuration
- 🚫 **No tracking** - Your data stays on your server

## 📱 Mobile Support

Lumina is fully optimized for mobile devices:

- Responsive design (320px - 4K displays)
- Touch-friendly interface (44px minimum touch targets)
- Bottom navigation on mobile
- Swipe gestures support
- iOS safe area support

## 🛣️ Roadmap

### ✅ Version 1.0 (Current)
- Setup Wizard
- User Management with Permissions
- Calendar Sync (Google Calendar)
- WooCommerce Workflow Board with Advanced Features
  - Product customization display on order cards
  - Advanced filtering by customization fields
  - Column visibility toggles
  - Australia Post tracking integration
  - Bi-directional sync with WooCommerce
  - Drag-and-drop kanban interface
- Calendar Sharing
- User Profiles
- Weather Widget

### 🚧 In Development
- **Photo Gallery** - Shared family photo albums with face recognition
- **iCloud Calendar** - Full iCloud calendar integration
- **Chores System** - Task management with gamification
- **Notifications** - Push notifications for events and updates

### 🎯 Planned Features
- Google Photos integration
- Shopping lists
- Meal planning
- Family messaging
- Location sharing (opt-in)
- Dark mode

## 🤝 Contributing

We welcome contributions! Lumina is built with the community in mind.

### How to Help

1. **Test & Report Bugs** - Use the app and report issues
2. **Feature Requests** - Suggest new features via GitHub Issues
3. **Code Contributions** - Submit pull requests
4. **Documentation** - Improve our docs

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

### Feedback Wanted

The photo gallery feature is currently in development. If you encounter issues or have suggestions, please open an issue! Your feedback is essential to building this out further.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React, Node.js, and modern web technologies
- Inspired by the need for privacy-focused family organization tools
- Thanks to all contributors and testers

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/jasoisjaso/lumina/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jasoisjaso/lumina/discussions)
- **Documentation**: [docs/](docs/)

## 🌟 Star History

If you find Lumina useful, please consider giving it a star on GitHub!

---

Made with ❤️ for families who value privacy and organization
