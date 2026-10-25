import { createApp } from './app.mjs';
import { createLocalDatabase } from './local-db.mjs';
try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const { app } = await createApp({ db: createLocalDatabase() });
const server = app.listen(Number(process.env.PORT || 4000), '127.0.0.1');
server.on('listening', () => console.log('Clinic API ready on http://127.0.0.1:' + (process.env.PORT || 4000)));
server.on('error', error => { console.error('Unable to start clinic API:', error.message); process.exitCode = 1; });
