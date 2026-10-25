# 5. Learn by changing the project

These exercises are not already implemented. Work on fictional local data, review your diff, and finish one lab before starting the next. Use a Git branch if you are comfortable with branches. Do not reset the database just to undo a UI experiment.

## Lab 1 — Change visible content

**Goal:** Change one landing-page sentence and see it locally.

1. Find the sentence in `app/page.tsx` using editor search or `rg`.
2. Change its wording without inventing a consultation fee, phone number, or medical claim.
3. Start development and refresh the page.
4. Inspect desktop and narrow mobile width.
5. Review the diff. Explain why neither an API nor a migration was needed.

**Pass condition:** Only intended text changed; layout still works. No new test is necessary for this low-impact wording exercise.

**Extension:** Find the page metadata in `app/layout.tsx`. Explain why browser title/search metadata and visible page text are separate.

## Lab 2 — Add a frontend appointment filter

**Goal:** Add a filter for one visit type using the appointments already loaded by the portal.

Use state for the selected type and combine it with existing filters rather than replacing them. A simplified pattern:

```tsx
const [visitType, setVisitType] = useState('all');
const visible = appointments.filter(appointment =>
  visitType === 'all' || appointment.type === visitType
);
```

Use a labeled native select. Existing exact types are `Well-child visit`, `Vaccination visit`, `Follow-up`, and `General consultation`. Resetting to `all` must restore the full applicable list.

**Pass condition:** It works for both roles without revealing any new records. Test the empty state. Run TypeScript checks and inspect the interface.

**Explain:** The API already scopes accessible records. This filter only narrows presentation; it is not a security boundary. Filtering an array of n appointments takes O(n) work for this pass. Future server-side filtering/pagination avoids transferring all records.

## Lab 3 — Change a business validation rule

**Goal:** Require at least 10 characters for appointment reasons instead of 3.

1. Find the appointment request schema in `server/app.mjs`.
2. Update the minimum and error message.
3. Update the form's corresponding client constraints/help text so the UX matches.
4. Add or adapt an integration test with a valid child and published future slot. Verify a 9-character reason fails and a 10-character reason succeeds.
5. Check existing test fixtures: short previously valid reasons may need updating.

**Pass condition:** Direct API calls cannot bypass the minimum. Errors are understandable in the UI. Tests and type checks pass.

**Explain:** HTML validation is convenience; server validation is authoritative. Why not require 10 characters only in the browser?

## Lab 4 — Add a scoped read-only endpoint

**Goal:** Add `GET /api/dashboard/summary`, returning counts per appointment status for the signed-in user's scope.

Inside `createApp`, place the route **after authentication middleware and before the fallback 404**. The following proposed code uses the existing `all` helper and `tenant` variable:

```js
app.get('/api/dashboard/summary', async (req, res) => {
  const isDoctor = req.user.role === 'doctor';
  const rows = await all(
    `SELECT status, COUNT(*) AS total
     FROM appointments
     WHERE tenant=? ${isDoctor ? '' : 'AND parent_id=?'}
     GROUP BY status`,
    tenant,
    ...(isDoctor ? [] : [req.user.id])
  );
  const counts = {
    scheduled: 0,
    'checked-in': 0,
    completed: 0,
    cancelled: 0
  };
  for (const row of rows) counts[row.status] = row.total;
  res.json({ counts });
});
```

The interpolated SQL fragment is selected by trusted code, not arbitrary user input. Values remain bound parameters. This is deliberately a counts endpoint; it does not leak child details.

Add a TypeScript response type in the frontend, call the endpoint, and display the counts. Avoid retaining two conflicting sources for the same dashboard metric.

**Tests to write:** unauthenticated 401; parent sees only their counts; doctor sees this clinic's counts; another tenant excluded; an empty result returns zeros. Use actual seeded/test-created rows rather than assuming permanent sample totals.

**Explain:** Why do the doctor and parent execute different scopes? Why should the frontend not send a trusted `parent_id`?

## Lab 5 — Add a persistent field carefully

**Goal:** Design an optional child nickname field. First write a change checklist; then implement on a disposable development database.

Changes needed:

1. Cloud schema in `db/schema.ts`, then generate a new migration with `pnpm db:generate`.
2. Local creation schema in `server/local-db.mjs` and a deliberate upgrade path for existing local databases.
3. Input validation with a sensible length limit and empty/default behavior.
4. Child insert/update behavior. Existing `INSERT INTO children VALUES(...)` depends on column order/count; convert affected statements to explicit column lists.
5. Local and hosted seed inserts, which must remain compatible.
6. `Child` TypeScript type and the form/display.
7. Tests covering omitted nickname, accepted nickname, excessive length, and an existing record after migration.

**Pass condition:** Existing children still load, new children save, both local and cloud schemas agree, and nickname changes do not affect ownership checks.

**Explain:** `CREATE TABLE IF NOT EXISTS` does not alter an existing table. A schema file is a desired definition; a migration is the operation that changes an existing database. Never edit an already-applied migration to pretend it was different historically.

## Lab 6 — Fix a concurrency issue

**Goal:** Prevent two status updates from both acting on the same stale appointment state.

Current sequence is read → validate transition → update by id/tenant. Use an optimistic conditional update:

```sql
UPDATE appointments
SET status = ?
WHERE id = ? AND tenant = ? AND status = ?;
```

The last parameter is the previously read status. If `changes` is zero, another operation changed the row first; return a conflict and ask the client to refresh. Preserve all existing ownership/role/transition checks.

**Tests:** Keep sequential transition tests. Add a controlled test where two operations read the same previous state before either writes; verify at most one succeeds. A plain `Promise.all` can be useful but may not reliably force the problematic interleaving. Test against the adapter behavior you intend to guarantee.

**Explain:** This is compare-and-set on persistent data. It protects the update's precondition. It does not by itself make the later audit insert atomic.

## Advanced project exercises

Choose these only after the core labs:

- Extract booking UI into a component without changing behavior; define its props clearly.
- Add server pagination with stable ordering and family/tenant filters.
- Add request IDs and structured error logs that omit sensitive content.
- Design multi-guardian authorization before adding another parent field.
- Design tenant resolution from a verified domain; never trust a client-provided tenant identifier alone.
- Add a notification outbox and worker so reminder delivery can retry independently.

## Your lab journal

For every change record:

```text
Problem:
Expected behavior:
Files changed:
Request/response or schema change:
Authorization preserved:
Checks run and actual result:
Known limitation:
How to undo safely:
```

This becomes evidence for interviews and client discussions. Real changes you can explain are more valuable than memorized technology lists.
