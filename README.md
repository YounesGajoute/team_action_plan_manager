# Team Action Plan Manager - Raspberry Pi 5 Deployment Guide

A comprehensive technical team management system designed for Raspberry Pi 5, featuring task management, travel coordination, Telegram bot integration, and automated reporting.

## 🚀 Quick Installation

### Prerequisites
- Raspberry Pi 5 with Raspberry Pi OS (64-bit recommended)
- At least 4GB RAM and 32GB SD card
- Internet connection
- Domain name (optional but recommended)

### One-Line Installation
\`\`\`bash
curl -sSL https://raw.githubusercontent.com/your-repo/install.sh | bash
\`\`\`

### Manual Installation
\`\`\`bash
# Download the installation script
wget https://raw.githubusercontent.com/your-repo/install.sh
chmod +x install.sh

# Run the installation
sudo ./install.sh
\`\`\`

## 📋 Post-Installation Configuration

After installation, run the configuration script:

\`\`\`bash
sudo /opt/techmac/scripts/post_install.sh
\`\`\`

This will guide you through:
- Domain name setup
- Telegram bot configuration
- Email settings
- SSL certificate installation

## 🔧 System Management

### Service Management
\`\`\`bash
# Check service status
sudo systemctl status techmac-backend
sudo systemctl status techmac-bot
sudo systemctl status techmac-scheduler

# Start/stop/restart services
sudo systemctl [start|stop|restart] techmac-backend
sudo systemctl [start|stop|restart] techmac-bot
sudo systemctl [start|stop|restart] techmac-scheduler

# View service logs
sudo journalctl -u techmac-backend -f
sudo journalctl -u techmac-bot -f
\`\`\`

### Maintenance Scripts
\`\`\`bash
# Run system maintenance
sudo /opt/techmac/scripts/maintenance.sh

# Troubleshoot issues
sudo /opt/techmac/scripts/troubleshoot.sh

# Manual backup
sudo /opt/techmac/scripts/backup.sh
\`\`\`

## 📁 Directory Structure

\`\`\`
/opt/techmac/
├── backend/           # Python FastAPI backend
│   ├── venv/         # Python virtual environment
│   ├── main.py       # Main application
│   └── scripts/      # Database and utility scripts
├── frontend/         # Next.js frontend
├── config/           # Configuration files
│   └── .env         # Environment variables
├── data/            # Database and application data
├── logs/            # Application logs
├── uploads/         # Temporary file uploads
├── backups/         # Database backups
└── scripts/         # System maintenance scripts
\`\`\`

## ⚙️ Configuration

### Environment Variables (.env)
Key settings in `/opt/techmac/config/.env`:

\`\`\`bash
# Telegram Bot
TELEGRAM_BOT_TOKEN="your-bot-token-here"

# Email Configuration
EMAIL_USERNAME="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Security
SECRET_KEY="your-secret-key"

# Database
DATABASE_URL="sqlite:///./data/techmac.db"
\`\`\`

### Telegram Bot Setup
1. Create a bot with @BotFather on Telegram
2. Get the bot token
3. Update `TELEGRAM_BOT_TOKEN` in .env
4. Set webhook: `https://your-domain.com/api/telegram/webhook`

### Email Setup (Gmail)
1. Enable 2-factor authentication
2. Generate an app password
3. Use app password in EMAIL_PASSWORD

## 🌐 Access Points

- **Web Interface**: `https://your-domain.com`
- **API Documentation**: `https://your-domain.com/docs`
- **Admin Panel**: Login with username: `admin`, password: `admin123`

## 🔒 Security

### Initial Security Steps
1. Change default admin password immediately
2. Update SECRET_KEY in .env file
3. Configure SSL certificate
4. Set up firewall rules

### Firewall Configuration
\`\`\`bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
\`\`\`

## 📊 Monitoring

### System Health
\`\`\`bash
# Check system resources
htop

# Check disk space
df -h

# Check memory usage
free -h

# Check temperature
vcgencmd measure_temp
\`\`\`

### Application Monitoring
\`\`\`bash
# Check application status
sudo /opt/techmac/scripts/maintenance.sh check

# View real-time logs
sudo journalctl -f -u techmac-backend -u techmac-bot
\`\`\`

## 🔄 Backup and Recovery

### Automatic Backups
- Daily database backups at 2:00 AM
- 30-day retention policy
- Stored in `/opt/techmac/backups/`

### Manual Backup
\`\`\`bash
# Create backup
sudo /opt/techmac/scripts/backup.sh

# List backups
ls -la /opt/techmac/backups/
\`\`\`

### Recovery
\`\`\`bash
# Restore from backup
sudo systemctl stop techmac-backend
sudo cp /opt/techmac/backups/techmac_YYYYMMDD_HHMMSS.db /opt/techmac/data/techmac.db
sudo chown techmac:techmac /opt/techmac/data/techmac.db
sudo systemctl start techmac-backend
\`\`\`

## 🚨 Troubleshooting

### Common Issues

#### Services Not Starting
\`\`\`bash
# Check service status
sudo systemctl status techmac-backend

# Check logs
sudo journalctl -u techmac-backend -n 50

# Fix permissions
sudo chown -R techmac:techmac /opt/techmac
\`\`\`

#### Database Issues
\`\`\`bash
# Check database integrity
sqlite3 /opt/techmac/data/techmac.db "PRAGMA integrity_check;"

# Recreate database
sudo -u techmac python3 /opt/techmac/backend/scripts/database_setup.py
\`\`\`

#### Telegram Bot Not Responding
\`\`\`bash
# Check bot service
sudo systemctl status techmac-bot

# Test webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
\`\`\`

### Performance Optimization

#### For 4GB RAM Systems
\`\`\`bash
# Reduce worker processes
# Edit /etc/systemd/system/techmac-backend.service
# Change: --workers 2 to --workers 1
\`\`\`

#### For Heavy Usage
\`\`\`bash
# Increase swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
\`\`\`

## 📈 Updates

### Application Updates
\`\`\`bash
# Stop services
sudo systemctl stop techmac-backend techmac-bot techmac-scheduler

# Backup current installation
sudo cp -r /opt/techmac /opt/techmac.backup

# Update application files
# (Download new version and replace files)

# Update dependencies
sudo -u techmac bash -c "source /opt/techmac/backend/venv/bin/activate && pip install -r requirements.txt"

# Restart services
sudo systemctl start techmac-backend techmac-bot techmac-scheduler
\`\`\`

### System Updates
\`\`\`bash
# Update Raspberry Pi OS
sudo apt update && sudo apt upgrade -y

# Update Python packages
sudo -u techmac bash -c "source /opt/techmac/backend/venv/bin/activate && pip install --upgrade pip"
\`\`\`

## 📞 Support

### Log Files
- Application logs: `/opt/techmac/logs/`
- System logs: `sudo journalctl -u techmac-*`
- Nginx logs: `/var/log/nginx/`

### Diagnostic Information
\`\`\`bash
# Generate diagnostic report
sudo /opt/techmac/scripts/troubleshoot.sh check > diagnostic_report.txt
\`\`\`

### Getting Help
1. Check the troubleshooting guide
2. Review log files for errors
3. Run diagnostic scripts
4. Check system resources

## 🎯 Performance Expectations

### Raspberry Pi 5 (4GB RAM)
- **Concurrent Users**: 10-15
- **Tasks per Day**: 100-200
- **File Uploads**: 50-100 per day
- **Response Time**: < 2 seconds
- **Uptime**: 99%+

### Resource Usage
- **RAM**: 1-2GB under normal load
- **CPU**: 10-30% average
- **Storage**: 2-5GB for application + data
- **Network**: Minimal bandwidth requirements

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
