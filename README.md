# 🚗 Rentigo

**A full-stack car rental platform built from first principles — no frameworks.**

Rentigo is a complete car rental website for Kosovo: customers browse the fleet, create an account and book a car online, while the owner manages cars, bookings and customer leads from a private admin dashboard. The backend is a hand-written Node.js request handler on serverless PostgreSQL (Neon), deployed on Vercel, and the frontend is plain HTML, CSS and JavaScript.

> **Live demo:** _moving to Vercel — link coming soon_

---

## ✨ Features

**For customers**
- Multi-page website: Home, Fleet, Booking, Services, About and Contact
- Live car catalogue with search and filters by category, location and status
- Sign up, log in and an account page with personal booking history
- Online booking form with pickup locations across Kosovo
- Contact form that stores customer inquiries

**For the admin**
- Password-protected admin panel
- Dashboard with fleet and booking statistics
- Manage booking status (pending, confirmed, completed, cancelled) and customer inquiries
- Add, edit and remove cars from the fleet
- Cars are released automatically when a booking expires

**Under the hood**
- REST-style JSON API written by hand — the same handler runs as a local Node server and as a Vercel function
- PostgreSQL on Neon via the serverless HTTP driver — tables are created and seeded automatically on first use
- Sessions stored in the database (only a SHA-256 hash of each token), so logins work across serverless instances
- Booking a car claims it atomically in one statement, so two people can't book the same car at once
- Passwords hashed with `scrypt` and random salts; constant-time comparisons
- HttpOnly session cookies (`Secure` in production) with expiry
- Path-traversal-safe static file server and request size limits
- Responsive UI with scroll reveals, animated counters and page transitions

## 🛠 Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript, Lucide icons |
| Backend | Node.js, REST API (no framework) |
| Database | PostgreSQL (Neon serverless) |
| Hosting | Vercel (static pages on the CDN, API as a serverless function) |

## 🚀 Run locally

Requires **Node.js 22.9 or newer** and a free [Neon](https://neon.tech) Postgres database.

```bash
npm install
cp .env.example .env     # add your DATABASE_URL (and optionally ADMIN_PASSWORD)
npm start
```

Open <http://localhost:3000>. On first use the tables are created and seeded with cars and sample bookings.

If `ADMIN_PASSWORD` is not set locally, a random password is generated and saved to `data/admin-password.txt` (ignored by Git). Log in at <http://localhost:3000/login?admin=1>.

### Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Neon / Postgres connection string | — (required) |
| `ADMIN_PASSWORD` | Admin panel password | generated locally; required on Vercel |
| `PORT` | HTTP port for the local server | `3000` |

## ☁️ Deploy on Vercel (free)

1. Import the GitHub repository in Vercel (framework preset: **Other**).
2. Add `DATABASE_URL` and `ADMIN_PASSWORD` as environment variables.
3. Deploy. `vercel.json` serves `public/` from the CDN and rewrites `/api/*` to the serverless function in `api/index.js`.

## 📁 Project structure

```
rentigo/
├── api/index.js     # Vercel function entry point
├── server.js        # Local server (same handler) + hourly booking release
├── src/
│   ├── app.js       # Routing, auth, validation and the JSON API
│   └── database.js  # Postgres schema, seed data, queries and sessions
├── public/          # HTML pages, styles.css and app.js (served by the CDN)
└── vercel.json      # Rewrites, clean URLs and headers
```

## 👤 Author

**Arianit Xhafa** — Computer Science & Engineering student
[GitHub](https://github.com/Arianitxhafa) · [LinkedIn](https://www.linkedin.com/in/arianit-xhafa-910228408)

## 📄 License

MIT
