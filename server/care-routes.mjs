import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { selectPrescriptionSection, prescriptionExplanation } from './parent-assistant.mjs';

const short=z.string().trim().min(1).max(200);
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;});
const medicine=z.object({name:short,dose:short,frequency:short,duration:short,route:short,instructions:z.string().trim().max(500).default(''),purpose:z.string().trim().max(500).default('')});
const rxContent=z.object({assessment:z.string().trim().max(2000).default(''),medicines:z.array(medicine).min(1).max(20),advice:z.string().trim().max(3000).default(''),follow_up:z.union([day,z.literal('')]).default(''),registration_number:z.string().trim().max(100).default('')});
const revision=z.number().int().positive();
const money=z.number().int().min(0).max(100000000);
const invoiceInput=z.object({child_id:short,appointment_id:short.nullable().optional(),items:z.array(z.object({description:short,quantity:z.number().int().min(1).max(100),unit_paise:money})).min(1).max(20),discount_paise:money.default(0),memo:z.string().trim().max(1000).default('')});
const decodeRx=r=>r?{...r,content:JSON.parse(r.content)}:null;
const decodeInvoice=r=>r?{...r,items:JSON.parse(r.items),payments:JSON.parse(r.payments),balance_paise:r.status==='void'?0:r.total_paise-r.paid_paise}:null;
export function installCareRoutes(app,{db,tenant,doctor,validate,childAccess,audit,options}) {
 const run=(sql,...p)=>db.prepare(sql).run(...p),get=(sql,...p)=>db.prepare(sql).get(...p),all=(sql,...p)=>db.prepare(sql).all(...p);
 const ai=options.parentAI||{apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL};
 const aiEnabled=Boolean(ai.apiKey&&ai.model);
 const access=async(req,table,id)=>{
  const r=await get(`SELECT t.*, c.name AS child_name, c.dob, u.name AS doctor_name FROM ${table} t JOIN children c ON c.id=t.child_id JOIN users u ON u.id=t.doctor_id WHERE t.id=? AND t.tenant=? AND c.tenant=?`,id,tenant,tenant);
  if(!r||!await childAccess(req,r.child_id)|| (table==='prescriptions'&&req.user.role!=='doctor'&&r.status==='draft'))return null;
  return r;
 };
 const visitValid=async(child,id)=>!id||Boolean(await get('SELECT id FROM appointments WHERE id=? AND child_id=? AND tenant=?',id,child,tenant));
 app.get('/api/care/capabilities',(_,res)=>res.json({ai_enabled:aiEnabled,ai_provider:aiEnabled?'OpenAI':null,reader_enabled:true}));
 app.get('/api/prescriptions',async(req,res)=>{
  const rows=await all(`SELECT p.*,c.name AS child_name,c.dob,u.name AS doctor_name FROM prescriptions p JOIN children c ON c.id=p.child_id JOIN users u ON u.id=p.doctor_id WHERE p.tenant=? AND c.tenant=? ${req.user.role==='doctor'?'':"AND c.parent_id=? AND p.status!='draft'"} ORDER BY p.created DESC`,tenant,tenant,...(req.user.role==='doctor'?[]:[req.user.id]));
  res.json(rows.map(decodeRx));
 });
 app.get('/api/prescriptions/:id',async(req,res)=>{
  const row=await access(req,'prescriptions',req.params.id);if(!row)return res.status(404).json({error:'Prescription not found.'});
  await audit(req.user.id,'prescription-viewed',row.id);res.json(decodeRx(row));
 });
 app.post('/api/prescriptions',doctor,validate(z.object({child_id:short,appointment_id:short.nullable().optional(),content:rxContent})),async(req,res)=>{
  const v=req.input;if(!await childAccess(req,v.child_id))return res.status(404).json({error:'Child profile not found.'});
  if(!await visitValid(v.child_id,v.appointment_id))return res.status(400).json({error:'Choose a visit for this child.'});
  const id=randomUUID(),now=new Date().toISOString();
  await run("INSERT INTO prescriptions(id,tenant,child_id,doctor_id,appointment_id,status,content,created,updated) VALUES(?,?,?,?,?,'draft',?,?,?)",id,tenant,v.child_id,req.user.id,v.appointment_id||null,JSON.stringify(v.content),now,now);
  await audit(req.user.id,'prescription-drafted',id);res.status(201).json(decodeRx(await access(req,'prescriptions',id)));
 });
 app.patch('/api/prescriptions/:id',doctor,validate(z.object({revision,content:rxContent})),async(req,res)=>{
  const r=await access(req,'prescriptions',req.params.id);if(!r)return res.status(404).json({error:'Prescription not found.'});
  const result=await run("UPDATE prescriptions SET content=?,revision=revision+1,updated=? WHERE id=? AND tenant=? AND status='draft' AND revision=?",JSON.stringify(req.input.content),new Date().toISOString(),r.id,tenant,req.input.revision);
  if(!result.changes)return res.status(409).json({error:'This draft changed or was already published. Reload before editing.'});
  await audit(req.user.id,'prescription-updated',r.id);res.json(decodeRx(await access(req,'prescriptions',r.id)));
 });
 app.post('/api/prescriptions/:id/publish',doctor,validate(z.object({revision,confirm:z.literal(true)})),async(req,res)=>{
  const r=decodeRx(await access(req,'prescriptions',req.params.id));if(!r)return res.status(404).json({error:'Prescription not found.'});
  if(!r.content.registration_number)return res.status(400).json({error:'Enter your clinician registration number before publishing. Use DEMO in fictional testing.'});
  const now=new Date().toISOString();
  const result=await run("UPDATE prescriptions SET status='published',revision=revision+1,published=?,updated=? WHERE id=? AND tenant=? AND status='draft' AND revision=?",now,now,r.id,tenant,req.input.revision);
  if(!result.changes)return res.status(409).json({error:'This prescription has changed or is no longer a draft.'});
  await audit(req.user.id,'prescription-published',r.id);res.json(decodeRx(await access(req,'prescriptions',r.id)));
 });
 app.post('/api/prescriptions/:id/void',doctor,validate(z.object({revision,reason:z.string().trim().min(5).max(500)})),async(req,res)=>{
  const r=await access(req,'prescriptions',req.params.id);if(!r)return res.status(404).json({error:'Prescription not found.'});
  const result=await run("UPDATE prescriptions SET status='void',void_reason=?,revision=revision+1,updated=? WHERE id=? AND tenant=? AND status='published' AND revision=?",req.input.reason,new Date().toISOString(),r.id,tenant,req.input.revision);
  if(!result.changes)return res.status(409).json({error:'Only the current published prescription can be voided.'});
  await audit(req.user.id,'prescription-voided',r.id);res.json(decodeRx(await access(req,'prescriptions',r.id)));
 });
 app.get('/api/invoices',async(req,res)=>res.json((await all(`SELECT i.*,c.name AS child_name,c.dob,u.name AS doctor_name FROM invoices i JOIN children c ON c.id=i.child_id JOIN users u ON u.id=i.doctor_id WHERE i.tenant=? AND c.tenant=? ${req.user.role==='doctor'?'':'AND c.parent_id=?'} ORDER BY i.created DESC`,tenant,tenant,...(req.user.role==='doctor'?[]:[req.user.id]))).map(decodeInvoice)));
 app.get('/api/invoices/:id',async(req,res)=>{
  const r=await access(req,'invoices',req.params.id);if(!r)return res.status(404).json({error:'Invoice not found.'});
  await audit(req.user.id,'invoice-viewed',r.id);res.json(decodeInvoice(r));
 });
 app.post('/api/invoices',doctor,validate(invoiceInput),async(req,res)=>{
  const v=req.input;if(!await childAccess(req,v.child_id))return res.status(404).json({error:'Child profile not found.'});
  if(!await visitValid(v.child_id,v.appointment_id))return res.status(400).json({error:'Choose a visit for this child.'});
  const total=v.items.reduce((sum,x)=>sum+x.quantity*x.unit_paise,0)-v.discount_paise;
  if(!Number.isSafeInteger(total)||total<=0||total>100000000)return res.status(400).json({error:'Total after discount must be between ₹0.01 and ₹10,00,000.'});
  const id=randomUUID();
  await run("INSERT INTO invoices(id,tenant,child_id,doctor_id,appointment_id,items,discount_paise,total_paise,status,created,memo) VALUES(?,?,?,?,?,?,?,?,'issued',?,?)",id,tenant,v.child_id,req.user.id,v.appointment_id||null,JSON.stringify(v.items),v.discount_paise,total,new Date().toISOString(),v.memo);
  await audit(req.user.id,'invoice-issued',id);res.status(201).json(decodeInvoice(await access(req,'invoices',id)));
 });
 app.post('/api/invoices/:id/payments',doctor,validate(z.object({revision,request_id:z.uuid(),amount_paise:money.refine(v=>v>0),method:z.enum(['cash','upi','card','bank']),reference:z.string().trim().max(100).default('')})),async(req,res)=>{
  const r=decodeInvoice(await access(req,'invoices',req.params.id));if(!r)return res.status(404).json({error:'Invoice not found.'});
  const v=req.input,duplicate=r.payments.find(p=>p.id===v.request_id);
  if(duplicate){if(duplicate.amount_paise!==v.amount_paise||duplicate.method!==v.method||duplicate.reference!==v.reference)return res.status(409).json({error:'This payment reference was already used for different details.'});return res.json(r);}
  if(r.status!=='issued'||v.amount_paise>r.balance_paise)return res.status(409).json({error:'Payment exceeds the balance, or this invoice is closed.'});
  const paid=r.paid_paise+v.amount_paise;
  const payment={id:v.request_id,amount_paise:v.amount_paise,method:v.method,reference:v.reference,recorded_by:req.user.id,created:new Date().toISOString()};
  const result=await run("UPDATE invoices SET paid_paise=?,payments=?,status=?,revision=revision+1 WHERE id=? AND tenant=? AND status='issued' AND revision=?",paid,JSON.stringify([...r.payments,payment]),paid===r.total_paise?'paid':'issued',r.id,tenant,v.revision);
  if(!result.changes)return res.status(409).json({error:'The invoice changed. Reload before recording payment.'});
  await audit(req.user.id,'payment-recorded',r.id);res.json(decodeInvoice(await access(req,'invoices',r.id)));
 });
 app.post('/api/invoices/:id/void',doctor,validate(z.object({revision,reason:z.string().trim().min(5).max(500)})),async(req,res)=>{
  const r=await access(req,'invoices',req.params.id);if(!r)return res.status(404).json({error:'Invoice not found.'});
  const result=await run("UPDATE invoices SET status='void',void_reason=?,revision=revision+1 WHERE id=? AND tenant=? AND paid_paise=0 AND status='issued' AND revision=?",req.input.reason,r.id,tenant,req.input.revision);
  if(!result.changes)return res.status(409).json({error:'Only an unchanged unpaid invoice can be voided. Refunds are not supported yet.'});
  await audit(req.user.id,'invoice-voided',r.id);res.json(decodeInvoice(await access(req,'invoices',r.id)));
 });
 const assistantLimit=rateLimit({windowMs:60000,limit:options.test?1000:10,keyGenerator:req=>req.user.id,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please wait a minute before asking again.'}});
 app.post('/api/parent-assistant',assistantLimit,validate(z.object({prescription_id:short,question:z.string().trim().min(3).max(500),language:z.enum(['en','hi']).default('en'),use_ai:z.boolean().default(false),consent:z.boolean().default(false)})),async(req,res)=>{
  if(req.user.role!=='parent')return res.status(403).json({error:'This assistant is for parent accounts.'});
  const r=decodeRx(await access(req,'prescriptions',req.input.prescription_id));
  if(!r||r.status!=='published')return res.status(404).json({error:'A current published prescription is required.'});
  const v=req.input;let choice={section:'overview',medicine_index:-1},mode='record-reader',notice='';
  if(v.use_ai){
   if(!v.consent)return res.status(400).json({error:'Please consent before sending the question and medicine names to OpenAI.'});
   if(!aiEnabled)return res.status(503).json({error:'AI is not configured. Use the prescription reader instead.'});
   try{choice=await selectPrescriptionSection({question:v.question,medicines:r.content.medicines,apiKey:ai.apiKey,model:ai.model,fetcher:ai.fetcher});mode='ai-guided';}
   catch{notice='AI is unavailable. Showing the original prescription reader instead.';}
  }
  else if(/dose|dosage|stop|change|double|missed|side.effect|interaction|symptom|emergen|overdose|खुराक.*बदल|दवा.*बंद/i.test(v.question))choice.section='clinician';
  else if(/follow|review|अगली/i.test(v.question))choice.section='followup';
  else if(/purpose|why|क्यों/i.test(v.question))choice.section='purpose';
  else if(/instruction|advice|निर्देश/i.test(v.question))choice.section='instructions';
  // Recheck after external work so a revoked prescription is not explained as current.
  const current=await get('SELECT status,revision FROM prescriptions WHERE id=? AND tenant=?',r.id,tenant);
  if(current?.status!=='published'||current.revision!==r.revision)return res.status(409).json({error:'This prescription changed. Reload before continuing.'});
  await audit(req.user.id,v.use_ai?'prescription-ai-requested':'prescription-reader-used',r.id);
  res.json({...prescriptionExplanation(r,choice,v.language,mode),notice});
 });
}
