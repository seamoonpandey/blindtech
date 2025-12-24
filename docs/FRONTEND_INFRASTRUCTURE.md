# 🎨 BLINDTECH: FRONTEND INFRASTRUCTURE GUIDE

**Comprehensive infrastructure documentation for DevOps deployment and configuration**

---

## 📋 TABLE OF CONTENTS

1. [Technology Stack](#-technology-stack)
2. [Architecture Overview](#-architecture-overview)
3. [Build System](#-build-system)
4. [Environment Configuration](#-environment-configuration)
5. [Deployment Requirements](#-deployment-requirements)
6. [Build & Deployment Process](#-build--deployment-process)
7. [Nginx Configuration](#-nginx-configuration)
8. [Performance Optimization](#-performance-optimization)
9. [Monitoring & Troubleshooting](#-monitoring--troubleshooting)

---

## 🛠️ TECHNOLOGY STACK

### Core Framework

- **React 19.2.0**: UI library with latest concurrent features
- **TypeScript 5.9.3**: Type-safe development
- **Vite 7.2.4**: Build tool and dev server (ES modules, HMR)

### Routing & State

- **React Router DOM 7.10.1**: Client-side routing (SPA)
- **Custom AuthContext**: JWT-based authentication state management

### UI Libraries

- **@dnd-kit**: Drag-and-drop functionality for game interactions
  - `@dnd-kit/core` (6.3.1)
  - `@dnd-kit/sortable` (10.0.0)
  - `@dnd-kit/utilities` (3.2.2)

### Development Tools

- **ESLint 9.39.1**: Code linting with React-specific rules
- **TypeScript ESLint 8.46.4**: Type-aware linting
- **Vite Plugin React 5.1.1**: Fast Refresh with Babel

---

## 🏗️ ARCHITECTURE OVERVIEW

### Application Type

**Single Page Application (SPA)** with client-side routing

### Directory Structure

```
ui/
├── dist/                    # Production build output (generated)
│   ├── assets/             # Bundled JS/CSS with content hashes
│   ├── index.html          # Entry HTML
│   └── vite.svg            # Static assets
├── public/                 # Static assets (copied as-is)
│   └── vite.svg
├── src/
│   ├── assets/            # Application assets
│   ├── game/              # Game logic modules
│   ├── App.tsx            # Root component with routing
│   ├── main.tsx           # Application entry point
│   ├── config.ts          # Runtime configuration
│   ├── AuthContext.tsx    # Authentication state provider
│   ├── Game.tsx           # Main game component (~164KB)
│   ├── Login.tsx          # Login page
│   ├── Register.tsx       # Registration page
│   ├── ProtectedRoute.tsx # Route guard component
│   ├── index.css          # Global styles (~10.5KB)
│   └── App.css            # Component styles
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript config (root)
├── tsconfig.app.json      # App-specific TS config
├── package.json           # Dependencies & scripts
└── .env.example           # Environment template
```

### Routing Structure

```
/                 → Redirect to /login
/login            → Public: Login page
/register         → Public: Registration page
/game             → Protected: Main game interface (requires auth)
```

---

## 🔧 BUILD SYSTEM

### Vite Configuration

**File**: `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

**Key Features**:

- **Fast HMR**: Hot Module Replacement for instant updates
- **ES Modules**: Native ESM in development
- **Optimized Bundling**: Rollup-based production builds
- **Code Splitting**: Automatic chunk splitting
- **Asset Hashing**: Content-based cache busting

### TypeScript Configuration

**Target**: ES2022  
**Module System**: ESNext with bundler resolution  
**JSX**: react-jsx (new JSX transform)  
**Strict Mode**: Enabled with comprehensive linting

---

## 🌍 ENVIRONMENT CONFIGURATION

### Environment Variables

**File**: `.env` (create from `.env.example`)

```bash
VITE_API_URL=http://localhost:3000
```

> **⚠️ CRITICAL**: All environment variables MUST be prefixed with `VITE_` to be exposed to the client bundle.

### Runtime Configuration

**File**: `src/config.ts`

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const API_URL = API_BASE;
export const WS_URL = API_BASE.replace(/^http/, "ws") + "/ws";
```

**Behavior**:

- Reads `VITE_API_URL` at build time
- Automatically converts HTTP → WebSocket URL
- Falls back to `localhost:3000` if not set

### Production Environment Setup

For different deployment environments:

```bash
# Development
VITE_API_URL=http://localhost:3000

# Staging
VITE_API_URL=https://staging-api.blindtech.example.com

# Production
VITE_API_URL=https://api.blindtech.example.com
```

> **📌 NOTE**: The frontend will connect to the backend API at the specified URL for both HTTP requests and WebSocket connections.

---

## 📦 DEPLOYMENT REQUIREMENTS

### Runtime Requirements

- **Web Server**: Nginx, Apache, or any static file server
- **HTTPS**: Required for production (WebSocket security)
- **Node.js**: Only required for build process (NOT for serving)

### Build Output

- **Location**: `ui/dist/`
- **Size**: ~500KB - 2MB (gzipped)
- **Format**: Static HTML, JS, CSS files
- **Entry Point**: `dist/index.html`

### Browser Support

- Modern browsers with ES2022 support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## 🚀 BUILD & DEPLOYMENT PROCESS

### 1. Install Dependencies

```bash
cd ui
npm install
```

### 2. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with production values
nano .env
```

**Production `.env` example**:

```bash
VITE_API_URL=https://api.blindtech.yourdomain.com
```

### 3. Build for Production

```bash
npm run build
```

**Output**:

```
✓ 1234 modules transformed.
dist/index.html                   0.45 kB │ gzip: 0.30 kB
dist/assets/index-a1b2c3d4.css   12.34 kB │ gzip: 3.45 kB
dist/assets/index-e5f6g7h8.js   234.56 kB │ gzip: 78.90 kB
✓ built in 3.45s
```

### 4. Verify Build

```bash
# Preview production build locally
npm run preview

# Test at http://localhost:4173
```

### 5. Deploy Static Files

```bash
# Copy dist/ to web server
scp -r dist/* user@server:/var/www/blindtech/

# Or use rsync
rsync -avz --delete dist/ user@server:/var/www/blindtech/
```

---

## 🌐 NGINX CONFIGURATION

### Basic Configuration

```nginx
server {
    listen 80;
    server_name blindtech.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name blindtech.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/blindtech.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blindtech.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root directory (frontend build)
    root /var/www/blindtech;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (backend)
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### Alternative: Same-Origin Setup

If frontend and backend share the same domain:

```nginx
server {
    listen 443 ssl http2;
    server_name blindtech.yourdomain.com;

    # Frontend (root)
    root /var/www/blindtech;
    index index.html;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/;
        # ... proxy settings
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000/ws;
        # ... WebSocket settings
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Environment variable for this setup**:

```bash
VITE_API_URL=https://blindtech.yourdomain.com/api
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Build Optimizations

1. **Code Splitting**

   - Vite automatically splits vendor and app code
   - Lazy load routes if needed (future enhancement)

2. **Asset Optimization**

   ```bash
   # Vite automatically:
   # - Minifies JS/CSS
   # - Tree-shakes unused code
   # - Optimizes images in public/
   ```

3. **Bundle Analysis**

   ```bash
   # Install analyzer
   npm install -D rollup-plugin-visualizer

   # Add to vite.config.ts
   import { visualizer } from 'rollup-plugin-visualizer';

   export default defineConfig({
     plugins: [
       react(),
       visualizer({ open: true })
     ],
   })
   ```

### Server Optimizations

1. **Enable Brotli Compression** (in addition to gzip)

   ```nginx
   brotli on;
   brotli_comp_level 6;
   brotli_types text/plain text/css application/javascript application/json;
   ```

2. **HTTP/2 Server Push** (optional)

   ```nginx
   location = /index.html {
       http2_push /assets/index-[hash].js;
       http2_push /assets/index-[hash].css;
   }
   ```

3. **CDN Integration**
   - Upload `dist/assets/*` to CDN
   - Update `vite.config.ts`:
     ```typescript
     export default defineConfig({
       base: "https://cdn.yourdomain.com/",
       plugins: [react()],
     });
     ```

### Caching Strategy

```nginx
# HTML - no cache (always fresh)
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# Hashed assets - cache forever
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Other assets - moderate cache
location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public";
}
```

---

## 🔍 MONITORING & TROUBLESHOOTING

### Health Checks

**Frontend Health Check**:

```bash
# Check if index.html is served
curl -I https://blindtech.yourdomain.com/

# Expected: HTTP/2 200
```

**API Connection Check**:

```bash
# Check if frontend can reach backend
curl https://blindtech.yourdomain.com/api/health

# Or check WebSocket
wscat -c wss://blindtech.yourdomain.com/ws
```

### Common Issues

#### 1. **Blank Page / White Screen**

**Symptoms**: Browser shows blank page  
**Diagnosis**:

```bash
# Check browser console for errors
# Common causes:
# - API_URL misconfiguration
# - CORS issues
# - Missing environment variables
```

**Fix**:

```bash
# Rebuild with correct environment
VITE_API_URL=https://api.yourdomain.com npm run build
```

#### 2. **404 on Refresh**

**Symptoms**: Direct navigation to `/game` returns 404  
**Cause**: Missing SPA fallback in Nginx  
**Fix**: Ensure `try_files $uri $uri/ /index.html;` is configured

#### 3. **WebSocket Connection Failed**

**Symptoms**: Game doesn't update in real-time  
**Diagnosis**:

```bash
# Check WebSocket proxy
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://blindtech.yourdomain.com/ws
```

**Fix**: Verify Nginx WebSocket proxy configuration (see above)

#### 4. **CORS Errors**

**Symptoms**: API requests blocked by browser  
**Cause**: Backend not configured for frontend origin  
**Fix**: Update backend CORS settings to allow frontend domain

### Logging

**Nginx Access Logs**:

```bash
tail -f /var/log/nginx/access.log | grep blindtech
```

**Nginx Error Logs**:

```bash
tail -f /var/log/nginx/error.log
```

**Browser Console**:

- Open DevTools → Console
- Check for JavaScript errors
- Monitor Network tab for failed requests

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Environment variables configured in `.env`
- [ ] `npm run build` completes without errors
- [ ] `npm run preview` works locally
- [ ] API_URL points to correct backend
- [ ] SSL certificates installed on server

### Deployment

- [ ] `dist/` copied to web server
- [ ] Nginx configuration updated
- [ ] Nginx config tested: `nginx -t`
- [ ] Nginx reloaded: `systemctl reload nginx`
- [ ] Firewall allows ports 80/443

### Post-Deployment

- [ ] Frontend loads at production URL
- [ ] Login/Register flows work
- [ ] WebSocket connection established
- [ ] Game interface functional
- [ ] Browser console shows no errors
- [ ] Mobile responsive (test on devices)

---

## 🔐 SECURITY CONSIDERATIONS

1. **Environment Variables**

   - Never commit `.env` to version control
   - Use `.env.example` as template
   - Rotate secrets regularly

2. **HTTPS Only**

   - Enforce HTTPS in production
   - Use HSTS header: `add_header Strict-Transport-Security "max-age=31536000" always;`

3. **Content Security Policy** (optional)

   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://blindtech.yourdomain.com;" always;
   ```

4. **Rate Limiting** (Nginx)

   ```nginx
   limit_req_zone $binary_remote_addr zone=frontend:10m rate=10r/s;

   location / {
       limit_req zone=frontend burst=20 nodelay;
       try_files $uri $uri/ /index.html;
   }
   ```

---

## 📞 SUPPORT & MAINTENANCE

### Build Scripts

```bash
npm run dev      # Development server (port 5173)
npm run build    # Production build
npm run preview  # Preview production build (port 4173)
npm run lint     # Run ESLint
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update all (test thoroughly)
npm update

# Update specific package
npm install react@latest
```

### Rollback Procedure

```bash
# Keep previous build
mv dist dist.backup

# If issues occur
rm -rf dist
mv dist.backup dist
systemctl reload nginx
```

---

## 📈 PERFORMANCE METRICS

**Target Metrics**:

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 500KB (gzipped)
- **Lighthouse Score**: > 90

**Monitoring Tools**:

- Google Lighthouse
- WebPageTest
- Chrome DevTools Performance tab

---

_"Infrastructure is the silent foundation of every great system."_

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-24  
**Maintained By**: Development Team
