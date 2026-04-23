#!/bin/bash

# =============================================
# OpenPanel - Remote Setup Script
# =============================================

set -e

# Load config from .env
ENV_FILE="$(dirname "$0")/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "[ERROR] .env file not found at: $ENV_FILE"
    exit 1
fi

source "$ENV_FILE"

echo "========================================="
echo " OpenPanel Remote Setup"
echo "========================================="

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "[INFO] Installing sshpass..."
    apt-get install -y sshpass 2>/dev/null || yum install -y sshpass 2>/dev/null || {
        echo "[ERROR] Could not install sshpass. Please install it manually."
        exit 1
    }
fi

echo ""
echo "[1/4] Adding user '$USERNAME'..."
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" \
    "opencli user-add $USERNAME $PASSWORD $EMAIL \"$PLAN_NAME\""
echo "[OK] User added successfully."

echo ""
echo "[2/4] Starting MySQL container for user '$USERNAME'..."
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" \
    "cd /home/$USERNAME && docker --context $USERNAME compose up -d mysql"
echo "[OK] MySQL container started."

echo ""
echo "[3/4] Enabling Remote MySQL for user '$USERNAME'..."
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" bash << ENDSSH
ENV_FILE="/home/$USERNAME/.env"

if [ ! -f "\$ENV_FILE" ]; then
    ENV_FILE=\$(find /home/$USERNAME -name ".env" | head -1)
fi

echo "Using env file: \$ENV_FILE"

# Read current MYSQL_PORT value
CURRENT=\$(grep '^MYSQL_PORT=' "\$ENV_FILE" | cut -d'=' -f2)
echo "Current MYSQL_PORT: \$CURRENT"

# Extract port number only (strip 127.0.0.1: prefix if present)
PORT_ONLY=\$(echo "\$CURRENT" | sed 's/127\.0\.0\.1://' | cut -d':' -f1)
echo "Detected port: \$PORT_ONLY"

# Set remote binding (remove 127.0.0.1 restriction)
NEW_VALUE="\${PORT_ONLY}:3306"
sed -i "s|^MYSQL_PORT=.*|MYSQL_PORT=\${NEW_VALUE}|" "\$ENV_FILE"
echo "New MYSQL_PORT: \$NEW_VALUE"

# Restart MySQL container to apply changes
cd /home/$USERNAME && docker --context $USERNAME compose up -d mysql --force-recreate
echo "[OK] Remote MySQL enabled."

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
sleep 5

# Get MySQL root password from env
MYSQL_ROOT_PASS=\$(grep '^MYSQL_ROOT_PASSWORD=' "\$ENV_FILE" | cut -d'=' -f2)

# Create test database, user and grant permissions
echo "Creating test database '$USERNAME' and user '$USERNAME'..."
docker --context $USERNAME exec mysql mysql -uroot -p"\$MYSQL_ROOT_PASS" -e "
    CREATE DATABASE IF NOT EXISTS \\\`$USERNAME\\\`;
    CREATE USER IF NOT EXISTS '$USERNAME'@'%' IDENTIFIED BY '$PASSWORD';
    GRANT ALL PRIVILEGES ON \\\`$USERNAME\\\`.* TO '$USERNAME'@'%';
    FLUSH PRIVILEGES;
"
echo "[OK] Database '$USERNAME', user '$USERNAME' created with full privileges."
ENDSSH

echo ""
echo "[4/4] Testing MySQL connection from local IP..."
LOCAL_IP=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org)
echo "Local IP address: $LOCAL_IP"

# Fetch MySQL port from remote server
MYSQL_PORT=$(sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" \
    "grep '^MYSQL_PORT=' \$(find /home/$USERNAME -name '.env' | head -1) | cut -d'=' -f2 | cut -d':' -f1 | sed 's/\"//g'")

echo "MySQL port: $MYSQL_PORT"

# DB credentials (same as username/password)
DB_NAME="$USERNAME"
DB_USER="$USERNAME"
DB_PASS="$PASSWORD"

# Test connection
if command -v mysql &> /dev/null; then
    echo "Testing MySQL connection to $REMOTE_HOST:$MYSQL_PORT..."
    echo "  User:     $DB_USER"
    echo "  Database: $DB_NAME"
    mysql -h "$REMOTE_HOST" -P "$MYSQL_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
        --connect-timeout=10 -e "SELECT 'Remote MySQL OK' AS status; SHOW TABLES;" 2>/dev/null && \
        echo "[OK] Remote MySQL connection successful!" || \
        echo "[WARN] MySQL connection failed. Check firewall rules or MySQL user permissions."
else
    echo "[INFO] mysql client not found locally, skipping connection test."
    echo "[INFO] You can test manually with:"
    echo "       mysql -h $REMOTE_HOST -P $MYSQL_PORT -u $DB_USER -p$DB_PASS $DB_NAME"
fi

echo ""
echo "========================================="
echo " Setup complete!"
echo "========================================="
echo " User:       $USERNAME"
echo " Email:      $EMAIL"
echo " Plan:       $PLAN_NAME"
echo " Server:     $REMOTE_HOST"
echo " MySQL Port: $MYSQL_PORT"
echo "========================================="
