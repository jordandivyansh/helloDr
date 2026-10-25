// Additive schema shared by local startup and the corresponding cloud migration.
export const careSchema = `
CREATE TABLE IF NOT EXISTS prescriptions (
 id TEXT PRIMARY KEY, tenant TEXT NOT NULL, child_id TEXT NOT NULL REFERENCES children(id),
 doctor_id TEXT NOT NULL REFERENCES users(id), appointment_id TEXT REFERENCES appointments(id),
 status TEXT NOT NULL CHECK(status IN ('draft','published','void')), revision INTEGER NOT NULL DEFAULT 1,
 content TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL, published TEXT, void_reason TEXT
);
CREATE INDEX IF NOT EXISTS prescriptions_child ON prescriptions(tenant,child_id);
CREATE TABLE IF NOT EXISTS invoices (
 id TEXT PRIMARY KEY, tenant TEXT NOT NULL, child_id TEXT NOT NULL REFERENCES children(id),
 doctor_id TEXT NOT NULL REFERENCES users(id), appointment_id TEXT REFERENCES appointments(id),
 items TEXT NOT NULL, discount_paise INTEGER NOT NULL CHECK(discount_paise>=0),
 total_paise INTEGER NOT NULL CHECK(total_paise>0), paid_paise INTEGER NOT NULL DEFAULT 0 CHECK(paid_paise>=0 AND paid_paise<=total_paise),
 payments TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL CHECK(status IN ('issued','paid','void')),
 revision INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, memo TEXT NOT NULL DEFAULT '', void_reason TEXT
);
CREATE INDEX IF NOT EXISTS invoices_child ON invoices(tenant,child_id);
`;
