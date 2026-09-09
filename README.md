# Krishna Box — Frontend

Next.js dashboard for the Krishna Box backend. Same design language as the
existing Ornate Solar inverter portal: dark navy rail, orange accent, KPI row,
fleet table.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TanStack Query · axios ·
Recharts · lucide-react · sonner.

## Setup

```bash
npm install
cp .env.example .env.local     # defaults to http://localhost:8000/api/
npm run dev
```

The backend lives in its own repository, **krishna-box-backend**, and must be
running before this app is useful:

```bash
git clone <your-org>/krishna-box-backend
cd krishna-box-backend
pip install -r requirements.txt
cp .env.example .env           # set SECRET_KEY and the DB settings
python manage.py migrate
python manage.py runserver
```

With both up, sign in at http://localhost:3000/login.

`NEXT_PUBLIC_API_URL` is the only variable. The WebSocket origin is derived from
it, so pointing the app at a different backend moves both.

## Pages

| Route | What it shows |
|---|---|
| `/login`, `/signup` | JWT sign-in; registration with the two-step OTP flow |
| `/dashboard` | KPI row, generation chart (1h/24h/7d/30d), fleet table |
| `/devices` | Full fleet with search and status filtering |
| `/devices/[id]` | One device: live KPIs, generation, parameter chart, raw readings |
| `/analytics` | Fleet trend, per-device energy ranking with share |
| `/faults` | Active faults and fault history |
| `/settings` | Profile, system health, change password |

## How it talks to the backend

**Auth.** `storeSession` unwraps the backend envelope
(`{ data: { user, tokens: { access, refresh } } }`) and puts both tokens in
`sessionStorage`, so closing the tab ends the session. On a 401 the axios
interceptor redeems the refresh token once and replays the request; only if that
fails does it clear the session and bounce to `/login`. Concurrent 401s share a
single refresh rather than firing a burst.

**Live data.** `useDeviceSocket` opens one WebSocket for the whole authenticated
area (in the dashboard layout, shared through `ShellContext`). Browsers cannot
set headers on a WebSocket handshake, so the JWT travels as `?token=` and the
backend's `ws_auth.py` reads it there.

A push does not overwrite the query cache wholesale — it seeds the latest
readings and invalidates the derived queries. So if the socket drops, the app
degrades to ordinary polling instead of freezing, and the header badge switches
from **Live** to **Polling** so the operator can tell the difference between "no
devices are doing anything" and "this page stopped receiving updates".

Reconnection backs off exponentially to 30s, and a 30-second ping keeps proxies
from culling an idle socket.

**Data shape.** `lib/devicesApi.js` holds every backend path; pages never write
URLs inline. `lib/deviceStatus.js` trusts the backend's computed `live_status`
(`live` / `recovering` / `unsynced` / `offline`) rather than re-deriving status
on the client, with faults taking display priority.

## Production notes

- Set `NEXT_PUBLIC_API_URL` to the deployed API at build time — `NEXT_PUBLIC_*`
  values are inlined into the bundle, so changing it needs a rebuild.
- The frontend's own origin must appear in the backend's `ALLOWED_HOSTS`.
  `AllowedHostsOriginValidator` checks the WebSocket handshake's `Origin`
  against it, and rejects with a 403 that looks like an auth failure but is not.
- Set the backend's `CORS_ALLOW_ALL_ORIGINS=False` and list the frontend origin
  in `CORS_ALLOWED_ORIGINS`.

```bash
npm run build && npm run start
```
