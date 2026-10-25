# Own and explain your Littleleaf project

This is your practical course for the code in `/Users/divyansh/Downloads/helloDr`. It assumes you know variables, functions, arrays, loops, and basic DSA, but are new to web development. Read a lesson, run its exercise, and explain the result aloud before moving on.

These notes describe the repository as inspected on 6 October 2026. They distinguish existing behavior from proposed improvements. The exercises are instructions for you; they have not been silently applied to the application.

## What you own today

Littleleaf is a working full-stack development MVP for Dr. Ruchi Lamyan's pediatric clinic at ATS Nobility, Greater Noida. It has a Next.js/React interface, an Express backend, and persistent storage. It supports the core relationship between a parent, a child, and a doctor across appointments and follow-up records.

| Capability | Actual state |
|---|---|
| Clinic website and responsive portal | Implemented; introductory Hindi content is partial, portal is English |
| Parent registration, login, child profiles | Implemented |
| Appointment availability, booking, cancellation | Implemented, with database protection against duplicate slot bookings |
| Doctor check-in, completion, notes, vaccine records | Implemented |
| Care assistant | Structured formatting of stored information; no AI model |
| Local data persistence | SQLite file |
| Hosted data persistence | D1 database, independent of your local data |
| Hosted demonstration | Owner-private Sites deployment; separate application login inside it |
| Mobile application | Not built; responsive website works on small screens |
| Payments, WhatsApp/SMS, teleconsultation, uploads | Not built |
| White-label clinic provisioning, domains, subscriptions | Planned; tenant columns alone do not implement this |
| Production medical use | Requires substantial security, clinical, operational, and product work |

The doctor's qualifications and experience come from the supplied project brief. They are not independently verified by this software. “Littleleaf” is a proposed brand.

## Your learning route

| Session | Read and do | You are ready to move on when… |
|---|---|---|
| 1 | [Foundations and architecture](01-foundations.md); start both servers | You can explain browser → API → database without reading |
| 2 | [Code and request walkthrough](02-code-walkthrough.md); inspect a request in DevTools | You can locate the UI, request helper, endpoint, and SQL for booking |
| 3 | [Data, security, and tests](03-data-security-tests.md); run tests | You can explain why hiding a button does not secure an endpoint |
| 4 | [Run, edit, debug, and host](04-operating-guide.md); reproduce local setup | You can distinguish build, start, deployment, and database migration |
| 5 | [Practice labs](05-practice-labs.md), labs 1–3 | You can change a feature and verify it without losing data |
| 6 | Practice labs 4–6 | You can add a scoped endpoint and explain a concurrency bug |
| 7 | [Clients and interviews](06-clients-and-interviews.md) | You can demonstrate the app and defend its design honestly |

Expect to repeat sessions. Completion means independently reproducing the behavior, not memorizing these notes. Use the [command and vocabulary sheet](CHEATSHEET.md) while working.

## First 30 minutes

1. Open a terminal and run:

   ```sh
   cd /Users/divyansh/Downloads/helloDr
   sh start-local.sh
   ```

2. Open `http://127.0.0.1:3000/portal`. Use the parent demo button. Only use fictional data.
3. Observe the existing children, pick an available future slot, and book a visit. The doctor can add slots if seeded availability has expired.
4. Refresh the page. The booking remains because it was saved in the database.
5. Sign out, use the doctor demo button, and inspect that appointment. Move it through check-in and completion. Publish a fictional follow-up note.
6. Return as the parent and find that note in the child's records.
7. Open `components/Portal.tsx`, `lib/api.ts`, and `server/app.mjs`. Search for `/appointments` in each relevant file. Follow one request, not the entire project at once.

Use a separate browser profile or private window if you want both roles open simultaneously. Two tabs in the same browser profile share the session cookie. Signing in as another user replaces it for both tabs.

## The first concept to master

A DSA function might transform an input array into an output array. A web feature is also a transformation, but the work crosses boundaries:

```text
Parent input
  → React collects form values
  → fetch sends an HTTP request
  → Express authenticates and validates it
  → SQL changes durable data
  → Express returns JSON
  → React displays the result
```

The browser is controlled by the user. Therefore, the backend must independently decide whether each action is allowed. The database must enforce important invariants even when two requests arrive together.

Your three most useful questions are: **Where is this value displayed? Where is it validated? Where is it stored?**

## Evidence and limits

Before this documentation work, the project had passed 13 backend integration tests, a TypeScript check, and a Next.js production build. Earlier browser checks covered parent booking, doctor note publication, and desktop/mobile rendering. Cloud emulation exercised authentication, persistent records, booking, cancellation, and the structured brief. The hosting platform reported a successful deployment.

That evidence is not a load test, medical compliance certification, full accessibility audit, or complete post-deployment browser test. These notes do not claim new test runs or production readiness.

Live private demonstration: [Littleleaf clinic](https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site). Access depends on the owner's Sites permissions. It is not a public patient launch.

## Repository map

```text
helloDr/
├── app/                       Page routes, layout, global styling
│   ├── page.tsx                Clinic landing page
│   ├── portal/page.tsx         Portal route
│   └── privacy/page.tsx        Development privacy notice
├── components/Portal.tsx       Parent and doctor interactive UI
├── lib/api.ts                 HTTP helper, types, date formatting
├── server/
│   ├── index.mjs              Starts local Express server
│   ├── app.mjs                Routes, auth, business rules
│   ├── local-db.mjs           Local SQLite schema/connection
│   └── api.test.mjs           Integration tests
├── db/schema.ts               Cloud schema expressed with Drizzle
├── drizzle/                   Generated cloud SQL migrations
├── hosting/                   Worker, D1 adapter, seed, build
├── scripts/dev.mjs            Starts both development processes
├── next.config.ts             Local API proxy / hosted static export
├── .env.example               Local configuration template
├── .openai/hosting.json        Sites project and database binding
├── data/                      Local database; ignored by Git
├── dist/                      Generated cloud build; do not edit
└── docs/training/              This course
```

If you forget where to start, return to booking. It demonstrates almost every important full-stack concept in this project.
