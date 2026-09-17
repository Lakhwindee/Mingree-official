# Render.com + GoDaddy Deployment Guide for Mingree

This guide explains how to deploy this full-stack application to **Render.com** and connect your custom domain from **GoDaddy**.

---

## Part 1: Push Code to GitHub

1. If not already on GitHub:
   - Export or download the project ZIP from AI Studio (via the top-right settings menu) or initialize a Git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Render deployment"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

---

## Part 2: Deploy on Render.com

### Method A: Blueprint (Recommended - 1 Click)
Because this repository contains `render.yaml`:
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read `render.yaml`, set up the build command (`npm install && npm run build`), start command (`npm start`), and health check path (`/api/health`).
5. Click **Apply**.

### Method B: Manual Web Service
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure the settings:
   - **Name**: `mingree` (or your chosen name)
   - **Region**: Oregon, Singapore, or Frankfurt
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or Starter)
5. Under **Advanced** -> **Health Check Path**: `/api/health`
6. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `RENDER` = `true`
   - `APP_URL` = `https://<your-service>.onrender.com` (or your custom domain once connected)
   - Optional: `GEMINI_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`
7. Click **Create Web Service**.
8. Render will build and deploy your app. Once deployed, test the generated `.onrender.com` URL.

---

## Part 3: Connect GoDaddy Domain to Render

### Step 1: Add Custom Domain in Render
1. Go to your web service in Render dashboard.
2. In the left navigation, click **Settings**.
3. Scroll down to **Custom Domains**.
4. Click **Add Custom Domain**.
5. Enter both:
   - `yourdomain.com` (Apex domain)
   - `www.yourdomain.com` (Subdomain)
6. Render will show the DNS instructions (Render IP address and CNAME target).

### Step 2: Configure DNS Records in GoDaddy
1. Log in to your [GoDaddy Account](https://account.godaddy.com/).
2. Go to **My Products** -> Click **DNS** next to your domain.
3. Under **DNS Records**, add or update the following:

| Type | Name | Value / Points to | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `216.24.57.1` (Render Anycast IP) | 1/2 Hour or 1 Hour |
| **CNAME** | `www` | `<your-service-name>.onrender.com` | 1/2 Hour or 1 Hour |

> **Note**: If you already have an existing `@` A record (e.g. pointing to GoDaddy parked page), edit it to replace the IP with `216.24.57.1`.
> If you already have a `www` CNAME record, edit it to point to your Render `.onrender.com` address.

### Step 3: Automatic Free SSL Certificate
- Render automatically provisions and renews a free Let's Encrypt SSL certificate once DNS records are verified.
- DNS propagation usually takes between 5 to 30 minutes (up to 24-48 hours maximum in rare cases).
- Once active, Render will show green checkmarks next to your custom domain, and your website will load securely over `https://yourdomain.com` and `https://www.yourdomain.com`.
