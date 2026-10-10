# LifeOS

Personal self-development tracking system — mental/psych, grooming, fitness & nutrition,
goals, technical/career work, and learning — as a real full-stack app.

## Structure

```
LifeOS/
├── server/    Express + Mongoose API (MongoDB Atlas)
├── web/       React + Vite + Tailwind web app
├── shared/    Constants + API client shared by web and (later) mobile
└── mobile/    Android app (Expo) — the full website in an app; see mobile/README.md
```

## Accounts (owner + friends)

LifeOS supports a handful of accounts on one server.

- The first account is the **owner** (admin). Older single-user databases are
  migrated on start-up: the oldest account becomes the owner and all existing
  data is given to it.
- Friends join with a **one-time invite code** (Account → Invite a friend; codes
  last 7 days). There's no open sign-up.
- Every saved item has an owner (`userId`). The server only ever reads or writes
  the logged-in account's data, and a Mongoose plugin (`server/utils/owned.js`)
  refuses any query that doesn't name the owner.
- Owner-only: North Star (home page), the Google Calendar feed, and the
  Account → People/Invites tools (reset a forgotten password, remove an account
  with all its data).
- Friends get one AI skin check a day (failed reads don't count).
- `npm test` in `server/` runs `test/isolation.test.mjs`: it migrates an old
  single-user database and checks, for every data route, that two accounts
  can't see or change each other's data. Needs MongoDB (or FerretDB) on
  127.0.0.1:27017.

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

## Finances section

Styled after FinTraQ (dark theme, orange accent). Five tabs:

- **Home** — salary for the month split into Needs / Wants / Savings, what's
  left in each bucket, a safe-to-spend-per-day figure, today / week / month
  spending, last month's leftover and recent expenses.
- **Expenses** — month navigator, Today / Week / Month, bucket filters, search,
  grouped by day. Tap an expense to edit; deletes can be undone.
- **Insights** — spend by bucket (donut), budget vs spent (incl. subcategory
  limits), weekly comparison, month by month vs salary, top subcategories.
- **Wealth** — savings goals and investment holdings.
- **Settings** — split by ratio (presets, drag slider) or exact amounts,
  subcategories (rename, monthly limit, delete), backup / restore / reset.

Press **N** (desktop) or the **+** button to log an expense.

API additions: `finance-months` (salary + split per month), `finance-settings`
(default ratio), `bucket`/`limit`/`order` on categories, `bucket` on
transactions, and `GET /api/finance/backup`, `POST /api/finance/restore`,
`POST /api/finance/reset`. Old categories are sorted into buckets
automatically the first time the new page loads.

## Grooming section

Same dark layout as Finances, teal accent (each domain gets its own accent
via a theme class — see `--fin-accent` in `web/src/index.css`). Tabs: Skin,
Hair, Body care. Skin has four views:

- **Today** — tick morning/evening steps, rate skin (1–5), concerns, note,
  streak of fully-completed days.
- **History** — month calendar shaded by completion; open any day to edit.
- **Insights** — consistency, condition trend, step-by-step adherence,
  concerns (7 / 30 / 90 days).
- **Routine** — your own steps and products per morning/evening, with
  optional weekdays (e.g. retinol Mon/Wed/Fri).

API: `skincare-steps` (routine), `doneSteps` on `skin-logs`. Older skin logs
(fixed cleanser/moisturizer/sunscreen fields) are read automatically.

**Hair** and **Body care** use the same four views:

- **Today** — the day's routine (hair: wash-day steps such as oil the night
  before, shampoo, conditioner; body: brushing, floss, tongue, shower,
  deodorant, lotion), "did it anyway" chips for unscheduled steps, and
  periodic tasks with due dates (haircut, hair mask, beard, nails, ears, nose,
  brows, scrub, towels, replace toothbrush, dental check-up…). Hair also has a
  check-in: hair fall, scalp, note.
- **History** — calendar; edit any day's steps and tasks.
- **Insights** — consistency, step-by-step, tasks target vs actual; hair fall
  trend + scalp (hair), brushed-twice / floss rates (body).
- **Routine** — add/edit/reorder steps (weekdays) and tasks (every N days).

API: `care-items` (steps and tasks, `area` hair/body) and `care-logs` (one per
area per day, `done` keys + hair check-in). On first run the default routines
are created and older `hair-logs`, `grooming-brush` and `grooming-tasks`
entries are copied over.

Keyboard: ← → switch Skin / Hair / Body care (as in Finances); ↑ ↓ switch domains.

## Fitness & Nutrition

Blue theme. Tabs: **Train**, **Nutrition**, **Body** (← → to switch).

- **Train** — Today: your Push/Pull/Legs day, week strip, muscle recovery
  (Fitbod-style), personal records, weekly totals, cardio/sport log. *Start
  workout* opens a live logger (Strong/Hevy-style): previous numbers per set,
  tick a set to start the rest timer (beeps), add sets/exercises, finish for a
  summary with new PRs (Epley 1RM). History calendar, Progress (1RM chart per
  exercise, workouts/week, sets per muscle vs 10–20), Program (exercises,
  sets × reps, weekly schedule, rest timer).
  FitNotes features: exercise types (weight & reps, bodyweight reps, time,
  distance & time), custom exercises, warm-up sets, RPE, set / exercise /
  workout notes, supersets, live 🏆 PRs, log past dates, edit or repeat a
  workout, plate calculator (bar + plates you own), timers (stopwatch, EMOM,
  AMRAP, Tabata), progress graph metrics with trend line and range, rep maxes
  (1/3/5/8/10/12 RM), goals per exercise, statistics, CSV export.
  **Import from FitNotes** (History → Import): pick the CSV from FitNotes →
  Settings → Spreadsheet Export. Sets become LifeOS workouts (Push/Pull/Legs
  guessed from the muscles trained), walks/runs become cardio, unknown
  exercises become your own, and common names are matched to the LifeOS
  library (Barbell Squat → Squat). Days already in LifeOS are skipped, so a
  newer export can be imported again safely. Uses `POST /api/<collection>/bulk`.
- **Calisthenics** — modelled on the WINGS skill tree and training guides
  (wingssw.com). The same 85 skills as WINGS' tutorial list in six families
  (horizontal push 20, vertical push 15, horizontal pull 15, vertical pull 15,
  legs 10, core/misc 10), each a tree
  from easiest to hardest with difficulty F→S. *Skill tree*: tap any skill;
  colours show your level (locked, unlocked = 1 rep / 2 s, in progress = 3 reps
  / 6 s, mastered = 6+ reps / 12+ s), dashed = ready to learn. *Tutorials*:
  overview (difficulty, time to learn, muscles, strain), step-by-step,
  recommended exercises, progressions (base → regression → current →
  progression → target), good/bad form cues, YouTube tutorials. *Training*:
  one focus skill per family with a set logger and hold timer. *Guides*: the
  seven WINGS guides (beginner, progressive overload, handstand, push roadmap,
  pull skills, front lever, workout structure) in our own words, with skill
  links and a foundation checklist filled from your logged bests. Skills live
  in `web/src/pages/fitness/cali/families/*.js`, guides in `cali/guides.js`;
  logs in `cali-logs`.
- **Nutrition** — Diary by meal with ~120 built-in Indian/Kerala foods,
  recent foods, quick add, copy yesterday, servings; water tracker. Targets
  from Mifflin–St Jeor + activity + goal (or your own). Insights: calories and
  protein vs target, macro split, top protein sources. Custom foods.
- **Body** — weigh-ins with a smoothed trend, weekly change, BMI, goal ETA,
  measurements, and an adaptive "real calorie burn" from intake vs trend
  (MacroFactor-style) once there's ~3 weeks of data. In the Android app, a
  "Smart scale" card syncs weigh-ins and body fat from Health Connect (e.g.
  FitDays via Google Fit / Samsung Health).

API: `fit-settings`, `workout-strength` (sessions), `workout-cardio`, `cali-logs`,
`food-logs` (one per day: entries + water), `custom-foods`, `body-logs`.

## Morning Paper

`/paper` — a newspaper-style front page for the day: today's and tomorrow's
Google Calendar events (recurring and all-day included, shown in your local
time), a "check your Gmail" reminder, money left / safe to spend, skincare
progress, today's training split, and savings goals.

AI skin check (Grooming → Skin → AI scan): three selfies (front, left, right)
are stored privately in MongoDB (only served when logged in) and read by Google
Gemini, which scores acne, marks, redness, oiliness, dryness, dark circles,
texture and tone (0–10) plus an overall skin score, and compares with the last
check. Setup: in Render → the `LifeOS` backend → Environment, add
`GEMINI_API_KEY` (free key from Google AI Studio). Optional `GEMINI_MODEL`.
Note: on Gemini's free tier Google may use what you send to improve its
products; turning on billing for the key stops that.

Calendar setup: in Render → the `LifeOS` backend service → Environment, add
`CALENDAR_ICS_URL` = your Google Calendar's *Secret address in iCal format*.
It's a secret — never commit it. Events are cached on the server for 5 minutes.

Also on the paper:
- **Headlines** — Tech, Chips (semiconductors), India, World and Sports, from
  Google News RSS (no API key). Cached on the server for 30 minutes.
- **Tech fact** — one electronics lesson a day (136 in all), from atoms and
  Ohm's law through AC, semiconductors, op-amps and digital logic to
  measurement and chip test. Written in our own words from three reference
  books (Hughes, Gibilisco, Bishop); each lesson shows the chapter and page to
  read more. Lessons live in `web/src/pages/paper/facts.js`.
  Clicking a reference opens your own copy of the book at that page: upload
  each PDF once from the book icon on the lesson card. PDFs are stored
  privately in MongoDB (GridFS, `/api/books`, login required) and cached in
  the browser after the first open — they are never in this repo.
- **Reminders** — stored in LifeOS (`/api/reminders`), tagged with a domain,
  optionally repeating daily/weekly/monthly. Each can also be sent to Google
  Calendar through a pre-filled "add event" link (no Google login needed).
  `<ReminderSheet>` in `web/src/components/reminders.jsx` can be opened from
  any domain with a prefilled title.

## Status

- Backend: all 13 collections wired with generic CRUD + auth (mirrors the
  prototype artifact's schemas exactly, so data can be migrated later).
- Web: skeleton with auth, routing, and an Overview page. Each domain page
  (Physical, Goals, Technical & Projects, Learning, Mental & Psych) still
  needs to be ported over from the prototype artifact's logic.
- Mobile: Android app in `mobile/` (whole website in a native shell); APK built by GitHub Actions.
