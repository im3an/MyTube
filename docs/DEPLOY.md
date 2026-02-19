# MyTube Deployment Guide

Complete step-by-step deployment to Neon + Render + Netlify (all free tier).

---

## Prerequisites

- GitHub account
- [Neon](https://neon.tech) account
- [Render](https://render.com) account
- [Netlify](https://netlify.com) account

---

## Step 1: Database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign in
2. **New Project** → name it `mytube` → Create
3. Copy the connection string (e.g. `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
4. Run migrations locally:

```bash
cd /Users/im3an/MyTube
export DATABASE_URL="postgresql://YOUR_NEON_CONNECTION_STRING"
npm run deploy:migrate
```

Or from backend folder:

```bash
cd backend
DATABASE_URL="postgresql://..." npm run db:migrate
```

---

## Step 2: Backend (Render)

1. Push your code to GitHub (if not already)
2. Go to [dashboard.render.com](https://dashboard.render.com)
3. **New** → **Web Service**
4. Connect your GitHub repo → select `MyTube`
5. Configure:
   - **Name:** `mytube-backend`
   - **Root Directory:** (leave empty)
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm run db:migrate && npm start`
   - **Instance Type:** Free

6. **Environment** → Add variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://YOUR-SITE.netlify.app` (use placeholder for now, update after Netlify) |
| `WEBAUTHN_RP_ID` | `YOUR-SITE.netlify.app` |
| `WEBAUTHN_ORIGIN` | `https://YOUR-SITE.netlify.app` |
| `WEBAUTHN_RP_NAME` | `MyTube` |
| `SESSION_SECRET` | Run `openssl rand -hex 32` and paste |
| `GNEWS_API_KEY` | (optional) from gnews.io |

7. **Create Web Service**
8. Wait for deploy → copy your backend URL (e.g. `https://mytube-backend-xxx.onrender.com`)

---

## Step 3: Update netlify.toml

Replace `YOUR-RENDER-URL` with your Render backend URL (without `https://`):

```toml
to = "https://mytube-backend-xxx.onrender.com/api/:splat"
```

Or run (replace with your actual URL):

```bash
# Example - replace mytube-backend-xxxx with your Render service name
sed -i '' 's|YOUR-RENDER-URL|mytube-backend-xxxx|g' netlify.toml
```

---

## Step 4: Frontend (Netlify)

1. Go to [app.netlify.com](https://app.netlify.com)
2. **Add new site** → **Import an existing project**
3. Connect GitHub → select `MyTube`
4. Build settings (should auto-detect from netlify.toml):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Environment variables:** Add `VITE_USE_BACKEND=1` (or it's in netlify.toml)

5. **Deploy site**
6. Copy your Netlify URL (e.g. `https://random-name-123.netlify.app`)

---

## Step 5: Wire Backend to Frontend

1. **Render** → your service → **Environment** → Update:
   - `CORS_ORIGIN` = `https://YOUR-NETLIFY-URL.netlify.app`
   - `WEBAUTHN_RP_ID` = `YOUR-NETLIFY-URL.netlify.app`
   - `WEBAUTHN_ORIGIN` = `https://YOUR-NETLIFY-URL.netlify.app`

2. **Render** → **Manual Deploy** → Deploy latest

3. **Netlify** → ensure `netlify.toml` has the correct Render URL in the redirect

4. **Netlify** → **Trigger deploy** to rebuild

---

## Step 6: Verify

1. Open your Netlify URL
2. Sign up (Create account) → passkey prompt should appear
3. Watch a video, like, subscribe
4. Check Settings → profile picture, display name

---

## Quick Commands Reference

```bash
# Generate session secret (for Render SESSION_SECRET)
openssl rand -hex 32

# Run migrations (after creating Neon project)
export DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"
npm run deploy:migrate

# Verify builds before deploying
npm run deploy:check

# Update netlify.toml with your Render URL (after backend is deployed)
./scripts/set-netlify-redirect.sh mytube-backend-xxxx
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 404 on /api/auth | Backend not running or wrong URL in netlify.toml |
| 401 on sign-in | CORS_ORIGIN / WEBAUTHN_ORIGIN must match Netlify URL |
| Passkey not showing | register/options returns 500 → check DATABASE_URL, migrations |
| Render cold start | Free tier sleeps after 15 min; first request may take 30–60s |
