# relaycallbell.com

Marketing site, clinical pilot application, and admin dashboard for RELAY.

## Local dev

```bash
npm install
cp .env.local.example .env.local   # already includes the dev admin password
npm run dev
# http://localhost:3000
```

The app uses **SQLite** locally (file at `./data/relay.db`, auto-created).
On Vercel, set `POSTGRES_URL` (auto-injected by Vercel Postgres) and the app switches to Postgres automatically.

## Routes

- `/`               landing page (intro animation + main composition)
- `/app`            clinical pilot application (renders the live survey)
- `/admin/login`    password gate (default password: `balls2balls2`)
- `/admin`          analytics dashboard
- `/admin/responses` submitted applications
- `/admin/builder`   survey builder with live PUSH

## Deploy to Vercel

1. `gh repo create relaycallbell --public --source=. --push`
2. Vercel dashboard → Import the repo
3. Storage → Create Postgres → it auto-injects `POSTGRES_URL` etc.
4. Settings → Environment Variables: add `ADMIN_PASSWORD` and `ADMIN_SECRET` (32-byte hex)
5. Domains → add `relaycallbell.com` and `www.relaycallbell.com`
