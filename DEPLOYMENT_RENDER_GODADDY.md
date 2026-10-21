# Render.com + GoDaddy Deployment Guide for Mingree

This guide explains how to deploy this full-stack application to **Render.com** with a **Render PostgreSQL Database** and connect your custom domain from **GoDaddy**.

---

## Part 1: Push Code to GitHub

1. If not already on GitHub, initialize your repository and push:
```bash
git init
git add .
git commit -m "Production release for Render deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

---

## Part 2: Set Up Render PostgreSQL Database

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **PostgreSQL**.
3. Name: `mingree-db`
4. Region: Choose the closest region (e.g., Singapore, Oregon, Frankfurt).
5. Database: `mingree`
6. User: `mingree_user`
7. Plan: **Starter** or **Free**.
8. Click **Create Database**.
9. Once created, copy the **Internal Database URL** (or External Database URL if deploying outside Render).

---

## Part 3: Deploy Web Service on Render.com

### Method A: Blueprint (Recommended - 1 Click)
Because this repository contains `render.yaml`:
1. In Render dashboard, click **New +** -> **Blueprint**.
2. Connect your GitHub repository.
3. Render will read `render.yaml`, set up the build command (`npm install && npm run build`), start command (`npm start`), and health check path (`/api/health`).
4. Set the `DATABASE_URL` secret variable to your Render PostgreSQL connection string.
5. Provide secrets for `JWT_SECRET`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, and `GMAIL_USER`.
6. Click **Apply**.

### Method B: Manual Web Service Setup
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `mingree`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: **Starter** (Paid plan is required so the server does not sleep, ensuring instant payment webhooks & node-cron background releases work properly).
4. Under **Advanced** -> **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `RENDER` = `true`
   - `DATABASE_URL` = `<your-render-postgres-connection-string>`
   - `APP_URL` = `https://<your-service>.onrender.com`
   - `JWT_SECRET` = `<your-random-jwt-secret>`
   - `TOKEN_ENC_KEY` = `<your-random-token-encryption-key>`
   - `INSTAGRAM_APP_ID` & `INSTAGRAM_APP_SECRET`
   - `CASHFREE_APP_ID` & `CASHFREE_SECRET_KEY`
   - `GMAIL_USER` & `GMAIL_APP_PASSWORD`

---

## Part 4: Run Database Schema Push & Seed

After deployment, push the Drizzle schema to your Render database and run seed data:

1. In Render Web Service dashboard, go to the **Shell** tab (or connect via SSH/local terminal with `DATABASE_URL` set).
2. Run schema push:
```bash
npm run db:push
```
3. Run database seed:
```bash
npm run db:seed
```

---

## Part 5: Connect GoDaddy Domain to Render

### Step 1: Add Custom Domain in Render
1. In your Render Web Service, go to **Settings** -> **Custom Domains**.
2. Click **Add Custom Domain** and enter:
   - `yourdomain.com` (Apex domain)
   - `www.yourdomain.com` (Subdomain)

### Step 2: Configure DNS Records in GoDaddy
1. Log in to [GoDaddy Account](https://account.godaddy.com/).
2. Go to **My Products** -> **DNS** for your domain.
3. Add/Update DNS Records:

| Type | Name | Value / Points to | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `216.24.57.1` (Render Anycast IP) | 1/2 Hour |
| **CNAME** | `www` | `<your-service-name>.onrender.com` | 1/2 Hour |

---

## Part 6: SSL & Verification

- Render automatically provisions a free Let's Encrypt SSL certificate once DNS records propagate (5–30 minutes).
- Your app will load securely over `https://yourdomain.com`.
