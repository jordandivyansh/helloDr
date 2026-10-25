# Littleleaf desk reference

## Start and check

```sh
cd /Users/divyansh/Downloads/helloDr
sh start-local.sh
```

Open `http://127.0.0.1:3000/portal`. Ctrl+C stops the launcher. Use fictional demo data. If Node/pnpm are unavailable in your terminal, see [runtime setup](04-operating-guide.md).

```sh
pnpm test
pnpm typecheck
pnpm build:web     # Ordinary Next build
pnpm build         # Hosted bundle, not publication
git diff
```

## API map

| Method / path | Access and purpose |
|---|---|
| GET `/api/health` | Public liveness |
| GET `/api/clinic` | Public clinic configuration |
| POST `/api/auth/login` | Public credentials → session |
| POST `/api/auth/register` | Public parent registration + consent |
| GET `/api/auth/me` | Signed-in user |
| POST `/api/auth/logout` | Delete user's sessions |
| GET `/api/children` | Scoped child list |
| POST `/api/children` | Parent creates own child |
| GET `/api/appointments` | Scoped visit list |
| POST `/api/appointments` | Authorized child booking |
| PATCH `/api/appointments/:id` | Parent cancellation or doctor state change |
| GET `/api/slots?day=YYYY-MM-DD` | Signed-in availability lookup |
| POST `/api/slots` | Doctor publishes time |
| GET `/api/records/:childId` | Authorized child records |
| POST `/api/records/:childId/notes` | Doctor publishes note |
| POST `/api/records/:childId/vaccines` | Doctor enters vaccine plan |
| PATCH `/api/vaccines/:id` | Doctor records administration |
| POST `/api/assistant/brief` | Doctor requests deterministic summary |

POST/PATCH bodies are JSON. Writes require matching Origin. Private routes require the session cookie. Some reads also create audit events.

## Vocabulary

| Term | Meaning in this project |
|---|---|
| Component | React function describing part of the UI |
| State | Values React remembers for the current interface |
| Effect | Work synchronized with component state/lifecycle |
| API endpoint | URL and HTTP method handled by the backend |
| Middleware | Request stage before/around an endpoint |
| Validation | Is the submitted value acceptable? |
| Authentication | Who is the caller? |
| Authorization | May this caller do this action on this resource? |
| Tenant | Clinic boundary for configuration and records |
| Primary key | Unique record identifier |
| Foreign key | Link to another table's record |
| Index | Database structure supporting lookup or constraints |
| Invariant | Rule that must remain true |
| Race condition | Correctness depends on competing operations' timing |
| Transaction | Group of operations committed atomically within supported semantics |
| Migration | Versioned change to existing database schema |
| Seed | Initial sample/configuration records |
| Adapter | Converts one dependency's interface to another |
| Build | Transform source into runnable/deliverable artifacts |
| Deployment | Publish and run a version in a hosting environment |
| Environment variable | Runtime/build configuration outside ordinary source |
| Idempotency | Repeating a request does not duplicate its intended effect |

## Never confuse these

- Responsive web UI ≠ native mobile app.
- Tenant columns ≠ complete multi-tenant SaaS.
- Structured brief ≠ AI model integration.
- TypeScript type ≠ runtime validation.
- Hidden button ≠ server authorization.
- Build success ≠ deployment success.
- Test pass ≠ proof of production capacity or compliance.
- Local database ≠ hosted database.

Start again at [the course index](START-HERE.md).
