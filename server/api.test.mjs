import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, todayIST, addDays } from './app.mjs';
import { createLocalDatabase } from './local-db.mjs';

let app, db, server, base, parentCookie, doctorCookie, strangerCookie;
async function request(path, { method='GET', body, cookie, origin='http://127.0.0.1:3000' }={}) {
  const res = await fetch(base + '/api' + path, { method, headers: { 'Content-Type':'application/json', Origin:origin, ...(cookie?{Cookie:cookie}:{}) }, ...(body ? {body:JSON.stringify(body)}:{}) });
  return { status:res.status, data:await res.json(), cookie:res.headers.get('set-cookie')?.split(';')[0] };
}
before(async()=>{
  ({app,db}=await createApp({db:createLocalDatabase({dbPath:':memory:'}),demo:true,test:true}));
  server=app.listen(0,'127.0.0.1'); await new Promise((resolve,reject)=>{server.on('listening',resolve);server.on('error',reject);}); base=`http://127.0.0.1:${server.address().port}`;
  parentCookie=(await request('/auth/login',{method:'POST',body:{email:'parent@demo.local',password:'ParentDemo!2026'}})).cookie;
  doctorCookie=(await request('/auth/login',{method:'POST',body:{email:'doctor@demo.local',password:'ClinicDemo!2026'}})).cookie;
  strangerCookie=(await request('/auth/register',{method:'POST',body:{name:'Another Parent',email:'other@example.test',password:'AnotherPassword!2026',consent:true}})).cookie;
});
after(async()=>{if(server?.listening) await new Promise(resolve=>server.close(resolve));db?.close();});
test('authentication is required for patient records',async()=>{
  assert.equal((await request('/children')).status,401);
  assert.equal((await request('/auth/me',{cookie:parentCookie})).data.role,'parent');
});
test('invalid credentials cannot sign in',async()=>{
  assert.equal((await request('/auth/login',{method:'POST',body:{email:'parent@demo.local',password:'wrong'}})).status,401);
});
test('cross-origin writes are rejected',async()=>{
  assert.equal((await request('/children',{method:'POST',cookie:parentCookie,origin:'https://untrusted.example',body:{}})).status,403);
});
test('parents cannot access another family or clinician endpoints',async()=>{
  assert.deepEqual((await request('/children',{cookie:strangerCookie})).data,[]);
  assert.equal((await request('/records/child-aarav',{cookie:strangerCookie})).status,404);
  assert.equal((await request('/records/child-aarav/notes',{method:'POST',cookie:parentCookie,body:{body:'Not an authorised clinical note'}})).status,403);
  assert.equal((await request('/slots',{method:'POST',cookie:parentCookie,body:{day:addDays(todayIST(),2),time:'18:00'}})).status,403);
  assert.equal((await request('/assistant/brief',{method:'POST',cookie:parentCookie,body:{appointment_id:'apt-1'}})).status,403);
});
test('child date validation rejects future and impossible dates',async()=>{
  for(const dob of ['2099-01-01','2024-02-31','not-a-date']) assert.equal((await request('/children',{method:'POST',cookie:parentCookie,body:{name:'Test Child',dob,sex:'female'}})).status,400);
});
test('booking is persistent, conflict-safe and family scoped; cancellation releases slot',async()=>{
  const day=addDays(todayIST(),2), body={child_id:'child-aarav',day,time:'09:00',type:'Follow-up',reason:'A routine follow-up question.'};
  assert.equal((await request('/appointments',{method:'POST',cookie:strangerCookie,body})).status,404);
  const results=await Promise.all([request('/appointments',{method:'POST',cookie:parentCookie,body}),request('/appointments',{method:'POST',cookie:parentCookie,body})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  const id=results.find(r=>r.status===201).data.id;
  assert.ok((await request('/appointments',{cookie:parentCookie})).data.some(a=>a.id===id));
  assert.ok(!(await request('/slots?day='+day,{cookie:parentCookie})).data.includes('09:00'));
  assert.equal((await request('/appointments/'+id,{method:'PATCH',cookie:strangerCookie,body:{status:'cancelled'}})).status,404);
  assert.equal((await request('/appointments/'+id,{method:'PATCH',cookie:parentCookie,body:{status:'completed'}})).status,403);
  assert.equal((await request('/appointments/'+id,{method:'PATCH',cookie:parentCookie,body:{status:'cancelled'}})).status,200);
  assert.ok((await request('/slots?day='+day,{cookie:parentCookie})).data.includes('09:00'));
});
test('unpublished and past slots cannot be booked',async()=>{
  for(const [day,time] of [[addDays(todayIST(),2),'03:00'],['2020-01-01','09:00']]) assert.equal((await request('/appointments',{method:'POST',cookie:parentCookie,body:{child_id:'child-aarav',day,time,type:'Follow-up',reason:'A routine follow-up.'}})).status,400);
});
test('appointment state transitions cannot skip check-in or reopen completed visits',async()=>{
  const patch=status=>request('/appointments/apt-1',{method:'PATCH',cookie:doctorCookie,body:{status}});
  assert.equal((await patch('completed')).status,409);
  assert.equal((await patch('checked-in')).status,200);
  assert.equal((await patch('completed')).status,200);
  assert.equal((await patch('cancelled')).status,409);
});
test('doctor notes are visible to the correct parent and auditable',async()=>{
  const body='Please bring the previous records to the next visit.';
  const res=await request('/records/child-aarav/notes',{method:'POST',cookie:doctorCookie,body:{body}}); assert.equal(res.status,201);
  assert.ok((await request('/records/child-aarav',{cookie:parentCookie})).data.notes.some(n=>n.body===body));
  assert.ok(db.prepare("SELECT id FROM audit WHERE action='note-published' AND resource=?").get(res.data.id));
});
test('vaccine administration is clinician-only and cannot be future-dated',async()=>{
  const plan=await request('/records/child-aarav/vaccines',{method:'POST',cookie:doctorCookie,body:{name:'Test record',due:todayIST()}}); assert.equal(plan.status,201);
  const path='/vaccines/'+plan.data.id;
  assert.equal((await request(path,{method:'PATCH',cookie:parentCookie,body:{administered:todayIST()}})).status,403);
  assert.equal((await request(path,{method:'PATCH',cookie:doctorCookie,body:{administered:'2099-01-01'}})).status,400);
  assert.equal((await request(path,{method:'PATCH',cookie:doctorCookie,body:{administered:todayIST()}})).status,200);
});
test('assistant is transparent about its structured mode and preserves source text',async()=>{
  const result=await request('/assistant/brief',{method:'POST',cookie:doctorCookie,body:{appointment_id:'apt-1'}});
  assert.equal(result.data.mode,'structured-preview');
  assert.equal(result.data.sections.find(s=>s.label==='Parent-reported concern').text,'Routine check-up and questions about sleep.');
});
test('record reads are also constrained by tenant',async()=>{
  db.prepare('INSERT INTO children VALUES(?,?,?,?,?,?,?,?)').run('other-tenant-child','different-clinic','parent-demo','Other Clinic Child','2022-01-01','female','',new Date().toISOString());
  assert.equal((await request('/records/other-tenant-child',{cookie:doctorCookie})).status,404);
  assert.ok(!(await request('/children',{cookie:doctorCookie})).data.some(c=>c.id==='other-tenant-child'));
});
test('logout invalidates the session',async()=>{
  assert.equal((await request('/auth/logout',{method:'POST',cookie:strangerCookie,body:{}})).status,200);
  assert.equal((await request('/auth/me',{cookie:strangerCookie})).status,401);
});
