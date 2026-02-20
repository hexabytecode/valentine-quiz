# Deploy (Render/Railway + Vercel/Netlify)

This project needs **both** a backend (Express) and a frontend (React).

## Backend: Render (recommended)
1. Create a new **Web Service** from your repo.
2. Build Command: `npm install`
3. Start Command: `npm run server`
4. Environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-5-nano`
   - `OPENAI_TIMEOUT_MS=90000` (optional, OpenAI request timeout)
   - `SERVER_PORT=5005` (optional)
   - `FRONTEND_ORIGIN=https://your-frontend-domain`

Render uses your build/start commands and exposes env vars to the service. citeturn0search2turn0search3

## Backend: Railway (alternative)
1. Create a new service from your repo.
2. Set the **Start Command** to `npm run server` (if not auto-detected).
3. Add environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-5-nano`
   - `OPENAI_TIMEOUT_MS=90000` (optional, OpenAI request timeout)
   - `SERVER_PORT=5005` (optional)
   - `FRONTEND_ORIGIN=https://your-frontend-domain`

Railway lets you override start commands and set variables per service. citeturn0search0turn0search8

## Frontend: Vercel
1. Import the repo into Vercel.
2. Build Command: `npm run build`.
3. Output Directory: `build` (if you set it manually).
4. Set environment variable:
   - `REACT_APP_API_BASE_URL=https://your-backend-domain`
   - `REACT_APP_SUMMARY_TIMEOUT_MS=90000` (optional, frontend timeout)

Vercel injects environment variables at build time. citeturn1search0turn1search1

## Frontend: Netlify
1. New site from Git.
2. Build Command: `npm run build`
3. Publish Directory: `build`
4. Environment variable:
   - `REACT_APP_API_BASE_URL=https://your-backend-domain`
   - `REACT_APP_SUMMARY_TIMEOUT_MS=90000` (optional, frontend timeout)

Netlify’s CRA defaults and `REACT_APP_` env var handling are documented here. citeturn0search1turn1search1

## Important notes
- **CRA env vars are build-time only.** If you change `REACT_APP_API_BASE_URL`, you must redeploy the frontend. citeturn1search1
- **Do not put secrets in the frontend.** Only the backend should have `OPENAI_API_KEY`. citeturn1search1
- If you host frontend and backend on different domains, keep `FRONTEND_ORIGIN` updated to avoid CORS issues.

## Quick health check
After deploy, verify the backend:
```bash
curl https://your-backend-domain/api/health
```
