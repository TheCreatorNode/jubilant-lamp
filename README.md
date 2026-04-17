# Profile API

A REST API that accepts a name, enriches it by calling **Genderize**, **Agify**, and **Nationalize** in parallel, applies classification logic, persists the result in SQLite, and exposes full CRUD endpoints.

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node.js ≥ 18 | Native `fetch`, broad platform support |
| Framework | Express 4 | Minimal, well-understood |
| Database | SQLite via `sql.js` | Pure JS — no native compilation, zero setup |
| IDs | UUID v7 | Time-ordered, spec-compliant |
| External APIs | Genderize / Agify / Nationalize | Free, no API key required |

---

## Project Structure

```
profile-api/
├── index.js          ← Express app, CORS middleware, global error handler
├── src/
│   ├── db.js         ← SQLite init & persistence helpers
│   ├── external.js   ← External API calls + classifyAge()
│   └── routes.js     ← Route handlers for all 4 endpoints
├── test.js           ← End-to-end test script (no extra deps)
├── vercel.json       ← Vercel deployment config
├── railway.toml      ← Railway deployment config
├── .gitignore
└── README.md
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the server (default port 3000)
npm start

# 3. In another terminal, run the test suite
node test.js
# or against a deployed URL:
node test.js https://your-app.railway.app
```

The SQLite database (`profiles.db`) is created automatically on first run in the project root.

---

## Deploying

### Railway (recommended — supports persistent disk for SQLite)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repo — Railway auto-detects Node.js and runs `npm start`
4. Optionally set `PORT` (Railway injects it automatically)
5. Your API is live at `https://<project>.railway.app`

### Vercel

> ⚠️ Vercel's serverless functions are stateless — the SQLite file won't persist across cold starts. Use Railway for persistent storage.

```bash
npm install -g vercel
vercel
```

### Heroku / Any VPS

```bash
# Set PORT in your environment, then:
npm start
```

---

## API Reference

All responses include `Access-Control-Allow-Origin: *`.

---

### POST /api/profiles

Create a new profile. Calls all three external APIs in parallel.

**Request**
```json
{ "name": "ella" }
```

**201 Created**
```json
{
  "status": "success",
  "data": {
    "id": "019d9a00-5f4c-7549-bbc2-3a7093ad3223",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 4567,
    "age": 46,
    "age_group": "adult",
    "country_id": "DK",
    "country_probability": 0.72,
    "created_at": "2026-04-01T12:00:00.000Z"
  }
}
```

**200 OK — name already exists (idempotent)**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { "...": "existing profile" }
}
```

| Code | Cause |
|------|-------|
| 400  | name is missing or blank |
| 422  | name is not a string |
| 502  | External API returned null / empty data |

502 message format: "Genderize returned an invalid response" (or Agify / Nationalize)

---

### GET /api/profiles

List all profiles. Supports optional case-insensitive query filters.

| Query param  | Example              |
|--------------|----------------------|
| gender       | ?gender=male         |
| country_id   | ?country_id=NG       |
| age_group    | ?age_group=adult     |

**200 OK**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "...",
      "name": "ella",
      "gender": "female",
      "age": 46,
      "age_group": "adult",
      "country_id": "DK"
    }
  ]
}
```

---

### GET /api/profiles/:id

Fetch a single profile by UUID.

- **200 OK** — full profile object
- **404 Not Found** — { "status": "error", "message": "Profile not found" }

---

### DELETE /api/profiles/:id

- **204 No Content** — deleted successfully
- **404 Not Found** — profile does not exist

---

## Classification Rules

### Age group

| Range  | Group      |
|--------|------------|
| 0-12   | child      |
| 13-19  | teenager   |
| 20-59  | adult      |
| 60+    | senior     |

### Nationality

The country_id with the highest probability from Nationalize is selected.

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| gender: null or count: 0 from Genderize | 502, do not store |
| age: null from Agify | 502, do not store |
| Empty country array from Nationalize | 502, do not store |
| Same name submitted twice | 200 with existing record, no duplicate |
| Name casing differences | "Ella" and "ella" resolve to the same profile |

---

## Running the Test Suite

```bash
# Server must be running first:
npm start

# Then in another terminal:
node test.js                                  # local
node test.js https://your-app.railway.app     # deployed
```

Covers: all endpoints, idempotency, filters, validation errors, not-found cases, CORS — no extra dependencies.
