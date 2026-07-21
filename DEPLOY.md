# Deploying Stock Tracker (private, for two people)

This deploys the app to a private URL that **only your two allowlisted Google
accounts** can sign into. Free tiers cover everything here.

The stack: **GitHub** (your code) → **Vercel** (runs the app) → **Turso**
(the database). Login is **Google**, restricted to two emails.

> You'll create three accounts (GitHub, Vercel, Turso) and one Google OAuth
> credential. I can't create accounts or type your passwords for you, so those
> clicks are yours — but every value you need to paste is listed below.

---

## Step 1 — Put the code on GitHub (private repo)

From `D:\Stock\stock-app` in a terminal:

```bash
git add -A
git commit -m "Stock Tracker with auth + Turso"
```

Then create a **private** repo on https://github.com/new (name it e.g.
`stock-tracker`, keep it **Private**), and follow GitHub's "push an existing
repository" commands, which look like:

```bash
git remote add origin https://github.com/<your-username>/stock-tracker.git
git branch -M main
git push -u origin main
```

`.env.local` is git-ignored, so your secrets are **not** uploaded. Good.

---

## Step 2 — Create the database (Turso)

1. Sign up at https://turso.tech (sign in with GitHub is easiest).
2. Create a database (any name, pick the region closest to you — e.g. Mumbai/
   `aws-ap-south-1`).
3. From the database page, copy two values:
   - **Database URL** — looks like `libsql://your-db-you.turso.io`
   - **Auth token** — click "Create Token" / "Generate token" and copy it.

Keep these for Step 4 (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`). The app
creates its own tables automatically on first run — nothing to import.

---

## Step 3 — Create Google sign-in credentials

1. Go to https://console.cloud.google.com → create a project (any name).
2. **APIs & Services → OAuth consent screen**: choose **External**, fill the
   app name and your email, and **add both your and your father's Gmail
   addresses as Test users**. (While the app is in "Testing" mode, only test
   users can sign in — which is exactly what you want.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs** — add both:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-APP.vercel.app/api/auth/callback/google`
       *(you'll know the exact Vercel URL after Step 4 — come back and add it,
       or edit it once you do)*
4. Copy the **Client ID** and **Client secret** (→ `AUTH_GOOGLE_ID`,
   `AUTH_GOOGLE_SECRET`).

---

## Step 4 — Deploy on Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. **Add New → Project → Import** your `stock-tracker` repo.
3. Before clicking Deploy, open **Environment Variables** and add these
   (get `AUTH_SECRET` by running `npx auth secret` locally, or any 32-byte
   random base64 string):

   | Name | Value |
   |------|-------|
   | `TURSO_DATABASE_URL` | your `libsql://…` URL from Step 2 |
   | `TURSO_AUTH_TOKEN` | your Turso token from Step 2 |
   | `AUTH_SECRET` | a random secret (`npx auth secret`) |
   | `AUTH_GOOGLE_ID` | Google Client ID from Step 3 |
   | `AUTH_GOOGLE_SECRET` | Google Client secret from Step 3 |
   | `ALLOWED_EMAILS` | `youremail@gmail.com,fatheremail@gmail.com` |

4. Click **Deploy**. You'll get a URL like `https://stock-tracker-xyz.vercel.app`.

5. **Finish the Google redirect URI**: go back to Step 3's OAuth client and make
   sure the `https://<your-real-vercel-url>/api/auth/callback/google` redirect
   URI is added (using the actual URL Vercel gave you). Save.

Open the Vercel URL → you should land on the sign-in page → "Sign in with
Google" → only the two allowlisted emails get in. Share the URL with your
father; he signs in with his own Google account.

---

## Updating the app later

Any `git push` to `main` redeploys automatically. To change who can log in,
edit the `ALLOWED_EMAILS` variable in Vercel → Settings → Environment Variables
and redeploy.

## Running locally

`npm run dev` uses a local file database (`file:stock.db`) and needs no Turso.
Google sign-in locally requires `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in
`.env.local` plus the `localhost` redirect URI from Step 3.

## A note on SEBI / privacy

This tool is gated to two family members, charges nothing, and publishes
nothing — it shows **informational indicators, not investment advice or public
recommendations**. Keeping the allowlist to just the two of you is what keeps it
firmly personal use. (This is general information, not legal advice.)
