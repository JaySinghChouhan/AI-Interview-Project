# AI Interview Agent

MERN MVP for an AI-powered text interview platform.

## Current functionality

- Role, experience, and interview-style setup
- PDF and TXT resume upload with browser-side text extraction
- AI-generated interview questions and feedback through OpenRouter
- Interview timer, answer capture, offline practice preview, and downloadable report
- Email/password registration and login backed by MongoDB, with protected dashboard and AI API
- Per-account interview history and progress summary stored in this browser

Without an OpenRouter key, the app clearly switches to sample questions and an
offline practice estimate. Interview history is kept in browser storage, separately
for each account; it is not synchronized to the server.

### Install

```powershell
npm install
npm --prefix client install
npm --prefix server install
```

### Environment

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.
Set `MONGODB_URI` in `server/.env` to a MongoDB cluster you can access; it is
required for registration and login. The server stores authentication data in
the `InterviewDatabase` database, regardless of the database name in the URI.
Set `OPENROUTER_API_KEY` to enable live AI
questions and feedback. You may also set `OPENROUTER_MODEL` to a model available
to your OpenRouter account. Do not commit real credentials.

### Run

```powershell
npm run dev
```

- Client: <http://localhost:5173>
- Server health: <http://localhost:5000/api/health>

## Deploy to Vercel

Import this repository into Vercel and keep the project root set to the repository
root. `vercel.json` defines a Vercel multi-service project: the Vite client serves
the frontend at `/`, and the Express server serves the API at `/api/*` on the same
domain.

Configure these Vercel environment variables as needed:

- `MONGODB_URI` — required for registration, login, and authenticated AI requests
- `OPENROUTER_API_KEY` — required for live AI-generated interviews
- `OPENROUTER_MODEL` — optional model override
- `CLIENT_URL` — optional comma-separated list of additional allowed browser origins

The frontend and API use the same origin, so no service binding is required. Do
not add secrets to the repository or client-side environment. Configure the
MongoDB Atlas network access rules to allow the Vercel deployment to connect.
The API selects the `InterviewDatabase` database within the cluster for its
`users` and `sessions` collections.

Authentication endpoints:

- `POST /api/auth/register` — create an account and sign in
- `POST /api/auth/login` — sign in
- `GET /api/auth/me` — read the signed-in user
- `POST /api/auth/logout` — revoke the current session

Protected AI endpoints:

- `POST /api/ai/questions` — generate role-specific interview questions
- `POST /api/ai/evaluate` — evaluate a completed set of answers

### Verification

```powershell
npm run build
npm test
npm run lint
```
