import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync, randomBytes } from 'node:crypto';
import { createApp } from './app.mjs';
import { createLocalDatabase } from './local-db.mjs';

function credential(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

test('hosted tester access rejects defaults, signup, and old sessions while preserving role checks', async () => {
  const db = createLocalDatabase({dbPath: ':memory:'});
  let server;
  try {
    const original = await createApp({db, demo:true, test:true});
    server = original.app.listen(0,'127.0.0.1');
    await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
    let base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (path, body, cookie) => {
      const result = await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
      return {status:result.status,body:await result.json(),cookie:result.headers.get('set-cookie')?.split(';')[0]};
    };
    const old = await request('/auth/login',{email:'parent@demo.local',password:'ParentDemo!2026'});
    const stranger = await request('/auth/register',{name:'Existing outsider',email:'outside@example.test',password:'OutsideTest!Password',consent:true});
    await new Promise(resolve=>server.close(resolve));
    const hashes = {parent:credential('NewParent!Test2026'),doctor:credential('NewDoctor!Test2026')};
    const restricted = await createApp({db,demo:true,test:true,hostedDemo:true,demoCredentials:hashes});
    server=restricted.app.listen(0,'127.0.0.1');
    await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
    base=`http://127.0.0.1:${server.address().port}/api`;
    const clinic = await request('/clinic');
    assert.equal(clinic.body.demo,true);
    assert.equal(clinic.body.quickDemo,false);
    assert.equal(clinic.body.registrationOpen,false);
    assert.equal((await request('/auth/login',{email:'parent@demo.local',password:'ParentDemo!2026'})).status,401);
    assert.equal((await request('/auth/login',{email:'doctor@demo.local',password:'ClinicDemo!2026'})).status,401);
    assert.equal((await request('/children',null,old.cookie)).status,401);
    assert.equal((await request('/children',null,stranger.cookie)).status,401);
    assert.equal((await request('/auth/login',{email:'outside@example.test',password:'OutsideTest!Password'})).status,401);
    assert.equal((await request('/auth/register',{name:'New visitor',email:'new@example.test',password:'NewTest!Password2026',consent:true})).status,403);
    const parent = await request('/auth/login',{email:'parent@demo.local',password:'NewParent!Test2026'});
    const doctor = await request('/auth/login',{email:'doctor@demo.local',password:'NewDoctor!Test2026'});
    assert.equal(parent.status,200); assert.equal(parent.body.role,'parent');
    assert.equal(doctor.status,200); assert.equal(doctor.body.role,'doctor');
    assert.equal((await request('/children',null,parent.cookie)).status,200);
    assert.equal((await request('/assistant/brief',{appointment_id:'apt-1'},parent.cookie)).status,403);
    assert.equal((await request('/assistant/brief',{appointment_id:'apt-1'},doctor.cookie)).status,200);
    // A cold start with unchanged secrets must not log out active testers.
    await createApp({db,demo:true,test:true,hostedDemo:true,demoCredentials:hashes});
    assert.equal((await request('/auth/me',null,parent.cookie)).status,200);
    await assert.rejects(createApp({db,demo:true,demoCredentials:{parent:'bad',doctor:'bad'}}),/valid demo credential hashes/);
  } finally {
    if(server?.listening)await new Promise(resolve=>server.close(resolve));
    db.close();
  }
});
