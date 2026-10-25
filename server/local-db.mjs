import { careSchema } from './care-schema.mjs';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function createLocalDatabase(options = {}) {
  const dbPath = options.dbPath || process.env.DATABASE_PATH || './data/clinic.sqlite';
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('parent','doctor')), UNIQUE(tenant,email));
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS children(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, parent_id TEXT REFERENCES users(id), name TEXT NOT NULL, dob TEXT NOT NULL, sex TEXT NOT NULL, allergies TEXT NOT NULL DEFAULT '', created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS slots(tenant TEXT NOT NULL, day TEXT NOT NULL, time TEXT NOT NULL, PRIMARY KEY(tenant,day,time));
    CREATE TABLE IF NOT EXISTS appointments(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, child_id TEXT REFERENCES children(id), parent_id TEXT REFERENCES users(id), day TEXT NOT NULL, time TEXT NOT NULL, type TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('scheduled','checked-in','completed','cancelled')), created TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS one_booking_per_slot ON appointments(tenant,day,time) WHERE status != 'cancelled';
    CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, child_id TEXT REFERENCES children(id), doctor_id TEXT REFERENCES users(id), body TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS vaccines(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, child_id TEXT REFERENCES children(id), name TEXT NOT NULL, due TEXT NOT NULL, administered TEXT);
    CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, actor TEXT, action TEXT NOT NULL, resource TEXT, created TEXT NOT NULL);
  `);
  db.exec(careSchema);
  return db;
}
