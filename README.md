# Littleleaf — Dr. Ruchi Lamyan’s clinic

**[Live app](https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site)** · **[Doctor / Parent login](https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site/portal)** · **[Project guide](https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site/guide/)**

A working full-stack development MVP for a pediatric practice at **ATS Nobility, Greater Noida**. “Littleleaf” is a proposed identity; doctor credentials are based on the supplied brief and must be approved before publication. Next.js/React/TypeScript frontend, separate Express/Node.js REST backend, persistent SQLite database.

## Learn and maintain this project

Start with the [beginner training course](docs/training/START-HERE.md): architecture diagrams, a booking code walkthrough, database/security explanations, exact local commands, hosting notes, six editing labs, and client/interview preparation. The [desk reference](docs/training/CHEATSHEET.md) summarizes commands, endpoints, and vocabulary.

Prefer a visual handbook? Open [the interlinked HTML edition](docs/training/html/index.html) in a browser. It includes colorful diagrams, searchable chapters, an interactive booking walkthrough, review questions, and print styles. See its [opening and maintenance instructions](docs/training/html/README.md); it runs independently of the clinic app.

## Hosted demonstration

Hosted demonstration: https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site

The Sites deployment retains the Next.js UI and the same Express API. Next.js exports the frontend assets; Express runs through Cloudflare's Node-compatible HTTP adapter, with a durable D1 database replacing the local SQLite file. The hosted tester-access mode uses application-level parent/doctor credentials instead of a ChatGPT sign-in gate. The clinic homepage is reachable; records and actions require the supplied test credentials. No local patient database, account sessions, or `.env` files are uploaded. The cloud database starts with fresh fictional demonstration records.

`pnpm build` (or `node hosting/build.mjs`) creates `dist/client` and `dist/server/index.js`. The logical database binding is declared in `.openai/hosting.json`; Sites provisions the real database and applies the generated schema migrations in `drizzle/`. The bundled Wrangler configuration is for local emulation only. Set `APP_ORIGIN` in the Sites runtime to the exact live HTTPS origin; it is required for the API to start and for cross-origin write protection. Database migrations contain schema only, and fictional seed records are inserted transactionally at first use.

The hosted demo requires secret-configured password hashes for the two test accounts, disables public registration and quick-login buttons, and rejects other account sessions. Password changes revoke previous test-account sessions. Ordinary Node production deployments still refuse demo mode. This remains a fictional-data demonstration, not a patient launch; launch readiness remains as described below. Local and hosted databases are independent.

## Run locally

Requires **Node.js 24+** (uses `node:sqlite`) and pnpm. npm also works with the package scripts.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Open **http://127.0.0.1:3000**. The backend listens at **http://127.0.0.1:4000**. Next.js proxies `/api/*` to the backend so sessions stay same-origin. Use the exact `APP_ORIGIN` hostname; `localhost` and `127.0.0.1` are different origins.

On this computer, dependencies are already installed. Run `sh start-local.sh` to start both processes; the launcher also finds the bundled Node runtime if Node is not on your shell PATH. Stop any existing preview servers before restarting on the same ports.

The first development start automatically seeds fictional demo data. Parent and doctor demo buttons appear on `/portal`. Sample availability is seeded for 21 days from the first start; the doctor can publish additional slots in Clinic settings.

| Account | Email | Password |
|---|---|---|
| Doctor demo | doctor@demo.local | ClinicDemo!2026 |
| Parent demo | parent@demo.local | ParentDemo!2026 |

Do not enter real patient data into this demo. Data persists in `data/clinic.sqlite`, which is ignored by Git. Stop both servers and remove this directory only when you intend to reset your local demonstration data.

Hosted credentials are supplied privately by the owner; the defaults in the table above apply only to local development. See [tester access](docs/testing-access.md) for configuration and behavior.

## Implemented

- Responsive clinic website with English/Hindi introductory content, services, doctor profile and location link. Hindi coverage is partial; the portal is English.
- Parent registration with preview consent, sign-in, salted scrypt password hashes, HTTP-only sessions, logout and role-based access.
- Parent-owned child profiles, date validation and allergy fields.
- Published appointment availability, IST date/time handling, transactional database uniqueness for slot conflicts, cancellation, doctor check-in and completion.
- Parent and doctor dashboards, search/filtering, child records and live counts from the API.
- Clinician-published follow-up notes, manually entered vaccination plans and administration records.
- Doctor availability management, account details and preview privacy notice.
- Source-linked pre-visit briefs assembled from existing records. **This is deterministic formatting, not an AI model.** No medical recommendations are generated or external data transmitted.
- Server-side family/role/tenant scoping, prepared SQL, input validation, request rate limits, origin checks for cookie-authenticated writes, security headers, session expiration and basic access/change audit events.

- Prescription drafts, clinician review/publication, immutable published records, void history and printable documents.
- Itemized INR invoices, discounts, partial/full manual payment records and printable receipts.
- Parent prescription reader with English/Hindi explanations of fields; optional OpenAI intent routing with explicit consent. See [billing, prescriptions and assistant guide](docs/billing-prescriptions.md).

## Validation

```sh
pnpm test
pnpm typecheck
pnpm build:web
```

API integration tests use an in-memory database and exercise authentication, family/tenant access, origin checks, date validation, competing bookings, cancellation, clinical role restrictions, state transitions, audit records, vaccination administration and logout.

Verified locally: production build and TypeScript check passed, all 21 API/assistant tests passed, and browser checks covered parent sign-in/booking, doctor sign-in/note publication, and desktop/mobile rendering. A preview screenshot is saved at `docs/clinic-dashboard.jpg`.

## Structure

```text
app/                 Next.js App Router: website, portal, privacy
components/          Brand, illustration, interactive portal
lib/api.ts           Typed frontend API client and IST formatting
server/app.mjs       Express API, business rules, authentication and local demo seed
server/local-db.mjs  Local SQLite connection and creation schema
db/schema.ts        Cloud schema used to generate Drizzle migrations
hosting/            Worker, D1 adapter, hosted seed and build
server/index.mjs     API process entry point
server/api.test.mjs  Node integration tests
scripts/dev.mjs      Starts and stops both development processes
```

## API overview

Public: `GET /api/health`, `GET /api/clinic`, `POST /api/auth/login`, `POST /api/auth/register`.

Authenticated: `GET /api/auth/me`, `POST /api/auth/logout`, `GET/POST /api/children`, `GET/POST /api/appointments`, `PATCH /api/appointments/:id`, `GET /api/slots?day=YYYY-MM-DD`, `GET /api/records/:childId`.

Doctor only: `POST /api/slots`, `POST /api/records/:childId/notes`, `POST /api/records/:childId/vaccines`, `PATCH /api/vaccines/:id`, `POST /api/assistant/brief`.

For POST/PATCH requests send JSON and an `Origin` matching `APP_ORIGIN`. The web client uses the HTTP-only `clinic_session` cookie. Never accept an arbitrary tenant ID from client input.

## Production and commercial roadmap

This is a functional **single-clinic development MVP**, not a certified or launch-ready medical system. Tenant columns and scoped queries prepare for expansion, but there is no tenant provisioning, domain routing or cross-clinic administration yet. SQLite is suitable for local evaluation and a single process; move to PostgreSQL, managed backups, migrations and shared session/rate-limit infrastructure before horizontal scaling.

Before production:

1. Approve the practice identity, qualifications, registration number, exact clinic address, clinic contact, appointment duration, operating hours and consultation fee. No fee or phone number has been fabricated.
2. Replace demo data using a **fresh database**. Set `DEMO_MODE=false`, `CLINIC_ADMIN_EMAIL`, a unique `CLINIC_ADMIN_PASSWORD` (12+ characters), the HTTPS `APP_ORIGIN`, `COOKIE_SECURE=true` and `NODE_ENV=production`. Production deliberately refuses demo mode and databases containing demo users. Build the web app and run its server and the API as separate managed services behind HTTPS; the API should not be publicly exposed.
3. Complete clinician-reviewed privacy/consent workflows, guardian authority and adolescent access rules, retention/deletion/export processes, encryption at rest, incident response, restore testing, staff MFA, verified email/phone, password reset and security review. The preview privacy page explicitly states its limitations.
4. Integrate payment provider/UPI webhooks, transactional messaging with consent, appointment reminders and delivery tracking. Online payment collection, prescription e-signatures, uploads, growth charts, teleconsultation, ABHA/ABDM and automated vaccination schedules are not implemented.
5. For AI, select an approved provider with suitable data terms, introduce minimum necessary record retrieval, clinical evaluation, redaction and clinician review; replace the structured preview only after testing. Never present generated medical advice as approved care.
6. Extract branding and specialty settings into tenant configuration; add clinic/domain provisioning, tenant-isolation testing, subscription billing, migrations, observability, background queues, service levels and operations tooling.
7. Add mobile applications against the same versioned backend after defining mobile session and identity flows. No mobile app is included yet.

The interface uses Google Fonts with system fallbacks. Optional AI sends the parent’s question and medicine names only after consent; it is disabled without server configuration. Payment and messaging services are not integrated.
