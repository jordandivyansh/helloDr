import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from './app.mjs';
import {createLocalDatabase} from './local-db.mjs';
import {selectPrescriptionSection} from './parent-assistant.mjs';
let db,server,base,parent,doctor,stranger,rx,invoice,modelCalls=0,lastPayload;
const content={assessment:'Fictional assessment',registration_number:'DEMO',medicines:[{name:'DEMO medicine - not for use',dose:'Clinician-entered sample amount',frequency:'Clinician-entered sample frequency',duration:'Clinician-entered sample duration',route:'Sample route',instructions:'Fictional instructions',purpose:'Purpose recorded by clinician'}],advice:'Sample follow-up instructions.',follow_up:''};
const ask=async(path,body,cookie=doctor,method=body?'POST':'GET')=>{const r=await fetch(base+'/api'+path,{method,headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
before(async()=>{
 db=createLocalDatabase({dbPath:':memory:'});
 const {app}=await createApp({db,demo:true,test:true,parentAI:{apiKey:'test-only',model:'test-model',fetcher:async(_url,options)=>{modelCalls++;lastPayload=JSON.parse(options.body);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({section:'purpose',medicine_index:0})}]}]}),{headers:{'Content-Type':'application/json'}});}}});
 server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});base='http://127.0.0.1:'+server.address().port;
 parent=(await ask('/auth/login',{email:'parent@demo.local',password:'ParentDemo!2026'},null)).cookie;
 doctor=(await ask('/auth/login',{email:'doctor@demo.local',password:'ClinicDemo!2026'},null)).cookie;
 stranger=(await ask('/auth/register',{name:'Other family',email:'care-other@example.test',password:'OtherFamily!2026',consent:true},null)).cookie;
});
after(async()=>{if(server?.listening)await new Promise(resolve=>server.close(resolve));db?.close();});
test('prescription drafts are staff-only and publishing freezes the reviewed revision',async()=>{
 assert.equal((await ask('/prescriptions',{child_id:'child-aarav',content},parent)).status,403);
 assert.equal((await ask('/prescriptions',{child_id:'child-aarav',content:{...content,medicines:[{name:'Missing dose'}]}})).status,400);
 let r=await ask('/prescriptions',{child_id:'child-aarav',appointment_id:'apt-2',content});assert.equal(r.status,400);
 r=await ask('/prescriptions',{child_id:'child-aarav',content});assert.equal(r.status,201);rx=r.data;
 assert.equal((await ask('/prescriptions/'+rx.id,null,parent)).status,404);
 assert.equal((await ask('/prescriptions',null,parent)).data.length,0);
 assert.equal((await ask('/prescriptions/'+rx.id+'/publish',{revision:rx.revision,confirm:false})).status,400);
 r=await ask('/prescriptions/'+rx.id,{revision:rx.revision,content:{...content,advice:'Reviewed instructions'}},doctor,'PATCH');assert.equal(r.status,200);rx=r.data;
 assert.equal((await ask('/prescriptions/'+rx.id+'/publish',{revision:1,confirm:true})).status,409);
 r=await ask('/prescriptions/'+rx.id+'/publish',{revision:rx.revision,confirm:true});assert.equal(r.status,200);rx=r.data;
 assert.equal((await ask('/prescriptions/'+rx.id,null,parent)).status,200);
 assert.equal((await ask('/prescriptions/'+rx.id,null,stranger)).status,404);
 assert.equal((await ask('/prescriptions/'+rx.id,{revision:rx.revision,content},doctor,'PATCH')).status,409);
});
test('invoice totals are server computed; cross-family reads and parent writes are denied',async()=>{
 const input={child_id:'child-aarav',items:[{description:'Test service',quantity:2,unit_paise:10025}],discount_paise:50};
 assert.equal((await ask('/invoices',input,parent)).status,403);
 assert.equal((await ask('/invoices',{...input,discount_paise:99999})).status,400);
 assert.equal((await ask('/invoices',{...input,items:[{description:'Bad fraction',quantity:1,unit_paise:1.1}]})).status,400);
 const r=await ask('/invoices',{...input,total_paise:1,paid_paise:999});assert.equal(r.status,201);invoice=r.data;
 assert.equal(invoice.total_paise,20000);assert.equal(invoice.paid_paise,0);
 assert.equal((await ask('/invoices/'+invoice.id,null,parent)).status,200);
 assert.equal((await ask('/invoices/'+invoice.id,null,stranger)).status,404);
 assert.deepEqual((await ask('/invoices',null,stranger)).data,[]);
});
test('payments reject overpayment, enforce optimistic concurrency, and are retry-idempotent',async()=>{
 const payment={revision:1,request_id:randomUUID(),amount_paise:10000,method:'upi',reference:'Demo receipt'};
 assert.equal((await ask('/invoices/'+invoice.id+'/payments',payment,parent)).status,403);
 assert.equal((await ask('/invoices/'+invoice.id+'/payments',{...payment,amount_paise:20001})).status,409);
 const results=await Promise.all([ask('/invoices/'+invoice.id+'/payments',payment),ask('/invoices/'+invoice.id+'/payments',{...payment,request_id:randomUUID()})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const winner=results.find(r=>r.status===200).data;
 const original=winner.payments[0];
 assert.equal((await ask('/invoices/'+invoice.id+'/payments',{...payment,request_id:original.id})).data.paid_paise,10000);
 assert.equal((await ask('/invoices/'+invoice.id+'/payments',{...payment,request_id:original.id,amount_paise:1})).status,409);
 assert.equal((await ask('/invoices/'+invoice.id+'/void',{revision:winner.revision,reason:'Cannot void paid'})).status,409);
 const r=await ask('/invoices/'+invoice.id+'/payments',{...payment,revision:winner.revision,request_id:randomUUID()});assert.equal(r.status,200);assert.equal(r.data.status,'paid');assert.equal(r.data.balance_paise,0);
});
test('parent assistant needs ownership and consent; AI receives only question and medicine names',async()=>{
 const query={prescription_id:rx.id,question:'What purpose was recorded?',use_ai:true,consent:true,language:'en'};
 assert.equal((await ask('/parent-assistant',query,stranger)).status,404);
 assert.equal((await ask('/parent-assistant',query,doctor)).status,403);
 assert.equal((await ask('/parent-assistant',{...query,consent:false},parent)).status,400);
 assert.equal(modelCalls,0);
 let r=await ask('/parent-assistant',query,parent);assert.equal(r.status,200);assert.equal(r.data.mode,'ai-guided');assert.equal(r.data.sections[0].text,content.medicines[0].purpose);
 assert.equal(modelCalls,1);assert.equal(lastPayload.store,false);
 assert.deepEqual(Object.keys(JSON.parse(lastPayload.input)).sort(),['medicine_names','question']);
 assert.ok(!JSON.stringify(lastPayload).includes('Aarav'));
 r=await ask('/parent-assistant',{...query,use_ai:false,consent:false,question:'Explain this prescription'},parent);assert.equal(r.data.mode,'record-reader');assert.ok(r.data.sections[0].text.includes(content.medicines[0].dose));
 r=await ask('/parent-assistant',{...query,use_ai:false,question:'Can I double the dose?'},parent);assert.equal(r.data.sections[0].label,'Ask your doctor');
});
test('voided prescriptions stay visible as void but cannot be explained',async()=>{
 const r=await ask('/prescriptions/'+rx.id+'/void',{revision:rx.revision,reason:'Fictional correction required'});assert.equal(r.status,200);
 assert.equal((await ask('/prescriptions/'+rx.id,null,parent)).data.status,'void');
 assert.equal((await ask('/parent-assistant',{prescription_id:rx.id,question:'Explain this prescription'},parent)).status,404);
});
test('tenant scoping applies to new document reads',async()=>{
 const inv=await ask('/invoices',{child_id:'child-aarav',items:[{description:'Foreign test',quantity:1,unit_paise:100}]});
 db.prepare('UPDATE invoices SET tenant=? WHERE id=?').run('another-clinic',inv.data.id);
 assert.equal((await ask('/invoices/'+inv.data.id,null,doctor)).status,404);
});
test('AI routing rejects malformed, failed and ungrounded provider responses',async()=>{
 for(const payload of [{status:'incomplete'}, {status:'completed',output:[{content:[{type:'output_text',text:'{"section":"medicines","medicine_index":19}'}]}]}, {status:'completed',output:[{content:[{type:'output_text',text:'{"section":"invented","medicine_index":0}'}]}]}]){
  await assert.rejects(selectPrescriptionSection({question:'Explain',medicines:content.medicines,apiKey:'test',model:'test',fetcher:async()=>new Response(JSON.stringify(payload))}));
 }
});
