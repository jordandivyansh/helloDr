import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
const result=process.argv.includes('--reuse-export') ? {status:0} : spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',env:{...process.env,CLINIC_HOSTED_BUILD:'true'}});
if(result.status!==0)process.exit(result.status||1);
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await cp('.next-hosted','dist/client',{recursive:true});
// Publish only the handbook's HTML and browser assets, never local scripts or data.
await mkdir('dist/client/guide',{recursive:true});
for (const name of await readdir('docs/training/html')) {
  if (name.endsWith('.html')) await cp(`docs/training/html/${name}`,`dist/client/guide/${name}`);
}
await cp('docs/training/html/assets','dist/client/guide/assets',{recursive:true,filter:source=>!source.split('/').pop().startsWith('.')});
await build({entryPoints:['hosting/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'node',target:'es2022',external:['cloudflare:*','node:*'],banner:{js:"import { createRequire } from 'node:module'; const require = createRequire('/worker.js');"},define:{'process.env.NODE_ENV':'"production"'},minify:true});
await mkdir('dist/.openai',{recursive:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'littleleaf-clinic',main:'index.js',compatibility_date:'2026-09-01',compatibility_flags:['nodejs_compat'],assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},d1_databases:[{binding:'DB',database_name:'littleleaf-local',database_id:'local-only',migrations_dir:'../../drizzle'}]},null,2));
console.log('Hosted Next.js assets and Express Worker built with persistent D1 storage.');
