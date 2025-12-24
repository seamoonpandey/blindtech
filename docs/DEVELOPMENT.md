# Complete Fullstack Deployment Guide

## Fastify API + React UI + PostgreSQL + WebSocket

**Stack:** Fastify (Node.js), React (Vite), PostgreSQL, WebSocket, PM2, Nginx, Cloudflare

**Architecture:**

- **Backend API:** Azure VM with Nginx reverse proxy
- **Frontend UI:** Cloudflare Pages (global CDN)
- **Database:** PostgreSQL on Azure VM
- **Domain Setup:** Cloudflare DNS + SSL

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup (Azure VM)](#server-setup)
3. [Database Setup (PostgreSQL)](#database-setup)
4. [Backend API Deployment](#backend-api-deployment)
5. [Nginx Configuration](#nginx-configuration)
6. [SSL Certificate Setup](#ssl-certificate)
7. [Frontend UI Deployment](#frontend-deployment)
8. [Testing & Verification](#testing)
9. [Maintenance & Updates](#maintenance)
10. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites {#prerequisites}

### What You Need:

- ✅ Azure VM (Ubuntu 20.04 or later)
- ✅ Domain name managed by Cloudflare
- ✅ GitHub account with your repository
- ✅ Cloudflare API token (for UI deployment)
- ✅ SSH access to your VM

### Repository Structure:

```
your-repo/
├── server/          # Backend API code
│   ├── index.js
│   ├── routes/
│   ├── migrations/
│   ├── package.json
│   └── .env
└── ui/              # Frontend React code
    ├── src/
    ├── package.json
    ├── vite.config.js
    └── .env.production
```

---

## 2. Server Setup (Azure VM) {#server-setup}

### Step 1: Connect to Your VM

```bash
ssh your-username@your-vm-ip
```

### Step 2: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Node.js

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 4: Clone Your Repository

```bash
cd ~
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

---

## 3. Database Setup (PostgreSQL) {#database-setup}

### Step 1: Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create Database and Set Password

```bash
# Access PostgreSQL
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE DATABASE your_db_name;
ALTER USER postgres WITH PASSWORD 'your_strong_password';
\q
```

**Security Note:** Generate a strong password:

```bash
openssl rand -base64 32
```

### Step 3: Configure PostgreSQL Authentication

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Ensure these lines are present:

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 4: Create Environment File

```bash
cd ~/your-repo/server
nano .env
```

Add:

```env
DATABASE_URL=postgres://postgres:your_strong_password@localhost:5432/your_db_name
PORT=3000
NODE_ENV=production
```

```bash
# Secure the .env file
chmod 600 .env
```

### Step 5: Run Database Migrations

```bash
cd ~/your-repo/server

# Install dependencies
npm install

# Run migrations
npm run migrate up

# Verify tables were created
psql -U postgres -h localhost -d your_db_name -c "\dt"
```

---

## 4. Backend API Deployment {#backend-api-deployment}

### Step 1: Test Your API

```bash
cd ~/your-repo/server

# Test run
npm start

# Should see: "Server listening at http://127.0.0.1:3000"
# Press Ctrl+C to stop
```

### Step 2: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 3: Start Application with PM2

```bash
cd ~/your-repo/server

# Start your app
pm2 start npm --name "your-api-name" -- start

# Check status
pm2 status

# View logs
pm2 logs your-api-name --lines 20
```

### Step 4: Configure PM2 Auto-Start

```bash
# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd

# Run the command that PM2 outputs (it will look like):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your-username --hp /home/your-username
```

### Useful PM2 Commands:

```bash
pm2 list                      # List all processes
pm2 restart your-api-name     # Restart app
pm2 stop your-api-name        # Stop app
pm2 logs your-api-name        # View logs
pm2 monit                     # Monitor resources
pm2 delete your-api-name      # Delete app from PM2
```

---

## 5. Nginx Configuration {#nginx-configuration}

### Step 1: Install Nginx

```bash
sudo apt install -y nginx

# Check Nginx status
sudo systemctl status nginx
```

### Step 2: Create Nginx Configuration for API

```bash
sudo nano /etc/nginx/sites-available/your-api
```

**Paste this configuration:**

```nginx
upstream fastify_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # Root path for API
    location / {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;

        proxy_pass http://fastify_backend;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://fastify_backend/health;
        access_log off;
    }
}
```

### Step 3: Enable Nginx Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/your-api /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 4: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 5: Configure Azure Network Security Group

In Azure Portal:

1. Go to your VM → **Networking** → **Network Security Group**
2. Add inbound port rules:
   - **Port 22** (SSH) - Should already exist
   - **Port 80** (HTTP) - Priority: 100
   - **Port 443** (HTTPS) - Priority: 110

---

## 6. SSL Certificate Setup {#ssl-certificate}

### Step 1: Add DNS Record in Cloudflare

1. Login to **Cloudflare Dashboard**
2. Select your domain
3. Go to **DNS** → **Records** → **Add record**

**Create A record:**

- **Type:** A
- **Name:** api.yourdomain (e.g., api.blindtech)
- **IPv4 address:** Your Azure VM Public IP
- **Proxy status:** 🟠 Proxied (orange cloud enabled)
- **TTL:** Auto
- Click **Save**

### Step 2: Wait for DNS Propagation

```bash
# Check DNS (wait 2-5 minutes)
nslookup api.yourdomain.com

# Should return Cloudflare IPs
```

### Step 3: Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Step 4: Obtain SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Follow the prompts:
# 1. Enter your email
# 2. Agree to terms of service
# 3. Choose to redirect HTTP to HTTPS (option 2)
```

Certbot will automatically:

- Obtain SSL certificate from Let's Encrypt
- Update Nginx configuration
- Configure auto-renewal

### Step 5: Test Auto-Renewal

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Should show "Congratulations, all simulated renewals succeeded"
```

### Step 6: Configure Cloudflare SSL Settings

In Cloudflare Dashboard:

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)**
3. Go to **Network** tab
4. Enable **WebSockets** toggle

### Step 7: Test Your API

```bash
# Test HTTPS endpoint
curl https://api.yourdomain.com/health

# Should return your health check response
```

---

## 7. Frontend UI Deployment {#frontend-deployment}

### Step 1: Prepare Environment Variables

```bash
cd ~/your-repo/ui

# Create production environment file
nano .env.production
```

Add:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/ws
```

### Step 2: Update CORS Configuration

```bash
cd ~/your-repo/server
nano index.js  # Or wherever CORS is configured
```

**Update CORS to allow your UI domain:**

```javascript
fastify.register(require("@fastify/cors"), {
  origin: [
    "https://yourdomain.com", // Production UI
    "http://localhost:5173", // Local dev
    /\.pages\.dev$/, // Cloudflare Pages previews
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
```

```bash
# Restart your API
pm2 restart your-api-name
```

### Step 3: Commit and Push Changes

```bash
cd ~/your-repo

# Add environment file
git add ui/.env.production

# Commit changes
git commit -m "Add production environment variables"
git push origin main
```

### Step 4: Install Wrangler CLI

```bash
# Install Wrangler globally
npm install -g wrangler

# Verify installation
wrangler --version
```

### Step 5: Get Cloudflare API Token

Ask your Cloudflare account admin to create an API token:

**Steps for token creation:**

1. Cloudflare Dashboard → Profile → **API Tokens**
2. Click **Create Token**
3. Use **Edit Cloudflare Workers** template
4. Or create custom token with permissions:
   - Account → Cloudflare Pages → Edit
   - Zone → DNS → Edit
5. Click **Continue to summary** → **Create Token**
6. Copy the token

### Step 6: Authenticate Wrangler

```bash
# Set API token as environment variable
export CLOUDFLARE_API_TOKEN=your_token_here

# Verify authentication
wrangler whoami
```

### Step 7: Build Your UI

```bash
cd ~/your-repo/ui

# Install dependencies
npm install

# Build for production
npm run build

# Verify dist folder exists
ls -la dist/
```

### Step 8: Deploy to Cloudflare Pages

```bash
# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=your-project-name

# First time deployment will create the project
```

You'll get a URL like: `https://your-project-name.pages.dev`

### Step 9: Add Custom Domain

```bash
# Add custom domain
wrangler pages domain add yourdomain.com --project-name=your-project-name
```

**Or add manually in Cloudflare Dashboard:**

1. Go to **Workers & Pages**
2. Select your project
3. **Custom domains** → **Set up a custom domain**
4. Enter: `yourdomain.com`
5. Cloudflare auto-configures DNS and SSL

### Step 10: Verify Deployment

```bash
# Wait 2-5 minutes for DNS propagation
nslookup yourdomain.com

# Test in browser
# https://yourdomain.com
```

---

## 8. Testing & Verification {#testing}

### Backend API Tests

```bash
# Check PM2 status
pm2 status

# Check API logs
pm2 logs your-api-name --lines 50

# Test API endpoint
curl https://api.yourdomain.com/health

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Frontend UI Tests

Open browser and test:

1. Navigate to `https://yourdomain.com`
2. Open Developer Tools (F12) → Console
3. Check for errors
4. Verify API calls are working
5. Test WebSocket connection

**WebSocket Test in Browser Console:**

```javascript
const ws = new WebSocket("wss://api.yourdomain.com/ws");
ws.onopen = () => console.log("✅ WebSocket Connected!");
ws.onmessage = (msg) => console.log("Message:", msg.data);
ws.onerror = (e) => console.error("❌ Error:", e);
```

### Database Tests

```bash
# Connect to database
psql -U postgres -h localhost -d your_db_name

# List tables
\dt

# Check table data
SELECT * FROM your_table LIMIT 5;

# Exit
\q
```

---

## 9. Maintenance & Updates {#maintenance}

### Updating Backend API

```bash
# Navigate to server directory
cd ~/your-repo/server

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Run new migrations (if any)
npm run migrate up

# Restart API
pm2 restart your-api-name

# Check logs
pm2 logs your-api-name --lines 30
```

### Updating Frontend UI

```bash
# Navigate to UI directory
cd ~/your-repo/ui

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=your-project-name

# Cloudflare Pages automatically purges cache
```

### Database Backups

**Create a backup:**

```bash
# Backup database
sudo -u postgres pg_dump your_db_name > backup_$(date +%Y%m%d).sql

# Backup to specific location
sudo -u postgres pg_dump your_db_name > ~/backups/db_$(date +%Y%m%d).sql
```

**Restore from backup:**

```bash
# Restore database
sudo -u postgres psql your_db_name < backup_file.sql
```

**Automated Daily Backups (Cron Job):**

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * sudo -u postgres pg_dump your_db_name > ~/backups/db_$(date +\%Y\%m\%d).sql
```

### System Updates

```bash
# Update system packages (monthly recommended)
sudo apt update && sudo apt upgrade -y

# Update Node.js packages globally
npm update -g

# Update PM2
npm install -g pm2@latest
pm2 update

# Reboot if kernel updated
sudo reboot
```

### Monitoring

**PM2 Monitoring:**

```bash
# Real-time monitoring
pm2 monit

# Generate startup script after updates
pm2 save
```

**System Resource Monitoring:**

```bash
# Install htop
sudo apt install htop -y

# Monitor resources
htop

# Check disk space
df -h

# Check memory usage
free -h
```

**Log Management:**

```bash
# View PM2 logs
pm2 logs your-api-name

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Clear old logs (if disk space is low)
pm2 flush  # Clear PM2 logs
```

---

## 10. Troubleshooting {#troubleshooting}

### API Not Responding

**Check if API is running:**

```bash
pm2 status
pm2 logs your-api-name
```

**Restart API:**

```bash
pm2 restart your-api-name
```

**Check if port 3000 is in use:**

```bash
sudo netstat -tulpn | grep 3000
```

**Check Nginx configuration:**

```bash
sudo nginx -t
sudo systemctl status nginx
```

### Database Connection Issues

**Check PostgreSQL is running:**

```bash
sudo systemctl status postgresql
```

**Test database connection:**

```bash
psql -U postgres -h localhost -d your_db_name
```

**Check connection string in .env:**

```bash
cd ~/your-repo/server
cat .env
```

**Reset PostgreSQL password if needed:**

```bash
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'new_password';
\q
```

### WebSocket Not Connecting

**Check Nginx WebSocket configuration:**

```bash
sudo cat /etc/nginx/sites-available/your-api | grep -A 5 "Upgrade"
```

Should include:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Check Cloudflare WebSocket setting:**

- Cloudflare Dashboard → Network → WebSockets (should be enabled)

**Test WebSocket from command line:**

```bash
# Install websocat
sudo apt install websocat -y

# Test connection
websocat wss://api.yourdomain.com/ws
```

### CORS Errors

**Check CORS configuration:**

```bash
cd ~/your-repo/server
grep -n "cors" index.js
```

**Update CORS origins:**

```javascript
origin: ["https://yourdomain.com", "http://localhost:5173"];
```

**Restart API after changes:**

```bash
pm2 restart your-api-name
```

### SSL Certificate Issues

**Check certificate status:**

```bash
sudo certbot certificates
```

**Renew certificate manually:**

```bash
sudo certbot renew
```

**Check Nginx SSL configuration:**

```bash
sudo cat /etc/nginx/sites-available/your-api | grep ssl
```

### Cloudflare Pages Deployment Failed

**Check build logs in Cloudflare Dashboard:**

- Workers & Pages → Your Project → Deployments → View build log

**Common issues:**

- Wrong build command
- Wrong output directory
- Missing environment variables
- Node.js version mismatch

**Test build locally:**

```bash
cd ~/your-repo/ui
npm install
npm run build
ls -la dist/
```

### High Memory Usage

**Check memory usage:**

```bash
free -h
htop
```

**Restart services:**

```bash
pm2 restart all
sudo systemctl restart nginx
```

**Clear system cache:**

```bash
sudo sync; echo 3 > /proc/sys/vm/drop_caches
```

### Disk Space Full

**Check disk usage:**

```bash
df -h
du -sh ~/* | sort -h
```

**Clear PM2 logs:**

```bash
pm2 flush
```

**Clear old log files:**

```bash
sudo find /var/log -type f -name "*.log" -mtime +30 -delete
```

**Clear package caches:**

```bash
npm cache clean --force
```

---

## Quick Reference Commands

### PM2 Commands

```bash
pm2 start npm --name "api" -- start    # Start app
pm2 restart api                         # Restart app
pm2 stop api                            # Stop app
pm2 delete api                          # Delete app
pm2 logs api                            # View logs
pm2 monit                               # Monitor resources
pm2 list                                # List all apps
pm2 save                                # Save process list
pm2 startup                             # Generate startup script
```

### Nginx Commands

```bash
sudo nginx -t                           # Test configuration
sudo systemctl restart nginx            # Restart Nginx
sudo systemctl reload nginx             # Reload config
sudo systemctl status nginx             # Check status
sudo tail -f /var/log/nginx/access.log  # View access logs
sudo tail -f /var/log/nginx/error.log   # View error logs
```

### PostgreSQL Commands

```bash
sudo systemctl restart postgresql       # Restart PostgreSQL
sudo -u postgres psql                   # Access PostgreSQL
\l                                      # List databases
\c database_name                        # Connect to database
\dt                                     # List tables
\q                                      # Exit
```

### Git Commands

```bash
git pull origin main                    # Pull latest changes
git status                              # Check status
git add .                               # Stage all changes
git commit -m "message"                 # Commit changes
git push origin main                    # Push to remote
```

### Wrangler Commands

```bash
wrangler pages deploy dist --project-name=project   # Deploy to Pages
wrangler pages deployment list --project-name=project  # List deployments
wrangler pages domain add domain.com --project-name=project  # Add domain
```

---

## Security Checklist

- [ ] Strong PostgreSQL password set
- [ ] `.env` file permissions set to 600
- [ ] PostgreSQL using scram-sha-256 authentication
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Firewall (UFW) enabled and configured
- [ ] Nginx security headers configured
- [ ] Rate limiting enabled in Nginx
- [ ] CORS properly configured
- [ ] Regular system updates scheduled
- [ ] Database backups automated
- [ ] SSH key authentication enabled (disable password auth)
- [ ] Non-root user for deployments

---

## Final Architecture

```
Users (Worldwide)
    ↓
Cloudflare CDN (Edge Network)
    ↓
┌─────────────────────────────────────┐
│  https://yourdomain.com             │
│  (UI - Cloudflare Pages)            │
│  - React App                        │
│  - Static Assets on CDN             │
│  - Auto HTTPS                       │
└─────────────────────────────────────┘
    ↓ API Calls & WebSocket
┌─────────────────────────────────────┐
│  https://api.yourdomain.com         │
│  (API - Azure VM)                   │
│  ┌──────────────────────────────┐   │
│  │ Nginx (Reverse Proxy + SSL)  │   │
│  └──────────────────────────────┘   │
│           ↓                          │
│  ┌──────────────────────────────┐   │
│  │ PM2 (Process Manager)        │   │
│  │  - Auto-restart              │   │
│  │  - Logging                   │   │
│  │  - Monitoring                │   │
│  └──────────────────────────────┘   │
│           ↓                          │
│  ┌──────────────────────────────┐   │
│  │ Fastify API (Node.js)        │   │
│  │  - REST endpoints            │   │
│  │  - WebSocket server          │   │
│  │  - Business logic            │   │
│  └──────────────────────────────┘   │
│           ↓                          │
│  ┌──────────────────────────────┐   │
│  │ PostgreSQL Database          │   │
│  │  - Data persistence          │   │
│  │  - Automated backups         │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Capacity & Performance

**This setup can handle:**

- 500-1,000 concurrent users comfortably
- 1,000-2,000 concurrent users with optimizations
- High WebSocket traffic
- Global CDN delivery for UI

**When to scale:**

- CPU consistently > 80%
- Memory > 90%
- Response times > 2 seconds
- 3,000+ concurrent users

**Scaling options:**

- Upgrade Azure VM size
- Add load balancer with multiple VMs
- Separate database server
- Use managed PostgreSQL service
- Add Redis for caching

---

## Deployment Workflow Summary

### Initial Setup (One Time)

1. Setup Azure VM and SSH access
2. Install Node.js, PostgreSQL, Nginx
3. Configure database
4. Setup PM2 and Nginx
5. Install SSL certificates
6. Configure Cloudflare DNS

### Every Deployment

**Backend Updates:**

```bash
cd ~/your-repo/server
git pull origin main
npm install
npm run migrate up
pm2 restart your-api-name
```

**Frontend Updates:**

```bash
cd ~/your-repo/ui
git pull origin main
npm install
npm run build
wrangler pages deploy dist --project-name=your-project-name
```

---

## Resources & Documentation

- **PM2:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **Nginx:** https://nginx.org/en/docs/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Cloudflare Pages:** https://developers.cloudflare.com/pages/
- **Wrangler:** https://developers.cloudflare.com/workers/wrangler/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Fastify:** https://www.fastify.io/docs/latest/
- **Vite:** https://vitejs.dev/guide/

---

## Support & Help

If you encounter issues not covered in this guide:

1. Check application logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system resources: `htop`
4. Test components individually
5. Review Cloudflare dashboard for errors
6. Check GitHub Issues for your dependencies

---

**Last Updated:** December 2024  
**Guide Version:** 1.0  
**Tested On:** Ubuntu 22.04 LTS, Node.js 20.x, PostgreSQL 14+

---

_This guide covers a production-ready deployment. Always test thoroughly before deploying to production and maintain regular backups of your data._
