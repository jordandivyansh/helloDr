// Keep application queries shared between local SQLite and cloud D1.
export function cloudDatabase(binding) {
  return { prepare(sql) { return {
    async run(...params) { const result = await binding.prepare(sql).bind(...params).run(); return {changes:result.meta.changes}; },
    async get(...params) { return binding.prepare(sql).bind(...params).first(); },
    async all(...params) { return (await binding.prepare(sql).bind(...params).all()).results; },
  }; } };
}
