# 🚢 BLINDTECH: AZURE VM MONOLITH DEPLOYMENT

This guide outlines how to maximize your Azure VM by hosting the **Backend API**, **Frontend UI**, and **PostgreSQL Database** on a single machine. This is the most cost-effective and highest-performance setup for your current resources.

---

## 🏗️ MONOLITHIC ARCHITECTURE

In this setup, your Azure VM acts as a "Single Source of Truth":

- **Nginx**: Serves the UI and acts as a Reverse Proxy for the API/WebSockets.
- **PM2**: Manages the persistent Backend process.
- **Postgres**: Runs locally for ultra-low latency database queries.

---

## 🔧 SETUP STEPS

### 1. Database: Local PostgreSQL

Install and configure PostgreSQL directly on the VM.

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
# Create the database
sudo -u postgres psql -c "CREATE DATABASE blindtech;"
# Update your server/.env
DATABASE_URL=postgres://postgres@localhost:5432/blindtech
```

### 2. Backend: PM2 Management

Run the backend as a persistent service on the VM.

```bash
cd server
npm install --production
npm install -g pm2
pm2 start index.js --name "bt-server"
pm2 save
pm2 startup
```

### 3. Frontend: Static Build

Build the UI once and host it via Nginx.

```bash
cd ui
npm install
npm run build
# The 'dist' folder now contains your production UI
```

### 4. Nginx: The Unified Router

Install Nginx and configure it to handle all traffic. Redirect all paths to the UI, except for specific API/WS routes.

```bash
sudo apt install nginx
```

Edit your Nginx config (`/etc/nginx/sites-available/default`):

```nginx
server {
    listen 80;
    server_name your_vm_ip_or_domain;

    # 1. Host the UI
    root /var/www/blindtech/ui/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # 2. Proxy API and WebSockets
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Specific WebSocket handle if needed
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🏎️ AZURE OPTIMIZATION TIPS

1.  **Direct Communication**: Use `localhost` for DB connections in your `.env`. This bypasses the network stack and reduces latency to zero.
2.  **Swap Space**: If your VM is low on RAM (e.g., 1GB), create a **2GB swap file** to prevent the DB or Server from crashing during high-load moments.
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    ```
3.  **Firewall (Azure NSG)**: Ensure only ports **80 (HTTP)** and **443 (HTTPS)** are open to the public. Database port (5432) should remain closed and accessible only to the VM itself.

---

_“The monolith is efficient. The monolith is stable.”_
