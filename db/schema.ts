import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, primaryKey, check, index } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text().primaryKey(), tenant: text().notNull(), name: text().notNull(), email: text().notNull(), password: text().notNull(), role: text().notNull(),
}, t => [uniqueIndex('users_tenant_email').on(t.tenant,t.email), check('user_role',sql`${t.role} IN ('parent','doctor')`)]);
export const sessions = sqliteTable('sessions', {
  token: text().primaryKey(), user_id: text().references(()=>users.id), expires: integer().notNull(),
}, t => [index('sessions_user').on(t.user_id),index('sessions_expiry').on(t.expires)]);
export const children = sqliteTable('children', {
  id: text().primaryKey(), tenant: text().notNull(), parent_id: text().references(()=>users.id), name: text().notNull(), dob: text().notNull(), sex: text().notNull(), allergies: text().notNull().default(''), created: text().notNull(),
}, t => [index('children_tenant_parent').on(t.tenant,t.parent_id)]);
export const slots = sqliteTable('slots', {tenant:text().notNull(),day:text().notNull(),time:text().notNull()}, t => [primaryKey({columns:[t.tenant,t.day,t.time]})]);
export const appointments = sqliteTable('appointments', {
  id:text().primaryKey(),tenant:text().notNull(),child_id:text().references(()=>children.id),parent_id:text().references(()=>users.id),day:text().notNull(),time:text().notNull(),type:text().notNull(),reason:text().notNull(),status:text().notNull(),created:text().notNull(),
},t=>[uniqueIndex('one_booking_per_slot').on(t.tenant,t.day,t.time).where(sql`${t.status} != 'cancelled'`),index('appointments_parent').on(t.tenant,t.parent_id),check('appointment_status',sql`${t.status} IN ('scheduled','checked-in','completed','cancelled')`)]);
export const notes=sqliteTable('notes',{id:text().primaryKey(),tenant:text().notNull(),child_id:text().references(()=>children.id),doctor_id:text().references(()=>users.id),body:text().notNull(),created:text().notNull()},t=>[index('notes_child').on(t.tenant,t.child_id)]);
export const vaccines=sqliteTable('vaccines',{id:text().primaryKey(),tenant:text().notNull(),child_id:text().references(()=>children.id),name:text().notNull(),due:text().notNull(),administered:text()},t=>[index('vaccines_child').on(t.tenant,t.child_id)]);
export const audit=sqliteTable('audit',{id:text().primaryKey(),tenant:text().notNull(),actor:text(),action:text().notNull(),resource:text(),created:text().notNull()});
export const prescriptions=sqliteTable('prescriptions',{
 id:text().primaryKey(),tenant:text().notNull(),child_id:text().notNull().references(()=>children.id),doctor_id:text().notNull().references(()=>users.id),appointment_id:text().references(()=>appointments.id),
 status:text().notNull(),revision:integer().notNull().default(1),content:text().notNull(),created:text().notNull(),updated:text().notNull(),published:text(),void_reason:text(),
},t=>[index('prescriptions_child').on(t.tenant,t.child_id),check('prescription_status',sql`${t.status} IN ('draft','published','void')`)]);
export const invoices=sqliteTable('invoices',{
 id:text().primaryKey(),tenant:text().notNull(),child_id:text().notNull().references(()=>children.id),doctor_id:text().notNull().references(()=>users.id),appointment_id:text().references(()=>appointments.id),
 items:text().notNull(),discount_paise:integer().notNull(),total_paise:integer().notNull(),paid_paise:integer().notNull().default(0),payments:text().notNull().default('[]'),status:text().notNull(),revision:integer().notNull().default(1),created:text().notNull(),memo:text().notNull().default(''),void_reason:text(),
},t=>[index('invoices_child').on(t.tenant,t.child_id),check('invoice_status',sql`${t.status} IN ('issued','paid','void')`),check('invoice_discount',sql`${t.discount_paise}>=0`),check('invoice_total',sql`${t.total_paise}>0`),check('invoice_paid',sql`${t.paid_paise}>=0 AND ${t.paid_paise}<=${t.total_paise}`)]);
