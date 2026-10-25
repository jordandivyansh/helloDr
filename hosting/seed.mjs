import { scryptSync } from 'node:crypto';
import { todayIST, addDays } from '../server/app.mjs';
const tenant='ruchi-lamyan';
function demoPassword(value,salt) {return `${salt}:${scryptSync(value,salt,64).toString('hex')}`;}
// Fictional seed only. Local SQLite and its records are never uploaded.
export async function seedDemo(db) {
  if(await db.prepare('SELECT id FROM notes WHERE id=?').bind('note-demo').first()) return;
  const now=new Date().toISOString(), day=todayIST();
  const statements=[];
  const insert=(table,rows)=>{
    const columns=rows[0].length;
    for(let i=0;i<rows.length;i+=Math.floor(90/columns)) {
      const batch=rows.slice(i,i+Math.floor(90/columns));
      statements.push(db.prepare(`INSERT OR IGNORE INTO ${table} VALUES ${batch.map(()=>`(${Array(columns).fill('?').join(',')})`).join(',')}`).bind(...batch.flat()));
    }
  };
  insert('users',[
    ['doctor-demo',tenant,'Dr. Ruchi Lamyan','doctor@demo.local',demoPassword('ClinicDemo!2026','doctor-demo-salt-v1'),'doctor'],
    ['parent-demo',tenant,'Ananya Sharma','parent@demo.local',demoPassword('ParentDemo!2026','parent-demo-salt-v1'),'parent'],
  ]);
  insert('children',[
    ['child-aarav',tenant,'parent-demo','Aarav Sharma','2022-04-12','male','No known allergies',now],
    ['child-meera',tenant,'parent-demo','Meera Sharma','2024-08-21','female','No known allergies',now],
  ]);
  insert('slots',Array.from({length:21},(_,i)=>['09:00','09:30','10:00','10:30','11:00','11:30','16:00','16:30','17:00','17:30'].map(time=>[tenant,addDays(day,i),time])).flat());
  insert('appointments',[
    ['apt-1',tenant,'child-aarav','parent-demo',addDays(day,1),'10:00','Well-child visit','Routine check-up and questions about sleep.','scheduled',now],
    ['apt-2',tenant,'child-meera','parent-demo',day,'16:00','Vaccination visit','Review vaccination record with the doctor.','scheduled',now],
  ]);
  insert('vaccines',[['vaccine-demo',tenant,'child-meera','Vaccination record review (demo)',addDays(day,7),null]]);
  insert('notes',[['note-demo',tenant,'child-aarav','doctor-demo','Sample follow-up note: Please bring previous health records to the next appointment. This is fictional demonstration data.',now]]);
  // D1 batch is transactional, so the completion marker cannot precede partial data.
  await db.batch(statements);
}
