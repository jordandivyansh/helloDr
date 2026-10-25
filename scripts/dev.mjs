import { spawn } from 'node:child_process';
const children = [spawn(process.execPath, ['--watch', 'server/index.mjs'], { stdio: 'inherit' }), spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], { stdio: 'inherit' })];
let closing = false;
function close(code = 0) { if (closing) return; closing = true; children.forEach(p => p.kill()); setTimeout(() => process.exit(code), 200); }
children.forEach(p => p.on('exit', code => close(code || 0)));
process.on('SIGINT', () => close()); process.on('SIGTERM', () => close());
