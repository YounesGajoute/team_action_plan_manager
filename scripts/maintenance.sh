#!/bin/bash
# System maintenance script

set -e

echo "🔧 System Maintenance Script"
echo "============================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[SYSTEM]${NC} $1"
}

# Function to check service status
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✓${NC} $service is running"
    else
        echo -e "${RED}✗${NC} $service is not running"
        return 1
    fi
}

# Function to show system resources
show_system_info() {
    print_info "System Information:"
    echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
    echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"
    echo "Temperature: $(vcgencmd measure_temp 2>/dev/null | cut -d'=' -f2 || echo 'N/A')"
    echo "Uptime: $(uptime -p)"
}

# Function to check database
check_database() {
    print_status "Checking database..."
    DB_FILE="/opt/techmac/data/techmac.db"
    
    if [ -f "$DB_FILE" ]; then
        # Check database integrity
        if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
            echo -e "${GREEN}✓${NC} Database integrity OK"
        else
            echo -e "${RED}✗${NC} Database integrity check failed"
            return 1
        fi
        
        # Show database size
        DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
        echo "Database size: $DB_SIZE"
        
        # Show record counts
        TASK_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM tasks;")
        USER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM users;")
        FILE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM files;")
        
        echo "Tasks: $TASK_COUNT"
        echo "Users: $USER_COUNT"
        echo "Files: $FILE_COUNT"
    else
        echo -e "${RED}✗${NC} Database file not found"
        return 1
    fi
}

# Function to clean up logs
cleanup_logs() {
    print_status "Cleaning up logs..."
    
    # Clean systemd journal logs older than 30 days
    sudo journalctl --vacuum-time=30d
    
    # Clean application logs
    find /opt/techmac/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Clean temporary files
    find /opt/techmac/uploads -name "*" -mtime +7 -delete 2>/dev/null || true
    
    echo "Log cleanup completed"
}

# Function to update system
update_system() {
    print_status "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    sudo apt autoremove -y
    sudo apt autoclean
    echo "System update completed"
}

# Function to backup database
backup_database() {
    print_status "Creating database backup..."
    BACKUP_DIR="/opt/techmac/backups"
    DATE=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    sqlite3 /opt/techmac/data/techmac.db ".backup $BACKUP_DIR/maintenance_backup_$DATE.db"
    
    # Compress backup
    gzip "$BACKUP_DIR/maintenance_backup_$DATE.db"
    
    echo "Database backup created: maintenance_backup_$DATE.db.gz"
}

# Function to check SSL certificate
check_ssl() {
    print_status "Checking SSL certificate..."
    
    DOMAIN=$(grep "server_name" /etc/nginx/sites-available/techmac | grep -v "_" | awk '{print $2}' | sed 's/;//')
    
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "_" ]; then
        CERT_FILE="/etc/letsencrypt/live/$DOMAIN/cert.pem"
        
        if [ -f "$CERT_FILE" ]; then
            EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
            EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
            CURRENT_TIMESTAMP=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
            
            if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
                echo -e "${GREEN}✓${NC} SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
            elif [ $DAYS_UNTIL_EXPIRY -gt 0 ]; then
                echo -e "${YELLOW}⚠${NC} SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
            else
                echo -e "${RED}✗${NC} SSL certificate has expired"
            fi
        else
            echo -e "${YELLOW}⚠${NC} SSL certificate not found"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Domain not configured"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "Select maintenance option:"
    echo "1) Full system check"
    echo "2) Check services only"
    echo "3) Update system"
    echo "4) Backup database"
    echo "5) Clean up logs"
    echo "6) Restart services"
    echo "7) Show system info"
    echo "8) Check SSL certificate"
    echo "9) Exit"
    echo ""
}

# Main execution
if [ $# -eq 0 ]; then
    # Interactive mode
    while true; do
        show_menu
        read -p "Enter your choice (1-9): " choice
        
        case $choice in
            1)
                print_status "Running full system check..."
                show_system_info
                echo ""
                check_service nginx
                check_service techmac-backend
                check_service techmac-bot
                check_service techmac-scheduler
                check_service redis-server
                echo ""
                check_database
                echo ""
                check_ssl
                ;;
            2)
                print_status "Checking services..."
                check_service nginx
                check_service techmac-backend
                check_service techmac-bot
                check_service techmac-scheduler
                check_service redis-server
                ;;
            3)
                update_system
                ;;
            4)
                backup_database
                ;;
            5)
                cleanup_logs
                ;;
            6)
                print_status "Restarting services..."
                sudo systemctl restart nginx
                sudo systemctl restart techmac-backend
                sudo systemctl restart techmac-bot
                sudo systemctl restart techmac-scheduler
                echo "Services restarted"
                ;;
            7)
                show_system_info
                ;;
            8)
                check_ssl
                ;;
            9)
                echo "Goodbye!"
                exit 0
                ;;
            *)
                echo "Invalid option. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
else
    # Command line mode
    case $1 in
        "check")
            show_system_info
            echo ""
            check_service nginx
            check_service techmac-backend
            check_service techmac-bot
            check_service techmac-scheduler
            check_database
            ;;
        "update")
            update_system
            ;;
        "backup")
            backup_database
            ;;
        "cleanup")
            cleanup_logs
            ;;
        "restart")
            sudo systemctl restart nginx techmac-backend techmac-bot techmac-scheduler
            ;;
        *)
            echo "Usage: $0 [check|update|backup|cleanup|restart]"
            exit 1
            ;;
    esac
fi
