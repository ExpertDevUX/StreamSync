#!/bin/bash

# ConnectNow Installation Script for Linux
# Copyright © 2026 Hoang Thong Pham
# This script automates the installation of ConnectNow on Linux systems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ConnectNow Installation for Linux                ║"
echo "║        Copyright © 2026 Hoang Thong Pham                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Detect OS
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
  echo -e "${RED}Error: This script is for Linux only${NC}"
  exit 1
fi

# Check if running as root for some operations
SUDO_PREFIX=""
if [[ $EUID -ne 0 ]]; then
  SUDO_PREFIX="sudo"
fi

# Step 1: Update system
echo -e "${BLUE}Step 1: Updating system packages...${NC}"
$SUDO_PREFIX apt-get update -qq
$SUDO_PREFIX apt-get upgrade -y -qq

# Step 2: Install Node.js if not present
echo -e "${BLUE}Step 2: Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Node.js not found. Installing...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO_PREFIX -E bash -
  $SUDO_PREFIX apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Step 3: Install PostgreSQL if not present
echo -e "${BLUE}Step 3: Checking PostgreSQL installation...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
  $SUDO_PREFIX apt-get install -y postgresql postgresql-contrib
fi
echo -e "${GREEN}✓ PostgreSQL installed${NC}"

# Step 4: Clone repository
echo -e "${BLUE}Step 4: Cloning ConnectNow repository...${NC}"
if [ ! -d "connect-now" ]; then
  git clone https://github.com/thongphamit/connect-now.git
fi
cd connect-now

# Step 5: Install dependencies
echo -e "${BLUE}Step 5: Installing Node.js dependencies...${NC}"
npm install --silent

# Step 6: Setup database
echo -e "${BLUE}Step 6: Setting up database...${NC}"
$SUDO_PREFIX -u postgres createdb connectnow 2>/dev/null || true

# Create .env.local
echo -e "${BLUE}Step 7: Creating environment configuration...${NC}"
cat > .env.local << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/connectnow
NEXT_PUBLIC_SIGNALING_SERVER=http://localhost:3001
NEXT_PUBLIC_APP_DOMAIN=thongphamit.site
NEXT_PUBLIC_APP_NAME=ConnectNow
MAX_FILE_SIZE=5242880
EOF

echo -e "${GREEN}✓ Created .env.local${NC}"

# Step 7: Run database migrations
echo -e "${BLUE}Step 8: Running database migrations...${NC}"
$SUDO_PREFIX -u postgres psql -d connectnow -f scripts/001_create_tables.sql 2>/dev/null || true
$SUDO_PREFIX -u postgres psql -d connectnow -f scripts/002_create_signaling_tables.sql 2>/dev/null || true

# Step 8: Create systemd service
echo -e "${BLUE}Step 9: Creating systemd service...${NC}"
$SUDO_PREFIX tee /etc/systemd/system/connectnow.service > /dev/null << EOF
[Unit]
Description=ConnectNow Video Meeting Application
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node node_modules/.bin/next start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

$SUDO_PREFIX systemctl daemon-reload
echo -e "${GREEN}✓ Systemd service created${NC}"

# Step 9: Build application
echo -e "${BLUE}Step 10: Building ConnectNow...${NC}"
npm run build

# Step 10: Summary
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Installation Complete! 🎉                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Start the application:"
echo -e "   ${YELLOW}npm run dev${NC}  (Development)"
echo -e "   ${YELLOW}npm start${NC}    (Production)"
echo ""
echo "2. Or start with systemd:"
echo -e "   ${YELLOW}sudo systemctl start connectnow${NC}"
echo -e "   ${YELLOW}sudo systemctl enable connectnow${NC}"
echo ""
echo "3. Start the signaling server:"
echo -e "   ${YELLOW}chmod +x scripts/setup-signaling-server.sh${NC}"
echo -e "   ${YELLOW}./scripts/setup-signaling-server.sh${NC}"
echo ""
echo "4. Access ConnectNow at:"
echo -e "   ${YELLOW}http://localhost:3000${NC}"
echo ""
echo "For more information, visit: https://thongphamit.site"
