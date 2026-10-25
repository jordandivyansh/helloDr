# Credential-only hosted demonstration

The hosted application supports tester access without requiring a ChatGPT account. The homepage and portal sign-in screen are reachable; protected clinic APIs still require an application session.

Two test identities exist:

- `parent@demo.local` — parent workflow, scoped to the demo family.
- `doctor@demo.local` — doctor workflow.

Passwords are supplied to the owner when configured. They are not written in source, this guide, or the browser bundle. Only salted scrypt hashes are stored as secret runtime values:

- `DEMO_PARENT_PASSWORD_HASH`
- `DEMO_DOCTOR_PASSWORD_HASH`

Each value uses `32 hexadecimal salt characters:128 hexadecimal hash characters`. The Worker refuses to start its API without configuration. On initialization the backend replaces old test-account hashes and revokes prior sessions when the hash changes. Unchanged hashes preserve current sessions. Old local-development passwords no longer authenticate online.

Hosted registration and one-click demo access are disabled. Previously created non-test accounts and their sessions cannot access hosted protected endpoints in this mode. Existing records are preserved; this change does not erase the database. Anyone given a shared role's credentials sees that role's accessible demo records and changes, so use fictional data only.

Local development keeps the familiar demo buttons and registration unless configured with `demoCredentials` explicitly. `demo` indicates fictional data; `quickDemo` separately controls quick-login buttons; `registrationOpen` describes whether registration is available.

The hosted rate limiter uses a conservative shared per-instance key rather than trusting a user-supplied identity header. It is still an in-memory per-instance limiter, not a globally coordinated abuse-control service.

To deploy safely: configure secret hashes, publish the credential-restricted version while the Site is owner-private, verify successful deployment, then change the Site audience to public. Here “public” applies to reaching the homepage/sign-in screen; application records remain protected. Do not expose an older version containing usable quick-login accounts.

Run `pnpm test` for the original clinic behavior and the additional tester-access regression test. The earlier training handbook describes a prior hosting snapshot; its owner-private ChatGPT gate explanation is superseded by this document after this version is published.
