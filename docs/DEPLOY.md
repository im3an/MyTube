# NØDE — Deployment Guide

Complete step-by-step guide to go from repo → live URL in ~11 minutes.  
Stack: **Neon** (PostgreSQL) · **Render** (backend API) · **Netlify** (frontend SPA)

---

## Prerequisites

| Account | URL | Free tier |
|---------|-----|-----------|
| Neon | https://neon.tech | 0.5 GB storage, 1 project |
| Render | https://render.com | 750 hrs/month (spins down after inactivity) |
| Netlify | https://app.netlify.com | 100 GB bandwidth, 300 build mins |

You'll also need your repo pushed to GitHub.

---

## Step 1 — Database (Neon) — 2 min

1. Go to **dashboard.neon.tech** → **New Project**
2. Name it `mytube`, choose a region close to your users
3. Copy the **connection string** — looks like:  
   `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Run migrations **once** from your local machine:

```bash
export DATABASE_URL="postgresql://YOUR_NEON_STRING_HERE"
npm run deploy:migrate
```

You should see:
```
[deploy] Running database migrations...
[deploy] Migrations complete.
```

---

## Step 2 — Backend (Render) — 5 min

1. Go to **dashboard.render.com** → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name:** `mytube-backend`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** Node
   - **Region:** Oregon (or closest to Neon region)
   - **Build Command:** `cd backend && npm install --include=dev && npm run build`
   - **Start Command:** `cd backend && npm run db:migrate && npm start`
   - **Instance Type:** Free

4. Under **Environment**, add these variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | Run `openssl rand -hex 32` and paste the output |
| `CORS_ORIGIN` | `https://PLACEHOLDER.netlify.app` *(update in Step 5)* |
| `WEBAUTHN_RP_ID` | `PLACEHOLDER.netlify.app` *(update in Step 5)* |
| `WEBAUTHN_ORIGIN` | `https://PLACEHOLDER.netlify.app` *(update in Step 5)* |
| `WEBAUTHN_RP_NAME` | `NØDE` |
| `GNEWS_API_KEY` | *(optional)* from gnews.io |

5. Click **Create Web Service** — wait for the green ✓
6. Copy your backend URL: `https://mytube-backend-XXXX.onrender.com`

---

## Step 3 — Configure Netlify redirect — 30 sec

Replace the placeholder backend URL in `netlify.toml`:

```bash
# Replace XXXX with your actual Render service name
sed -i '' 's|mytube-backend-mz1f|mytube-backend-XXXX|g' netlify.toml
git add netlify.toml
git commit -m "chore: set render backend url"
git push
```

---

## Step 4 — Frontend (Netlify) — 3 min

1. Go to **app.netlify.com** → **Add new site** → **Import an existing project**
2. Connect GitHub → select your repo
3. Build settings (auto-detected from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Under **Environment variables**, add:

| Key | Value |
|-----|-------|
| `VITE_USE_BACKEND` | `1` |

5. Click **Deploy site** — wait ~60 seconds
6. Copy your live URL: **`https://your-app-name.netlify.app`** 🎉

---

## Step 5 — Wire Render CORS — 1 min

Back in **Render Dashboard → mytube-backend → Environment**, update the three placeholders:

| Key | New value |
|-----|-----------|
| `CORS_ORIGIN` | `https://your-app-name.netlify.app` |
| `WEBAUTHN_RP_ID` | `your-app-name.netlify.app` |
| `WEBAUTHN_ORIGIN` | `https://your-app-name.netlify.app` |

Click **Save Changes** → Render will redeploy automatically (~30s).

---

## ✅ Verification checklist

```bash
# 1. Check security headers
curl -I https://your-app-name.netlify.app | grep -E 'x-frame|content-security|strict-transport'

# 2. Check backend health
curl https://mytube-backend-XXXX.onrender.com/health

# 3. Check auth is wired
curl https://your-app-name.netlify.app/api/auth/me
# → {"user":null}  (unauthenticated — correct)
```

- Open DevTools → Network → no CORS errors
- Open DevTools → Application → Manifest shows NØDE (PWA installable)
- Sign in with passkey → session persists on reload
- Lighthouse PWA score → "Installable"

---

## Custom domain (optional)

1. Netlify Dashboard → Domain management → Add custom domain
2. Point your DNS CNAME to `your-app-name.netlify.app`
3. Update Render env vars:
   - `CORS_ORIGIN` → `https://yourdomain.com`
   - `WEBAUTHN_RP_ID` → `yourdomain.com`
   - `WEBAUTHN_ORIGIN` → `https://yourdomain.com`

---

## Environment variable reference

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | Must be `production` |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon) |
| `SESSION_SECRET` | ✅ | Random 32+ char string — `openssl rand -hex 32` |
| `CORS_ORIGIN` | ✅ | Exact Netlify URL (no trailing slash) |
| `WEBAUTHN_RP_ID` | ✅ | Domain only, no protocol: `your-app.netlify.app` |
| `WEBAUTHN_ORIGIN` | ✅ | Full origin: `https://your-app.netlify.app` |
| `WEBAUTHN_RP_NAME` | ✅ | App name shown in passkey prompt |
| `PORT` | ❌ | Default: 4000 (Render overrides this) |
| `GNEWS_API_KEY` | ❌ | From gnews.io — enables news category |
| `PIPED_INSTANCES` | ❌ | Comma-separated Piped API URLs (built-in fallback used if unset) |

### Frontend (Netlify)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_USE_BACKEND` | `1` | Set to `1` to route API calls through backend |

---

## Troubleshooting

**"Database not ready"** — Run migrations: `DATABASE_URL="..." npm run deploy:migrate`

**Passkey fails with "origin mismatch"** — Check `WEBAUTHN_ORIGIN` matches exactly (with `https://`, no trailing slash)

**Videos not loading** — Check Render logs; Piped instances may be temporarily down. The backend auto-rotates through fallback instances.

**Render spins down on free tier** — First request after inactivity takes ~30s. Upgrade to Starter ($7/mo) to keep always-on.
