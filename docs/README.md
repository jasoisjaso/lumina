# Quick Start Guide

Get Lumina up and running in minutes! This guide will walk you through the complete setup process.

## Table of Contents

- [Installation](#installation)
- [First-Time Setup](#first-time-setup)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
- [Next Steps](#next-steps)

## Installation

### Option 1: Docker Compose (Recommended)

The easiest way to run Lumina is using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/jasoisjaso/lumina.git
cd lumina

# 2. Start the application
docker compose up -d

# 3. Check if services are running
docker compose ps
```

That's it! Lumina is now running at `http://localhost:3000`

### Option 2: Docker Compose with Custom Configuration

```bash
# 1. Clone and enter directory
git clone https://github.com/jasoisjaso/lumina.git
cd lumina

# 2. Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Edit configuration (optional)
nano backend/.env

# 4. Start with your configuration
docker compose up -d
```

### Option 3: Raspberry Pi

Lumina runs perfectly on Raspberry Pi 4 or 5:

```bash
# On your Raspberry Pi (ARM64)
git clone https://github.com/jasoisjaso/lumina.git
cd lumina

# The Docker images are multi-platform and will work automatically
docker compose up -d
```

## First-Time Setup

When you first access Lumina, you'll be greeted by the **Setup Wizard**. This 5-step process will configure your family dashboard:

### Step 1: Welcome

Click "Get Started" to begin the setup process.

### Step 2: Create Your Family

- **Family Name**: Enter your family or household name
- **Timezone**: Select your timezone for accurate event times

### Step 3: Create Admin Account

- **Email**: Your admin email address
- **Password**: Choose a strong password (minimum 8 characters)
- **First Name**: Your first name
- **Last Name**: Your last name

💡 **Tip**: This account will have full administrative access to manage users and settings.

### Step 4: Integrations (Optional)

#### Weather Integration
- Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
- Enter your location (city name or coordinates)
- Choose temperature units (Metric/Imperial)

#### WooCommerce Integration
- Enter your WooCommerce store URL
- Get API keys from your WooCommerce settings
- Orders will sync automatically

💡 **Tip**: You can skip this step and configure integrations later in Settings.

### Step 5: Review & Launch

Review your configuration and click "Complete Setup". You'll be automatically logged in!

## Basic Usage

### Dashboard

The main dashboard shows:
- **Calendar View**: Your unified calendar with events and orders
- **Weather Widget**: Current weather and forecast
- **Orders Sidebar**: Recent WooCommerce orders (if configured)

### Navigation

**Desktop:**
- Top navigation bar with Calendar/Photos tabs
- Settings icon (admin only)
- User menu in top-right corner

**Mobile:**
- Bottom navigation bar
- Swipe between sections
- Touch-friendly 44px minimum targets

### User Profile

Click your avatar → "My Profile" to access:
- **My Account**: Update name, email, change password
- **My Integrations**: Connect personal Google Calendar, iCloud
- **Calendar Sharing**: Control who sees your calendar
- **Preferences**: Customize your experience

## Configuration

### Environment Variables

#### Backend Configuration

Edit `backend/.env`:

```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=sqlite:///app/data/lumina.db

# Security
JWT_SECRET=change-this-to-a-secure-random-string

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

#### Frontend Configuration

Edit `frontend/.env`:

```bash
# API URL
REACT_APP_API_URL=http://localhost:3001/api/v1
```

### Generating Secure JWT Secret

```bash
# Generate a secure random string
openssl rand -base64 32
```

Copy the output and set it as `JWT_SECRET` in your backend `.env` file.

## Next Steps

### Add Family Members

1. Go to Settings → User Management
2. Click "+ Invite Member"
3. Fill in their details
4. Share the invitation link
5. They complete signup and join your family!

### Connect Google Calendar

1. Click your avatar → My Profile
2. Go to "My Integrations" tab
3. Click "Connect Google Calendar"
4. Authorize the app
5. Your events will sync automatically!

### Customize Settings

**For Administrators:**
- Go to Settings icon → Family Settings
- Configure Weather API
- Set up WooCommerce integration
- Enable/disable features
- Manage family members

**For All Users:**
- Profile → Preferences
- Set your timezone
- Configure notifications
- Customize calendar view

### Mobile Setup

1. Open `http://your-server-ip:3000` on your phone
2. Add to Home Screen:
   - **iOS**: Safari → Share → Add to Home Screen
   - **Android**: Chrome → Menu → Add to Home Screen
3. Launch like a native app!

## Common Tasks

### Backup Your Data

```bash
# Stop the application
docker compose down

# Backup the database
cp backend/data/lumina.db backups/lumina-$(date +%Y%m%d).db

# Restart
docker compose up -d
```

### Reset to Factory Settings

```bash
# Stop and remove everything
docker compose down

# Delete the database
rm backend/data/lumina.db

# Restart (will show setup wizard)
docker compose up -d
```

Or use the convenient script:

```bash
./reset-database.sh
```

### Update Lumina

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build
```

### Check Logs

```bash
# Backend logs
docker logs lumina-backend

# Frontend logs
docker logs lumina-frontend

# Follow logs in real-time
docker logs -f lumina-backend
```

## Troubleshooting

### Setup Wizard Not Showing

If you see the login page instead of the setup wizard:
- The database already exists with a family
- Check: `ls backend/data/lumina.db`
- Solution: Run `./reset-database.sh` to start fresh

### Cannot Access from Phone

- Ensure phone is on same network
- Use server's IP address: `http://192.168.1.100:3000`
- Check firewall rules on server
- Verify Docker containers are running: `docker compose ps`

### Permission Denied Errors

```bash
# Fix file permissions
sudo chown -R $USER:$USER backend/data

# Make reset script executable
chmod +x reset-database.sh
```

## Getting Help

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/jasoisjaso/lumina/issues)
- 💬 [Ask Questions](https://github.com/jasoisjaso/lumina/discussions)
- 🚀 [Deployment Guide](DEPLOYMENT.md)

## What's Next?

- Explore [Deployment Options](DEPLOYMENT.md)
- Read [Troubleshooting Guide](TROUBLESHOOTING.md)

---

🎉 Congratulations! You're now ready to use Lumina. Enjoy your family dashboard!
