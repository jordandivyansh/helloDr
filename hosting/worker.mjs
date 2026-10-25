import { httpServerHandler } from 'cloudflare:node';
import { createApp } from '../server/app.mjs';
import { cloudDatabase } from './database.mjs';
import { seedDemo } from './seed.mjs';
let application;
async function initialise(env) {
  const origin=env.APP_ORIGIN;
  if (!origin || !origin.startsWith('https://')) throw new Error('Hosted APP_ORIGIN must be configured.');
  if (!env.DEMO_PARENT_PASSWORD_HASH || !env.DEMO_DOCTOR_PASSWORD_HASH) throw new Error('Test credentials must be configured.');
  await seedDemo(env.DB);
  const {app}=await createApp({db:cloudDatabase(env.DB),demo:true,skipSeed:true,hostedDemo:true,demoCredentials:{parent:env.DEMO_PARENT_PASSWORD_HASH,doctor:env.DEMO_DOCTOR_PASSWORD_HASH},secureCookies:true,origin,parentAI:{apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL},debugErrors:env.CLINIC_DEBUG_ERRORS==='true'});
  app.listen(3000);
  return httpServerHandler({port:3000});
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    // The website is reachable without platform login. Express requires the
    // owner's test credentials for all patient/doctor data and disables signup.
    try {
      application ||= initialise(env).catch(error=>{application=undefined;throw error;});
      const handler=await application;
      return await handler.fetch(request,env,ctx);
    } catch(error) {
      console.error('Clinic hosting error',error.message);
      return Response.json({error:'The clinic service is temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  },
};
