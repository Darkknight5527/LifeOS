# LifeOS

Personal self-development tracking system — mental/psych, physical health,
goals, technical/career work, and learning — as a real full-stack app.

## Structure

```
LifeOS/
├── server/    Express + Mongoose API (MongoDB Atlas)
├── web/       React + Vite + Tailwind web app
├── shared/    Constants + API client shared by web and (later) mobile
└── mobile/    Placeholder for a future React Native/Expo app
```

## Local setup

```bash
npm install          # installs all workspaces (server, web, shared)

cp server/.env.example server/.env   # fill in MONGO_URI and JWT_SECRET
cp web/.env.example web/.env.local   # fill in VITE_API_URL

npm run dev:server   # starts the API on :4000
npm run dev:web      # starts the web app on :5173
```

On first run, register the single user account:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```

This only works once — after that, `/api/auth/register` returns 403 and you
log in with `/api/auth/login` instead. The web app's login screen calls this
for you.

## Deployment

See the deployment guide doc for the full path: GitHub → MongoDB Atlas →
Render (backend) → GitHub Pages/Vercel (web) → optional data migration →
React Native/Expo app later.

## Status

- Backend: all 13 collections wired with generic CRUD + auth (mirrors the
  prototype artifact's schemas exactly, so data can be migrated later).
- Web: skeleton with auth, routing, and an Overview page. Each domain page
  (Physical, Goals, Technical & Projects, Learning, Mental & Psych) still
  needs to be ported over from the prototype artifact's logic.
- Mobile: not started — planned for after the web app is stable.
