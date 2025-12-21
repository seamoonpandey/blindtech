# 🚢 BLINDTECH: DEPLOYMENT STRATEGY

For a high-stakes real-time game like Blindtech, stability and low-latency WebSocket connections are paramount. Below is the recommended production architecture.

---

## 🏗️ RECOMMENDED STACK

| Component          | Target Environment   | Recommendation                     |
| :----------------- | :------------------- | :--------------------------------- |
| **Backend API**    | Virtual Machine (VM) | DigitalOcean Droplet / AWS EC2     |
| **Real-time (WS)** | Virtual Machine (VM) | (Persistent Process Required)      |
| **Frontend UI**    | Static Hosting       | **Vercel** or **Cloudflare Pages** |
| **Database**       | Managed SQL          | **Neon** or **Railway** (Postgres) |
| **SSL/Proxy**      | Reverse Proxy        | **Nginx** or **Caddy**             |

---

## 🔧 COMPONENT BREAKDOWN

### 1. BACKEND (THE SERVER)

**Best Choice: Virtual Machine (VM)**

- **Why?** Since Blindtech uses **native WebSockets**, it requires a persistent connection. Serverless environments (like Vercel Functions or AWS Lambda) have execution timeouts.
- **Workflow Options**:

#### Option A: PM2 (Recommended for Process Management)

1.  **Setup Node**: Install Node.js and PM2 globally on the VM.
    ```bash
    npm install -g pm2
    ```
2.  **Deploy**:
    ```bash
    cd server
    npm install --production
    pm2 start index.js --name "bt-server" --env production
    pm2 save
    pm2 startup
    ```

#### Option B: Docker (Containerized)

1.  **Build & Run**:
    ```bash
    docker build -t blindtech-server ./server
    docker run -d -p 3000:3000 --env-file .env --name bt-server blindtech-server
    ```

#### Reverse Proxy (REQUIRED)

Install Nginx on the host VM and configure a proxy to handle SSL and WebSockets:

```nginx
server {
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 2. FRONTEND (THE UI)

**Best Choice: Vercel or Cloudflare Pages**

- **Why?** The UI is a Vite-powered SPA. CDN hosting is faster and simplifies SSL/HTTPS management.
- **Workflow**:
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - **Single Page App Config**: Ensure that all 404s route back to `index.html` to allow React Router to handle navigation.

### 3. DATABASE

**Best Choice: Managed PostgreSQL**

- **Recommendation**: **Neon.tech** or **Railway.app**.
- **Managed Advantages**: Automated backups, easy scaling, and a high-performance connection string.
- **Migration**: Run `npm run migrate up` from your local machine (with production DP URL) or from a CI/CD pipeline.

---

## 🛠️ PRODUCTION CHECKLIST

1.  **Environment Sync**: Ensure production `.env` variables match the production database and domain.
2.  **CORS**: Update `@fastify/cors` in `server/index.js` to only allow your production UI domain.
3.  **Persistence**: Use `pm2` or Docker's `--restart always` policy on the VM to ensure the server restarts after crashes.
4.  **Security**: Use `bcrypt` rounds (set to 10-12) and ensure `JWT_SECRET` is at least 32 characters of random entropy.

---

_“The system is deployed. The participants are ready.”_
