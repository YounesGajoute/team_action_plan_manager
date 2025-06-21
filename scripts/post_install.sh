#!/bin/bash
# Post-installation configuration script

set -e

echo "🔧 Post-Installation Configuration"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to prompt for input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        if [ -z "$input" ]; then
            input="$default"
        fi
    else
        read -p "$prompt: " input
    fi
    
    eval "$var_name='$input'"
}

# Function to prompt for password
prompt_password() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " input
    echo
    eval "$var_name='$input'"
}

echo "This script will help you configure the Team Action Plan Manager."
echo "Please have the following information ready:"
echo "- Domain name"
echo "- Telegram Bot Token"
echo "- Email credentials"
echo "- Microsoft Graph API credentials (optional)"
echo ""

# Domain configuration
prompt_input "Enter your domain name (e.g., techmac.example.com)" DOMAIN_NAME

# Telegram Bot configuration
echo ""
print_status "Telegram Bot Configuration"
echo "1. Go to @BotFather on Telegram"
echo "2. Create a new bot with /newbot"
echo "3. Copy the bot token"
echo ""
prompt_input "Enter your Telegram Bot Token" BOT_TOKEN

# Email configuration
echo ""
print_status "Email Configuration"
prompt_input "SMTP Server" SMTP_SERVER "smtp.gmail.com"
prompt_input "SMTP Port" SMTP_PORT "587"
prompt_input "Email Username" EMAIL_USERNAME
prompt_password "Email Password (App Password for Gmail)" EMAIL_PASSWORD
prompt_input "Report Recipient Email" EMAIL_RECIPIENT "service.technique@techmac.ma"

# Generate secret key
SECRET_KEY=$(openssl rand -hex 32)

# Update .env file
print_status "Updating configuration file..."
ENV_FILE="/opt/techmac/config/.env"

# Backup original
sudo cp $ENV_FILE ${ENV_FILE}.backup

# Update configuration
sudo tee $ENV_FILE > /dev/null << EOF
# Application Settings
APP_NAME="Team Action Plan Manager"
APP_VERSION="1.0.0"
DEBUG=false
SECRET_KEY="$SECRET_KEY"
DATABASE_URL="sqlite:///./data/techmac.db"

# Server Configuration
HOST="0.0.0.0"
PORT=8000
WORKERS=2

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
TELEGRAM_WEBHOOK_URL="https://$DOMAIN_NAME/api/telegram/webhook"
TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 16)"

# Email Configuration
SMTP_SERVER="$SMTP_SERVER"
SMTP_PORT=$SMTP_PORT
EMAIL_USERNAME="$EMAIL_USERNAME"
EMAIL_PASSWORD="$EMAIL_PASSWORD"
EMAIL_RECIPIENT="$EMAIL_RECIPIENT"

# Location Configuration
HOME_BASE_CITY="Tanger"
SUPPORTED_CITIES="Tanger,Kenitra,Oujda,Casablanca,Meknes,Skhirat,Ain_Ouda"

# File Upload Configuration
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES="jpg,jpeg,png,heic,mp4,mov,avi,pdf,doc,docx"
TEMP_UPLOAD_DIR="/opt/techmac/uploads"

# Activity Reminder Configuration
ACTIVITY_REMINDER_TIMES="09:00,15:00"
ACTIVITY_REMINDER_DAYS="monday,tuesday,wednesday,thursday,friday"

# Report Configuration
WEEKLY_REPORT_DAYS="monday,friday"
WEEKLY_REPORT_TIME="08:00"

# Security Configuration
SESSION_TIMEOUT_HOURS=24
PASSWORD_MIN_LENGTH=8
FAILED_LOGIN_LIMIT=3
FAILED_LOGIN_WINDOW_MINUTES=10

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
EOF

# Update Nginx configuration with domain
print_status "Updating Nginx configuration..."
sudo sed -i "s/server_name _;/server_name $DOMAIN_NAME;/g" /etc/nginx/sites-available/techmac

# Test Nginx configuration
sudo nginx -t

# Set up SSL certificate
echo ""
print_status "Setting up SSL certificate..."
echo "Do you want to set up SSL certificate with Let's Encrypt? (y/n)"
read -r setup_ssl

if [[ $setup_ssl =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $EMAIL_USERNAME
    print_status "SSL certificate configured successfully"
else
    print_warning "SSL certificate not configured. You can set it up later with:"
    echo "sudo certbot --nginx -d $DOMAIN_NAME"
fi

# Restart services
print_status "Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart techmac-backend
sudo systemctl restart techmac-bot
sudo systemctl restart techmac-scheduler

# Set up Telegram webhook
print_status "Setting up Telegram webhook..."
WEBHOOK_URL="https://$DOMAIN_NAME/api/telegram/webhook"
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\":\"$WEBHOOK_URL\"}"

echo ""
print_status "Configuration completed successfully!"
echo ""
echo "🌐 Your application is now available at: https://$DOMAIN_NAME"
echo "🤖 Telegram bot webhook configured"
echo "📧 Email reports configured"
echo ""
echo "Default login credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
print_warning "Please change the default admin password immediately!"
