# 4. Run, edit, debug, and host the project

## Start on this computer

Dependencies are already installed. Run:

```sh
cd /Users/divyansh/Downloads/helloDr
sh start-local.sh
```

Open `http://127.0.0.1:3000/portal`. The launcher starts Next on port 3000 and Express on port 4000. Keep that terminal open. Press Ctrl+C there to stop both processes.

The launcher can find this computer's bundled Node runtime if your shell cannot find `node`. That fallback changes PATH only for its own process and children, not for future terminal commands.

For other commands in a terminal on this computer, if `node`/`pnpm` are missing:

```sh
export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
node --version
pnpm --version
```

Those paths are specific to this machine. On another computer, install Node 24+ and pnpm, then verify their versions. Node 24+ is required here because the backend uses `node:sqlite`.

## Fresh checkout setup

From the project directory, after installing the runtimes:

```sh
pnpm install --frozen-lockfile
```

Create `.env` from `.env.example` **only if `.env` does not already exist**. Do not overwrite your configuration casually:

```sh
if [ ! -f .env ]; then cp .env.example .env; fi
pnpm dev
```

The lockfile makes installation reproducible. Avoid switching package managers and committing multiple competing lockfiles. Some dependency declarations use `latest`; changing the lockfile can change installed versions. Treat upgrades as deliberate work.

## Configuration explained

| Variable | Local default/example | Meaning |
|---|---|---|
| `PORT` | `4000` | Express listening port |
| `API_URL` | `http://127.0.0.1:4000` | Next's local API forwarding target |
| `APP_ORIGIN` | `http://127.0.0.1:3000` | Exact browser origin allowed for writes |
| `DATABASE_PATH` | `./data/clinic.sqlite` | Local SQLite file |
| `DEMO_MODE` | `true` | Enable fictional seeded data/demo behavior |
| `CLINIC_ADMIN_EMAIL` | Your chosen account | Bootstrap doctor on fresh non-demo local DB |
| `CLINIC_ADMIN_PASSWORD` | Unique secret, at least 12 characters | Bootstrap credential |
| `COOKIE_SECURE` | `true` for HTTPS | Require secure cookie transport |

The local server loads `.env`; Next also reads its configuration environment. Restart after environment/config changes. Never put private keys or passwords in `NEXT_PUBLIC_*` variables: those are intended to be available to frontend code.

Setting `DEMO_MODE=false` is not a complete production launch. Use a fresh database and the bootstrap credentials for local non-demo evaluation. The existing hosted Worker explicitly runs a private demo; changing only a local `.env` does not change that deployment.

## Which command does what?

| Command | Purpose |
|---|---|
| `pnpm dev` | Both development servers with live development behavior |
| `pnpm dev:web` | Next development server only |
| `pnpm dev:api` | Express with Node watch mode only |
| `pnpm test` | Backend integration tests |
| `pnpm typecheck` | TypeScript compiler checks without emitting app output |
| `pnpm build:web` | Next production build for ordinary local Node serving |
| `pnpm start` | Serve that ordinary Next production build |
| `pnpm start:api` | Start Express normally |
| `pnpm build` | Build hosted static frontend and Worker bundle |
| `pnpm build:hosted` | Same hosted build |
| `pnpm db:generate` | Generate cloud SQL migrations from Drizzle schema changes |

With dependencies installed, `node --run typecheck`, `node --run test`, and `node --run build` are also usable when Node is available but pnpm is not.

**Build is not deployment.** `pnpm build` writes `dist/client` and `dist/server/index.js`. It does not publish a URL. Also, a hosted build is not the same artifact expected by `pnpm start`; use `pnpm build:web` first for ordinary Next production serving.

For a local production-style UI check, build with `pnpm build:web`, then run `pnpm start` in one terminal and `pnpm start:api` in another. Stop existing development listeners first. This is still local evaluation, not a production deployment or a realistic load test.

## Inspect a request without guessing

1. Open the portal and browser Developer Tools.
2. Select **Network**, then filter for `api` or Fetch/XHR.
3. Perform one action, such as choosing a booking date.
4. Inspect URL, method, status, request payload, and response.
5. Match the route to `server/app.mjs`.
6. If it fails, read the response error and server terminal before editing code.

In the Console, while signed into the local portal, this is a read-only request:

```js
await fetch('/api/appointments').then(response => response.json())
```

Do not paste unknown scripts into a logged-in browser. Do not share copied Cookie headers in screenshots, bug reports, or interview material.

Read-only terminal checks:

```sh
curl -i http://127.0.0.1:4000/api/health
curl -i http://127.0.0.1:3000/api/clinic
curl -i http://127.0.0.1:3000/api/appointments
```

The last request should return 401 without a session. The first tests the API directly; the second tests Next's proxy too. For manual POST/PATCH requests, the API requires an exact `Origin` header even if the caller is curl.

## Inspect local database counts safely

With Node 24+ on PATH and the local demo created:

```sh
node --input-type=module <<'JS'
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./data/clinic.sqlite', { readOnly: true });
console.table(db.prepare(`
  SELECT status, COUNT(*) AS total
  FROM appointments WHERE tenant = ? GROUP BY status
`).all('ruchi-lamyan'));
db.close();
JS
```

This prints aggregate state counts, not passwords or tokens. If `DATABASE_PATH` differs, use that path. Never query the `password` or session-token fields for demonstrations. Use database-aware backups and test restoration before real migrations; copying an active SQLite file without its WAL handling can produce an incomplete backup.

## Debug by layer

| Symptom | First checks |
|---|---|
| `node: command not found` | Launcher or runtime PATH instructions above |
| Port already in use | Find the existing terminal/server; stop that process rather than killing every Node process |
| Page opens but all API calls fail | Express running? Proxy target correct? Inspect `/api/health` |
| Login/write returns 403 | Exact browser host/port matches `APP_ORIGIN`? Or role restriction? Read error body |
| Session disappears | Cookie expiry, host mismatch, HTTPS/Secure configuration; two roles in same browser share cookies |
| No available slots | Date future? Slots already booked? Initial 21-day seed expired? Publish more as doctor |
| Booking returns 409 | Another request won, or the slot is already occupied |
| UI changed but live site unchanged | Local edit/build is not publication |
| Column missing after schema edit | Existing tables are not altered by `CREATE TABLE IF NOT EXISTS` |
| Hosted API returns 503 | Required APP_ORIGIN, DB binding, migrations, Worker startup logs |
| UI shows old data | Inspect API response; check refresh path and selected child; do not immediately blame CSS |

## Your repeatable editing workflow

1. Define the exact before/after behavior and affected role.
2. Check `git status --short`; understand existing changes.
3. Read the relevant component, endpoint, and schema before editing.
4. Make the smallest complete change.
5. For a wording/style change, inspect affected screens and mobile layout. For permission/data changes, add a meaningful integration test.
6. Run appropriate checks. A backend business-rule change usually needs `pnpm test`; TypeScript changes need `pnpm typecheck`; build/deployment changes need the appropriate build.
7. Review `git diff` and manually exercise the changed flow.
8. Commit intentionally. Keep `.env`, databases, generated output, and real patient records out of Git.

Useful read-only commands:

```sh
git status --short
git diff --stat
git diff
rg -n "appointment-booked" server
```

## Hosting: what was actually done

Current private URL: [Littleleaf](https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site).

The code was built into static assets and an Express Worker bundle. Sites provisioned the D1 binding named `DB`, applied schema migrations, and deployed the artifact. `.openai/hosting.json` ties this repository to that Site. The runtime `APP_ORIGIN` was set to the final HTTPS origin; this matters because the predicted initial domain differed from the deployed domain.

`hosting/worker.mjs` sends non-API paths to assets and API paths through Express. `hosting/seed.mjs` creates fresh fictional records in D1. It does not copy your local patient database. `hosting/database.mjs` adapts database calls. `hosting/build.mjs` packages the output and schema artifacts.

The generated Wrangler configuration contains a local-emulation database identifier. Do not treat it as your production database configuration. Actual Site bindings are managed by the hosting integration.

Publishing was performed through Codex's authenticated Sites workflow, including source versioning and deployment status checks. There is no project-defined `pnpm deploy` command. To publish another version in this setup, ask Codex to deploy the updated Site using that integration; the workflow should build, publish, and report its resulting status. A failed build must be fixed before publication. A successful local build alone is not evidence of a successful deployment.

No separate paid hosting account was configured for this private demonstration. That does not guarantee unlimited usage, free commercial operation, or permanent free hosting. Account access and platform limits still apply. Turning it into a public medical service is a separate launch task.

Code rollback and database rollback are different. A previous code version may not understand a new schema. Prefer compatible, additive migrations, verify backups, and plan deployment/rollback together. Do not delete the cloud database to fix an ordinary UI problem.
