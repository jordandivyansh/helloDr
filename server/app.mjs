import { installCareRoutes } from './care-routes.mjs';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';
const tenant = 'ruchi-lamyan';
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function addDays(date, n) { return new Date(new Date(date + 'T12:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10); }
const hash = value => createHash('sha256').update(value).digest('hex');
function passwordHash(value) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(value, salt, 64).toString('hex')}`; }
function verifyPassword(value, stored) { const [salt, key] = stored.split(':'); return timingSafeEqual(scryptSync(value, salt, 64), Buffer.from(key, 'hex')); }
const text = z.string().trim().min(1).max(160);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const parsed = new Date(v + 'T12:00:00Z'); return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v; }, 'Invalid date');
const email = z.email().max(200).transform(v => v.toLowerCase());
export async function createApp(options = {}) {
    const demo = options.demo ?? (process.env.DEMO_MODE === 'true' || (process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false'));
    const restrictedDemo = Boolean(options.demoCredentials);
    if (restrictedDemo && !['parent', 'doctor'].every(role => /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(options.demoCredentials[role] || '')))
        throw new Error('Configure valid demo credential hashes before enabling tester access.');
    if (process.env.NODE_ENV === 'production' && demo && !(options.hostedDemo && restrictedDemo))
        throw new Error('Demo mode is not permitted in production.');
    const db = options.db;
    if (!db)
        throw new Error('A database adapter is required.');
    const run = (sql, ...params) => db.prepare(sql).run(...params);
    const get = (sql, ...params) => db.prepare(sql).get(...params);
    const all = (sql, ...params) => db.prepare(sql).all(...params);
    const audit = async (actor, action, resource) => await run('INSERT INTO audit VALUES(?,?,?,?,?,?)', randomUUID(), tenant, actor, action, resource, new Date().toISOString());
    const addUser = async (id, name, mail, pass, role) => await run('INSERT INTO users VALUES(?,?,?,?,?,?)', id, tenant, name, mail, passwordHash(pass), role);
    if (demo && !options.skipSeed && !await get('SELECT id FROM users WHERE tenant=?', tenant)) {
        await addUser('doctor-demo', 'Dr. Ruchi Lamyan', 'doctor@demo.local', 'ClinicDemo!2026', 'doctor');
        await addUser('parent-demo', 'Ananya Sharma', 'parent@demo.local', 'ParentDemo!2026', 'parent');
        const day = todayIST();
        const kids = [['child-aarav', 'Aarav Sharma', '2022-04-12', 'male', 'No known allergies'], ['child-meera', 'Meera Sharma', '2024-08-21', 'female', 'No known allergies']];
        for (const kid of kids)
            await run('INSERT INTO children VALUES(?,?,?,?,?,?,?,?)', kid[0], tenant, 'parent-demo', ...kid.slice(1), new Date().toISOString());
        for (let i = 0; i < 21; i++)
            for (const time of ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '16:00', '16:30', '17:00', '17:30'])
                await run('INSERT OR IGNORE INTO slots VALUES(?,?,?)', tenant, addDays(day, i), time);
        for (const [id, child, offset, time, type, reason] of [['apt-1', 'child-aarav', 1, '10:00', 'Well-child visit', 'Routine check-up and questions about sleep.'], ['apt-2', 'child-meera', 0, '16:00', 'Vaccination visit', 'Review vaccination record with the doctor.']])
            await run('INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?)', id, tenant, child, 'parent-demo', addDays(day, offset), time, type, reason, 'scheduled', new Date().toISOString());
        await run('INSERT INTO notes VALUES(?,?,?,?,?,?)', 'note-demo', tenant, 'child-aarav', 'doctor-demo', 'Sample follow-up note: Please bring previous health records to the next appointment. This is fictional demonstration data.', new Date().toISOString());
        await run('INSERT INTO vaccines VALUES(?,?,?,?,?,?)', 'vaccine-demo', tenant, 'child-meera', 'Vaccination record review (demo)', addDays(day, 7), null);
    }
    if (!demo && !await get("SELECT id FROM users WHERE tenant=? AND role='doctor'", tenant)) {
        const admin = z.object({ email, password: z.string().min(12).max(128) }).safeParse({ email: process.env.CLINIC_ADMIN_EMAIL, password: process.env.CLINIC_ADMIN_PASSWORD });
        if (!admin.success)
            throw new Error('Set CLINIC_ADMIN_EMAIL and a CLINIC_ADMIN_PASSWORD of at least 12 characters before starting without demo mode.');
        await addUser(randomUUID(), 'Dr. Ruchi Lamyan', admin.data.email, admin.data.password, 'doctor');
    }
    if (!demo && await get("SELECT id FROM users WHERE id='doctor-demo'"))
        throw new Error('Use a fresh database when disabling demo mode.');
    if (restrictedDemo) {
        for (const role of ['parent', 'doctor']) {
            const id = role + '-demo';
            const changed = await run('UPDATE users SET password=? WHERE id=? AND tenant=? AND password!=?', options.demoCredentials[role], id, tenant, options.demoCredentials[role]);
            if (changed.changes) await run('DELETE FROM sessions WHERE user_id=?', id);
        }
    }
    const allowedDemoUser = user => !restrictedDemo || ['parent-demo', 'doctor-demo'].includes(user?.id);
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet());
    app.use(express.json({ limit: '32kb' }));
    const origin = options.origin || process.env.APP_ORIGIN || 'http://127.0.0.1:3000';
    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== origin)
            return res.status(403).json({ error: 'Request origin not allowed.' });
        next();
    });
    const rateLimitKey = options.hostedDemo ? { keyGenerator: () => 'hosted-demo' } : {};
    app.use('/api', rateLimit({ ...rateLimitKey, windowMs: 60000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
    app.use('/api/auth', rateLimit({ ...rateLimitKey, windowMs: 15 * 60000, limit: options.test ? 1000 : 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please try again later.' } }));
    app.get('/api/health', (_, res) => res.json({ ok: true }));
    app.get('/api/clinic', (_, res) => res.json({ name: 'Dr. Ruchi Lamyan', brand: 'Littleleaf', location: 'ATS Nobility, Greater Noida', qualification: 'MBBS, MD · Gold Medalist', demo, quickDemo: demo && !restrictedDemo, registrationOpen: !restrictedDemo, timezone: 'Asia/Kolkata' }));
    const validate = schema => (req, res, next) => { const result = schema.safeParse(req.body); if (!result.success)
        return res.status(400).json({ error: result.error.issues[0]?.message || 'Invalid input.' }); req.input = result.data; next(); };
    const session = async (res, user) => { const token = randomBytes(32).toString('hex'); await run('DELETE FROM sessions WHERE expires < ?', Date.now()); await run('INSERT INTO sessions VALUES(?,?,?)', hash(token), user.id, Date.now() + 8 * 60 * 60 * 1000); res.cookie('clinic_session', token, { httpOnly: true, sameSite: 'lax', secure: options.secureCookies || process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/' }); };
    const publicUser = user => ({ id: user.id, name: user.name, role: user.role, email: user.email });
    app.post('/api/auth/login', validate(z.object({ email, password: z.string().min(1).max(128) })), async (req, res) => {
        const user = await get('SELECT * FROM users WHERE tenant=? AND email=?', tenant, req.input.email);
        if (!user || !allowedDemoUser(user) || !verifyPassword(req.input.password, user.password))
            return res.status(401).json({ error: 'Email or password is incorrect.' });
        await session(res, user);
        await audit(user.id, 'login', user.id);
        res.json(publicUser(user));
    });
    app.post('/api/auth/register', validate(z.object({ name: text, email, password: z.string().min(12, 'Use at least 12 characters for your password.').max(128), consent: z.literal(true, 'Please accept the account privacy notice.') })), async (req, res) => {
        if (restrictedDemo) return res.status(403).json({ error: 'This demonstration is invite-only. Use the test credentials supplied by the owner.' });
        if (await get('SELECT id FROM users WHERE tenant=? AND email=?', tenant, req.input.email))
            return res.status(409).json({ error: 'An account already exists with this email.' });
        const id = randomUUID();
        await addUser(id, req.input.name, req.input.email, req.input.password, 'parent');
        await audit(id, 'account-consent', 'privacy-v1');
        const user = await get('SELECT * FROM users WHERE id=?', id);
        await session(res, user);
        res.status(201).json(publicUser(user));
    });
    app.use('/api', async (req, res, next) => {
        const token = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('clinic_session='))?.slice(15);
        const user = token && await get('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.tenant=?', hash(token), Date.now(), tenant);
        if (!user || !allowedDemoUser(user))
            return res.status(401).json({ error: 'Please sign in to continue.' });
        req.user = user;
        next();
    });
    const doctor = (req, res, next) => req.user.role === 'doctor' ? next() : res.status(403).json({ error: 'Clinic staff access required.' });
    const childAccess = async (req, id) => await get(`SELECT * FROM children WHERE id=? AND tenant=? ${req.user.role === 'doctor' ? '' : 'AND parent_id=?'}`, id, tenant, ...(req.user.role === 'doctor' ? [] : [req.user.id]));
    app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));
    app.post('/api/auth/logout', async (req, res) => { await run('DELETE FROM sessions WHERE user_id=?', req.user.id); res.clearCookie('clinic_session', { path: '/' }); res.json({ ok: true }); });
    app.get('/api/children', async (req, res) => res.json(await all(`SELECT c.*, u.name AS parent_name FROM children c JOIN users u ON u.id=c.parent_id WHERE c.tenant=? ${req.user.role === 'doctor' ? '' : 'AND c.parent_id=?'} ORDER BY c.name`, tenant, ...(req.user.role === 'doctor' ? [] : [req.user.id]))));
    app.post('/api/children', validate(z.object({ name: text, dob: date.refine(v => v <= todayIST(), 'Date of birth cannot be in the future.'), sex: z.enum(['female', 'male', 'other']), allergies: z.string().trim().max(1000).default('') })), async (req, res) => {
        if (req.user.role !== 'parent')
            return res.status(403).json({ error: 'Child profiles must be created by their parent.' });
        const id = randomUUID();
        const v = req.input;
        await run('INSERT INTO children VALUES(?,?,?,?,?,?,?,?)', id, tenant, req.user.id, v.name, v.dob, v.sex, v.allergies, new Date().toISOString());
        await audit(req.user.id, 'child-created', id);
        res.status(201).json({ id });
    });
    app.get('/api/appointments', async (req, res) => res.json(await all(`SELECT a.*, c.name AS child_name, c.dob, u.name AS parent_name FROM appointments a JOIN children c ON c.id=a.child_id JOIN users u ON u.id=a.parent_id WHERE a.tenant=? ${req.user.role === 'doctor' ? '' : 'AND a.parent_id=?'} ORDER BY a.day,a.time`, tenant, ...(req.user.role === 'doctor' ? [] : [req.user.id]))));
    app.get('/api/slots', async (req, res) => {
        const parsed = date.safeParse(req.query.day);
        if (!parsed.success)
            return res.status(400).json({ error: 'Choose a valid date.' });
        res.json((await all(`SELECT s.time FROM slots s WHERE s.tenant=? AND s.day=? AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.tenant=s.tenant AND a.day=s.day AND a.time=s.time AND a.status!='cancelled') ORDER BY s.time`, tenant, parsed.data)).filter(s => new Date(`${parsed.data}T${s.time}:00+05:30`).getTime() > Date.now()).map(s => s.time));
    });
    app.post('/api/appointments', validate(z.object({ child_id: text, day: date, time: z.string().regex(/^\d{2}:\d{2}$/), type: z.enum(['Well-child visit', 'Vaccination visit', 'Follow-up', 'General consultation']), reason: z.string().trim().min(3, 'Please briefly describe the reason for your visit.').max(2000) })), async (req, res) => {
        const v = req.input, child = await childAccess(req, v.child_id);
        if (!child)
            return res.status(404).json({ error: 'Child profile not found.' });
        if (new Date(`${v.day}T${v.time}:00+05:30`).getTime() <= Date.now())
            return res.status(400).json({ error: 'Choose a future appointment.' });
        if (!await get('SELECT time FROM slots WHERE tenant=? AND day=? AND time=?', tenant, v.day, v.time))
            return res.status(400).json({ error: 'This time is not available.' });
        const id = randomUUID();
        try {
            await run('INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?)', id, tenant, child.id, child.parent_id, v.day, v.time, v.type, v.reason, 'scheduled', new Date().toISOString());
        }
        catch (error) {
            if (String(error.message).includes('UNIQUE'))
                return res.status(409).json({ error: 'This slot was just booked. Please select another time.' });
            throw error;
        }
        await audit(req.user.id, 'appointment-booked', id);
        res.status(201).json({ id });
    });
    app.patch('/api/appointments/:id', validate(z.object({ status: z.enum(['checked-in', 'completed', 'cancelled']) })), async (req, res) => {
        const apt = await get('SELECT * FROM appointments WHERE id=? AND tenant=?', req.params.id, tenant);
        if (!apt || (req.user.role !== 'doctor' && apt.parent_id !== req.user.id))
            return res.status(404).json({ error: 'Appointment not found.' });
        if (req.user.role !== 'doctor' && req.input.status !== 'cancelled')
            return res.status(403).json({ error: 'Clinic staff access required.' });
        const allowed = { scheduled: ['checked-in', 'cancelled'], 'checked-in': ['completed', 'cancelled'], completed: [], cancelled: [] };
        if (!allowed[apt.status].includes(req.input.status))
            return res.status(409).json({ error: 'This appointment can no longer be changed to that status.' });
        await run('UPDATE appointments SET status=? WHERE id=? AND tenant=?', req.input.status, apt.id, tenant);
        await audit(req.user.id, 'appointment-' + req.input.status, apt.id);
        res.json({ ok: true });
    });
    app.get('/api/records/:childId', async (req, res) => {
        if (!await childAccess(req, req.params.childId))
            return res.status(404).json({ error: 'Child profile not found.' });
        await audit(req.user.id, 'record-viewed', req.params.childId);
        res.json({ notes: await all('SELECT * FROM notes WHERE tenant=? AND child_id=? ORDER BY created DESC', tenant, req.params.childId), vaccines: await all('SELECT * FROM vaccines WHERE tenant=? AND child_id=? ORDER BY due', tenant, req.params.childId) });
    });
    app.post('/api/records/:childId/notes', doctor, validate(z.object({ body: z.string().trim().min(5).max(10000) })), async (req, res) => {
        if (!await childAccess(req, req.params.childId))
            return res.status(404).json({ error: 'Child profile not found.' });
        const id = randomUUID();
        await run('INSERT INTO notes VALUES(?,?,?,?,?,?)', id, tenant, req.params.childId, req.user.id, req.input.body, new Date().toISOString());
        await audit(req.user.id, 'note-published', id);
        res.status(201).json({ id });
    });
    app.post('/api/records/:childId/vaccines', doctor, validate(z.object({ name: text, due: date })), async (req, res) => {
        if (!await childAccess(req, req.params.childId))
            return res.status(404).json({ error: 'Child profile not found.' });
        const id = randomUUID();
        await run('INSERT INTO vaccines VALUES(?,?,?,?,?,?)', id, tenant, req.params.childId, req.input.name, req.input.due, null);
        await audit(req.user.id, 'vaccine-plan-created', id);
        res.status(201).json({ id });
    });
    app.patch('/api/vaccines/:id', doctor, validate(z.object({ administered: date.refine(v => v <= todayIST(), 'Administration date cannot be in the future.') })), async (req, res) => {
        const result = await run('UPDATE vaccines SET administered=? WHERE id=? AND tenant=? AND administered IS NULL', req.input.administered, req.params.id, tenant);
        if (!result.changes)
            return res.status(404).json({ error: 'Pending vaccine record not found.' });
        await audit(req.user.id, 'vaccine-administered', req.params.id);
        res.json({ ok: true });
    });
    app.post('/api/slots', doctor, validate(z.object({ day: date.refine(v => v >= todayIST(), 'Choose today or a future date.'), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/) })), async (req, res) => { await run('INSERT OR IGNORE INTO slots VALUES(?,?,?)', tenant, req.input.day, req.input.time); await audit(req.user.id, 'slot-created', req.input.day + ' ' + req.input.time); res.status(201).json({ ok: true }); });
    app.post('/api/assistant/brief', doctor, validate(z.object({ appointment_id: text })), async (req, res) => {
        const apt = await get('SELECT a.*, c.name, c.dob, c.allergies FROM appointments a JOIN children c ON c.id=a.child_id WHERE a.id=? AND a.tenant=?', req.input.appointment_id, tenant);
        if (!apt)
            return res.status(404).json({ error: 'Appointment not found.' });
        await audit(req.user.id, 'brief-generated', apt.id);
        res.json({ mode: 'structured-preview', title: 'Pre-visit brief', disclaimer: 'Structured record summary, not AI-generated. No clinical inference. Review the source records.', sections: [{ label: 'Patient', text: `${apt.name} · Date of birth: ${apt.dob}` }, { label: 'Visit', text: `${apt.type} · ${apt.day}, ${apt.time} IST` }, { label: 'Parent-reported concern', text: apt.reason }, { label: 'Recorded allergies', text: apt.allergies || 'Not recorded — confirm with parent.' }], source: `Appointment ${apt.id}` });
    });
    installCareRoutes(app, {db, tenant, doctor, validate, childAccess, audit, options});
    app.use('/api', (_, res) => res.status(404).json({ error: 'Endpoint not found.' }));
    app.use((error, req, res, next) => { if (error.type === 'entity.parse.failed')
        return res.status(400).json({ error: 'Invalid JSON.' }); if (error.type === 'entity.too.large')
        return res.status(413).json({ error: 'Request is too large.' }); console.error('API error:', error.code || error.name, options.debugErrors ? error.stack : ''); res.status(500).json({ error: 'Something went wrong. Please try again.' }); });
    return { app, db };
}
