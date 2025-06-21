#!/bin/bash
# Troubleshooting script for common issues

set -e

echo "🔍 Team Action Plan Manager Troubleshooting"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Function to check port availability
check_port() {
    local port=$1
    local service=$2
    
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port is in use ($service)"
    else
        echo -e "${RED}✗${NC} Port $port is not in use ($service not running?)"
    fi
}

# Function to check service logs
check_service_logs() {
    local service=$1
    local lines=${2:-20}
    
    print_info "Last $lines lines from $service:"
    sudo journalctl -u $service -n $lines --no-pager
    echo ""
}

# Function to test database connection
test_database() {
    print_status "Testing database connection..."
    
    DB_FILE="/opt/techmac/data/techmac.db"
    
    if [ ! -f "$DB_FILE" ]; then
        print_error "Database file not found: $DB_FILE"
        return 1
    fi
    
    # Test basic query
    if sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
        USER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM users;")
        echo -e "${GREEN}✓${NC} Database connection OK ($USER_COUNT users)"
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Function to test API endpoints
test_api() {
    print_status "Testing API endpoints..."
    
    # Test health endpoint
    if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} API health endpoint responding"
    else
        echo -e "${RED}✗${NC} API health endpoint not responding"
    fi
    
    # Test main API
    if curl -s -f http://localhost:8000/api/status > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Main API responding"
    else
        echo -e "${RED}✗${NC} Main API not responding"
    fi
}

# Function to check file permissions
check_permissions() {
    print_status "Checking file permissions..."
    
    # Check main directory
    if [ -d "/opt/techmac" ]; then
        OWNER=$(stat -c '%U:%G' /opt/techmac)
        if [ "$OWNER" = "techmac:techmac" ]; then
            echo -e "${GREEN}✓${NC} Main directory ownership correct"
        else
            print_warning "Main directory ownership: $OWNER (should be techmac:techmac)"
        fi
    else
        print_error "Main directory /opt/techmac not found"
    fi
    
    # Check data directory
    if [ -d "/opt/techmac/data" ]; then
        if [ -w "/opt/techmac/data" ]; then
            echo -e "${GREEN}✓${NC} Data directory writable"
        else
            print_error "Data directory not writable"
        fi
    fi
    
    # Check uploads directory
    if [ -d "/opt/techmac/uploads" ]; then
        if [ -w "/opt/techmac/uploads" ]; then
            echo -e "${GREEN}✓${NC} Uploads directory writable"
        else
            print_error "Uploads directory not writable"
        fi
    fi
}

# Function to check configuration
check_config() {
    print_status "Checking configuration..."
    
    ENV_FILE="/opt/techmac/config/.env"
    
    if [ -f "$ENV_FILE" ]; then
        echo -e "${GREEN}✓${NC} Configuration file exists"
        
        # Check critical settings
        if grep -q "SECRET_KEY=" "$ENV_FILE" && ! grep -q "SECRET_KEY=\"change-this" "$ENV_FILE"; then
            echo -e "${GREEN}✓${NC} Secret key configured"
        else
            print_warning "Secret key not properly configured"
        fi
        
        if grep -q "TELEGRAM_BOT_TOKEN=" "$ENV_FILE" && ! grep -q "your-bot-token-here" "$ENV_FILE"; then
            echo -e "${GREEN}✓${NC} Telegram bot token configured"
        else
            print_warning "Telegram bot token not configured"
        fi
        
        if grep -q "EMAIL_USERNAME=" "$ENV_FILE" && ! grep -q "your-email@gmail.com" "$ENV_FILE"; then
            echo -e "${GREEN}✓${NC} Email configuration found"
        else
            print_warning "Email not properly configured"
        fi
    else
        print_error "Configuration file not found: $ENV_FILE"
    fi
}

# Function to check disk space
check_disk_space() {
    print_status "Checking disk space..."
    
    # Check root partition
    ROOT_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$ROOT_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✓${NC} Root partition usage: ${ROOT_USAGE}%"
    elif [ "$ROOT_USAGE" -lt 90 ]; then
        print_warning "Root partition usage: ${ROOT_USAGE}%"
    else
        print_error "Root partition usage: ${ROOT_USAGE}% (critically high)"
    fi
    
    # Check application directory
    if [ -d "/opt/techmac" ]; then
        APP_SIZE=$(du -sh /opt/techmac | cut -f1)
        echo "Application directory size: $APP_SIZE"
    fi
}

# Function to check memory usage
check_memory() {
    print_status "Checking memory usage..."
    
    # Get memory info
    MEM_TOTAL=$(free -m | awk 'NR==2{print $2}')
    MEM_USED=$(free -m | awk 'NR==2{print $3}')
    MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
    
    if [ "$MEM_PERCENT" -lt 80 ]; then
        echo -e "${GREEN}✓${NC} Memory usage: ${MEM_PERCENT}% (${MEM_USED}MB/${MEM_TOTAL}MB)"
    elif [ "$MEM_PERCENT" -lt 90 ]; then
        print_warning "Memory usage: ${MEM_PERCENT}% (${MEM_USED}MB/${MEM_TOTAL}MB)"
    else
        print_error "Memory usage: ${MEM_PERCENT}% (${MEM_USED}MB/${MEM_TOTAL}MB) - critically high"
    fi
    
    # Show top memory consumers
    print_info "Top memory consumers:"
    ps aux --sort=-%mem | head -6
}

# Function to fix common issues
fix_permissions() {
    print_status "Fixing file permissions..."
    sudo chown -R techmac:techmac /opt/techmac
    sudo chmod -R 755 /opt/techmac
    sudo chmod -R 644 /opt/techmac/config/.env
    echo "Permissions fixed"
}

restart_services() {
    print_status "Restarting all services..."
    sudo systemctl restart nginx
    sudo systemctl restart techmac-backend
    sudo systemctl restart techmac-bot
    sudo systemctl restart techmac-scheduler
    echo "Services restarted"
}

# Main troubleshooting menu
show_troubleshoot_menu() {
    echo ""
    echo "Troubleshooting Options:"
    echo "1) Full diagnostic check"
    echo "2) Check services status"
    echo "3) Check service logs"
    echo "4) Test database connection"
    echo "5) Test API endpoints"
    echo "6) Check file permissions"
    echo "7) Check configuration"
    echo "8) Check system resources"
    echo "9) Fix common issues"
    echo "10) Restart all services"
    echo "11) Exit"
    echo ""
}

# Main execution
if [ $# -eq 0 ]; then
    # Interactive mode
    while true; do
        show_troubleshoot_menu
        read -p "Enter your choice (1-11): " choice
        
        case $choice in
            1)
                print_status "Running full diagnostic check..."
                echo ""
                
                # Check services
                systemctl is-active --quiet nginx && echo -e "${GREEN}✓${NC} nginx" || echo -e "${RED}✗${NC} nginx"
                systemctl is-active --quiet techmac-backend && echo -e "${GREEN}✓${NC} techmac-backend" || echo -e "${RED}✗${NC} techmac-backend"
                systemctl is-active --quiet techmac-bot && echo -e "${GREEN}✓${NC} techmac-bot" || echo -e "${RED}✗${NC} techmac-bot"
                systemctl is-active --quiet techmac-scheduler && echo -e "${GREEN}✓${NC} techmac-scheduler" || echo -e "${RED}✗${NC} techmac-scheduler"
                
                echo ""
                check_port 80 "nginx"
                check_port 443 "nginx (SSL)"
                check_port 8000 "backend API"
                
                echo ""
                test_database
                test_api
                check_permissions
                check_config
                check_disk_space
                check_memory
                ;;
            2)
                systemctl status nginx techmac-backend techmac-bot techmac-scheduler --no-pager
                ;;
            3)
                echo "Which service logs to check?"
                echo "1) nginx"
                echo "2) techmac-backend"
                echo "3) techmac-bot"
                echo "4) techmac-scheduler"
                read -p "Enter choice (1-4): " log_choice
                
                case $log_choice in
                    1) check_service_logs nginx ;;
                    2) check_service_logs techmac-backend ;;
                    3) check_service_logs techmac-bot ;;
                    4) check_service_logs techmac-scheduler ;;
                    *) echo "Invalid choice" ;;
                esac
                ;;
            4)
                test_database
                ;;
            5)
                test_api
                ;;
            6)
                check_permissions
                ;;
            7)
                check_config
                ;;
            8)
                check_disk_space
                check_memory
                ;;
            9)
                echo "Available fixes:"
                echo "1) Fix file permissions"
                echo "2) Restart all services"
                read -p "Enter choice (1-2): " fix_choice
                
                case $fix_choice in
                    1) fix_permissions ;;
                    2) restart_services ;;
                    *) echo "Invalid choice" ;;
                esac
                ;;
            10)
                restart_services
                ;;
            11)
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
            print_status "Running diagnostic check..."
            systemctl is-active --quiet nginx techmac-backend techmac-bot techmac-scheduler
            test_database
            test_api
            ;;
        "logs")
            SERVICE=${2:-techmac-backend}
            check_service_logs $SERVICE
            ;;
        "fix")
            fix_permissions
            restart_services
            ;;
        *)
            echo "Usage: $0 [check|logs [service]|fix]"
            exit 1
            ;;
    esac
fi
