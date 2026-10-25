from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from xml.sax.saxutils import escape

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/Littleleaf_Product_Brief_Dr_Ruchi_Lamyan.pdf'
W,H=A4
M=43
CW=W-2*M
INK=HexColor('#193D38'); MUTED=HexColor('#536B65'); GREEN=HexColor('#2B725C')
PALE=HexColor('#EFF5F0'); LINE=HexColor('#D9E5DD'); GOLD=HexColor('#B77A26')
BLUE=HexColor('#356EA2'); LILAC=HexColor('#7961A2'); ROSE=HexColor('#B26266')
SOFTBLUE=HexColor('#ECF3FA'); SOFTGOLD=HexColor('#FBF3E3'); SOFTLILAC=HexColor('#F1EEF8')
URL='https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site/portal'
c=canvas.Canvas(str(OUT),pagesize=A4)
c.setTitle('Littleleaf | Product capabilities and roadmap | Dr. Ruchi Lamyan')
c.setAuthor('Littleleaf product team')
c.setSubject('Current pediatric clinic demo, proposed features, and pilot priorities')


def rect(x,top,w,h,fill,r=12,stroke=None):
 c.setFillColor(fill)
 c.setStrokeColor(stroke or fill)
 c.roundRect(x,H-top-h,w,h,r,stroke=bool(stroke),fill=1)

def text(s,x,top,size=10,color=INK,font='Helvetica'):
 c.setFillColor(color);c.setFont(font,size);c.drawString(x,H-top-size,s)

def para(s,x,top,w,size=10.5,color=INK,leading=None,bold=False):
 style=ParagraphStyle('p',fontName='Helvetica-Bold' if bold else 'Helvetica',fontSize=size,leading=leading or size*1.45,textColor=color,spaceAfter=0)
 p=Paragraph(s,style);_,height=p.wrap(w,1000);p.drawOn(c,x,H-top-height)
 return top+height

def line(x1,t1,x2,t2,color=LINE,width=1):
 c.setStrokeColor(color);c.setLineWidth(width);c.line(x1,H-t1,x2,H-t2)

def pill(s,x,t,color=GREEN,bg=PALE):
 size=8; width=c.stringWidth(s,'Helvetica-Bold',size)+18
 rect(x,t,width,21,bg,10);text(s,x+9,t+5,size,color,'Helvetica-Bold');return width

def footer(n,section):
 line(M,792,W-M,792)
 text('LITTLELEAF  /  DR. RUCHI LAMYAN',M,806,7.3,MUTED,'Helvetica-Bold')
 text(section,280,806,7.3,MUTED)
 c.setFont('Helvetica',8);c.setFillColor(MUTED);c.drawRightString(W-M,H-806-8,f'{n:02} / 07')

def header(n,kicker,title,subtitle):
 c.setFillColor(HexColor('#FCFDFB'));c.rect(0,0,W,H,fill=1,stroke=0)
 text('littleleaf',M,28,17,INK,'Helvetica-Bold')
 text('PRODUCT BRIEF  /  OCTOBER 2026',W-244,34,7.5,MUTED,'Helvetica-Bold')
 text(kicker.upper(),M,82,8.5,GREEN,'Helvetica-Bold')
 para(title,M,107,CW,29,INK,33,bold=True)
 para(subtitle,M,156,CW,10.8,MUTED,16)
 footer(n,kicker)

def bullet(s,x,t,w,size=10,color=INK):
 c.setFillColor(GREEN);c.circle(x+2,H-t-7,2,fill=1,stroke=0)
 return para(s,x+13,t,w-13,size,color)+7

def card(x,t,w,h,num,title,body,color=GREEN,bg=PALE):
 rect(x,t,w,h,bg)
 pill(num,x+16,t+15,color,white)
 y=para(title,x+16,t+48,w-32,14,color,18,True)
 y=para(body,x+16,y+9,w-32,10,INK,14.5)
 assert y<=t+h-10,(title,y,t+h)

def band(t,title,body,bg=PALE,color=GREEN):
 rect(M,t,CW,76,bg)
 text(title,M+18,t+14,11,color,'Helvetica-Bold')
 y=para(body,M+18,t+34,CW-36,9.8,INK,14)
 assert y<=t+70,(title,y)

def flow(t,items,height=99):
 gap=16;w=(CW-gap*(len(items)-1))/len(items)
 for i,(title,body,col,bg) in enumerate(items):
  x=M+i*(w+gap);rect(x,t,w,height,bg)
  text(f'{i+1:02}',x+12,t+12,8,col,'Helvetica-Bold')
  y=para(title,x+12,t+30,w-24,11,col,14,True)
  para(body,x+12,y+6,w-24,9,INK,12)
  if i<len(items)-1:
   xx=x+w+4;line(xx,t+height/2,xx+8,t+height/2,MUTED)
   line(xx+5,t+height/2-3,xx+8,t+height/2,MUTED)
   line(xx+5,t+height/2+3,xx+8,t+height/2,MUTED)

def phase(t,num,title,items,col,bg):
 rect(M,t,57,57,bg);text(num,M+13,t+13,22,col,'Helvetica-Bold')
 y=para(title,M+74,t+1,CW-74,14,col,18,True)
 for item in items:y=bullet(item,M+74,y+10,CW-74,10)
 return y

# PAGE 1 - cover
c.setFillColor(INK);c.rect(0,H-420,W,420,fill=1,stroke=0)
text('littleleaf',M,36,24,white,'Helvetica-Bold')
text('A CONNECTED PEDIATRIC CARE EXPERIENCE',M,80,8.3,HexColor('#BDE0CE'),'Helvetica-Bold')
para('One clinic.<br/>One connected<br/>care journey.',M,124,460,42,white,46,True)
para('Product capabilities & development roadmap',M,286,CW,15,HexColor('#D9E9DF'),21)
text('Prepared for Dr. Ruchi Lamyan',M,335,13,white,'Helvetica-Bold')
text('Private clinic at ATS Nobility, Greater Noida',M,359,10,HexColor('#D9E9DF'))
# Small purposeful motif: three connected care stages
for x,label in [(410,'PARENT'),(465,'CHILD'),(520,'DOCTOR')]:
 c.setStrokeColor(HexColor('#81B59A'));c.setLineWidth(1)
 c.circle(x,H-375,13,stroke=1,fill=0)
 c.setFillColor(HexColor('#BDE0CE'));c.circle(x,H-375,3,stroke=0,fill=1)
 text(label,x-16,396,5.7,HexColor('#C1DCCE'),'Helvetica-Bold')
line(423,375,452,375,HexColor('#81B59A'));line(478,375,507,375,HexColor('#81B59A'))
pill('WORKING DEMONSTRATION',M,449)
pill('FUTURE FEATURES CLEARLY MARKED',M+173,449,GOLD,SOFTGOLD)
para('A familiar doctor. A clearer follow-up experience.',M,493,CW,23,INK,29,True)
para('A branded website and secure parent and doctor portals, designed to keep appointments, child profiles and clinician-published records connected.',M,563,CW,12,MUTED,18)
flow(638,[('Discover','Clinic identity and services',BLUE,SOFTBLUE),('Book','Published appointment slots',GREEN,PALE),('Follow through','Notes and vaccine records',LILAC,SOFTLILAC)],91)
para('Current scope: a single-clinic MVP using fictional records. Proposed features in this brief are not yet delivered. Littleleaf is a working brand for discussion.',M,748,CW,8.5,MUTED,12)
footer(1,'Overview');c.showPage()

# PAGE 2
header(2,'Available today','What the product can do now','The current version demonstrates the core workflow for a pediatric practice, with separate experiences for parents and the doctor.')
gap=16;col=(CW-gap)/2
card(M,214,col,157,'01 / WEBSITE','A branded clinic presence','Doctor profile, services, clinic location and a responsive layout. Introductory English/Hindi content is available; the portal is currently in English.',BLUE,SOFTBLUE)
card(M+col+gap,214,col,157,'02 / PARENT','A family care space','Sign in, view child profiles and allergies, book available visits, cancel eligible appointments, and read the doctor\'s published care notes.',GREEN,PALE)
card(M,389,col,157,'03 / DOCTOR','A clinic workspace','View and filter appointments, review child records, publish availability, check patients in, complete visits, and publish follow-up notes.',LILAC,SOFTLILAC)
card(M+col+gap,389,col,157,'04 / RECORDS','Continuity between visits','Keep child-specific notes and manually entered vaccination plans together. Record administration dates and view a structured pre-visit brief.',GOLD,SOFTGOLD)
band(568,'Access designed for a controlled demonstration','The homepage is reachable without ChatGPT login. The hosted portal requires owner-supplied parent or doctor test credentials. Public registration and one-click demo access are disabled.')
para('<b>Important distinctions</b>',M,669,CW,11,INK)
y=bullet('Vaccination plans are entered by the doctor; no automatic vaccine schedule is generated.',M,697,CW,9.5)
y=bullet('The pre-visit brief formats existing records. It is not AI-generated and makes no clinical inference.',M,y,CW,9.5)
y=bullet('Payments, messaging, prescriptions, teleconsultation and native mobile apps are not included yet.',M,y,CW,9.5)
assert y<784;y=0;c.showPage()

# PAGE 3
header(3,'See the workflow','From booking to follow-up','An actual doctor dashboard from the development demonstration, followed by the intended everyday sequence.')
# Use full screenshot without distorting or hiding its context.
img=ROOT/'docs/clinic-dashboard.jpg';iw,ih=ImageReader(str(img)).getSize();dw=CW;dh=dw*ih/iw
c.drawImage(str(img),M,H-214-dh,width=dw,height=dh,mask='auto')
para('Product screenshot: doctor workspace, captured 5 October 2026. All displayed patients and counts are fictional demonstration data.',M,214+dh+9,CW,8,MUTED,11)
flow(684,[('Parent books','Select child, date, slot and visit reason.',BLUE,SOFTBLUE),('Doctor reviews','Check in, review records and complete visit.',LILAC,SOFTLILAC),('Parent follows up','Read the doctor\'s note and vaccine plan.',GREEN,PALE)],87)
c.showPage()

# PAGE 4
header(4,'Priority 1 / before real use','Make the clinic pilot ready','The next milestone should be a reliable, approved single-clinic pilot. These additions are prerequisites for real patient use, not optional visual polish.')
phase(215,'01','Confirm how the clinic operates',[
 'Approve the practice identity, registration details, contact information, hours and consultation fees.',
 'Set visit duration, leave dates, rescheduling rules, cancellation policy and same-day booking limits.'
],BLUE,SOFTBLUE)
phase(365,'02','Strengthen access and record handling',[
 'Add individual staff accounts, verified parent contact details, password recovery and staff multi-factor authentication.',
 'Define guardian authority, adolescent access, consent, record retention, export and deletion workflows with appropriate review.'
],LILAC,SOFTLILAC)
phase(526,'03','Prepare dependable operations',[
 'Use a fresh production environment; remove shared demo accounts and establish onboarding and support ownership.',
 'Add monitored backups and tested restoration, error monitoring, recovery procedures and a security review.'
],GREEN,PALE)
band(697,'Decision gate: approve the pilot before inviting families','Agree the clinical workflow, access rules and support process; verify recovery and account protection. This demo is not a production-readiness or compliance certification.',SOFTGOLD,GOLD)
c.showPage()

# PAGE 5
header(5,'Priority 2 / pediatric care','Extend the care experience','Proposed features to prioritize with Dr. Ruchi after the pilot foundations are approved. Scope and sequence should follow clinic needs.')
rows=[
 ('Appointments & reception','Rescheduling, waiting list, schedule exceptions, reception access and visit queue.','Less manual coordination around daily visits.',BLUE,SOFTBLUE),
 ('Reminders & communication','Consented appointment/follow-up reminders, delivery status and clinic-controlled messaging.','Keep families informed between visits.',GREEN,PALE),
 ('Pediatric longitudinal record','Growth measurements/charts, birth and development history, attachments and past reports.','Bring relevant child history into one view.',LILAC,SOFTLILAC),
 ('Vaccination follow-through','Clinician-approved schedule rules, due/overdue views, catch-up review and reminder workflows.','Support tracking while preserving clinical judgement.',GOLD,SOFTGOLD),
 ('Clinical documents & payments','Clinician-approved prescriptions and visit summaries; payment/UPI integration, receipts and refunds.','Complete more of the visit journey in one place.',ROSE,HexColor('#FAEFF0')),
]
for i,(title,features,value,colr,bg) in enumerate(rows):
 t=211+i*106;rect(M,t,CW,93,bg)
 text(f'{i+1:02}',M+15,t+17,11,colr,'Helvetica-Bold')
 para(title,M+48,t+12,CW-66,12.2,colr,16,True)
 para(features,M+48,t+35,CW-66,9.5,INK,13)
 para('<b>Intended value:</b> '+value,M+48,t+66,CW-66,8.5,MUTED,11)
para('Additional options: parent education in Hindi and English, feedback collection, and teleconsultation after defining suitability, consent and clinic processes. No delivery dates or cost estimates are committed in this brief.',M,750,CW,8.5,MUTED,12)
c.showPage()

# PAGE 6
header(6,'Priority 3 / assisted care & scale','AI with the doctor in control','The current assistant is a structured record summary. Any future AI capability should assist documentation and navigation, with explicit review before clinical content reaches families.')
card(M,215,col,160,'CURRENT','Structured pre-visit brief','Displays recorded patient details, the visit, the parent-reported concern and allergies. No external AI model is called, and no diagnosis or treatment is generated.',GREEN,PALE)
card(M+col+gap,215,col,160,'PROPOSED','Clinician-reviewed assistance','Draft visit summaries, organize longitudinal notes, extract report fields for verification, and help draft parent-friendly explanations in approved languages.',LILAC,SOFTLILAC)
flow(401,[('Retrieve','Only authorized, relevant records.',BLUE,SOFTBLUE),('Draft','Flag uncertainty and show sources.',LILAC,SOFTLILAC),('Review','Doctor edits and approves.',GOLD,SOFTGOLD),('Publish','Record the approved output.',GREEN,PALE)],107)
para('<b>Before introducing AI</b>',M,533,CW,11,INK)
y=bullet('Choose suitable data handling terms and permissions; control what information leaves the system.',M,558,CW,9.8)
y=bullet('Evaluate invented facts, missing details and source accuracy; keep audit history and a non-AI fallback.',M,y,CW,9.8)
line(M,632,W-M,632)
para('Scale only after the clinic workflow is proven',M,649,CW,16,INK,20,True)
para('<b>Future platform:</b> clinic-specific branding and domains, verified clinic onboarding, multiple doctors, staff roles, isolated records, subscription administration and operational reporting.',M,680,CW,10,MUTED,14)
para('<b>Future mobile:</b> Android/iOS apps using the same core services, with suitable mobile sign-in and notification controls. The current responsive website is not a native app.',M,732,CW,10,MUTED,14)
c.showPage()

# PAGE 7
header(7,'Review together','A focused first discussion','Use the demo to validate the clinic workflow, then agree the smallest useful pilot. Test credentials should be shared separately from this document.')
# Demo box with live clickable button and vector QR.
rect(M,211,CW,156,INK)
text('EXPLORE THE CURRENT DEMO',M+19,230,8.5,HexColor('#BDE0CE'),'Helvetica-Bold')
para('Parent and doctor portals',M+19,253,325,20,white,25,True)
para('No ChatGPT account required. Use the supplied test credentials and fictional information only.',M+19,287,319,10,HexColor('#D9E9DF'),15)
rect(M+19,329,155,24,HexColor('#DCEEE3'),7)
text('Open the demo portal',M+31,335,9,GREEN,'Helvetica-Bold')
c.linkURL(URL,(M+19,H-353,M+174,H-329),relative=0,thickness=0)
q=qr.QrCodeWidget(URL);bounds=q.getBounds();sz=100;qw=bounds[2]-bounds[0];qh=bounds[3]-bounds[1]
d=Drawing(sz,sz,transform=[sz/qw,0,0,sz/qh,0,0]);d.add(q)
rect(W-M-120,231,104,104,white,6);renderPDF.draw(d,c,W-M-118,H-333)
text('SCAN TO OPEN',W-M-106,342,6.8,HexColor('#D9E9DF'),'Helvetica-Bold')
para('A five-minute demonstration',M,391,CW,16,INK,20,True)
steps=[('1 minute','Review the clinic page and parent sign-in.'),('2 minutes','Book a future slot for a fictional child; open it as the doctor.'),('2 minutes','Check in the visit, publish a sample note and view it as the parent.')]
for i,(time,desc) in enumerate(steps):
 t=427+i*37;pill(time,M,t,BLUE,SOFTBLUE);para(desc,M+90,t+2,CW-90,10,INK,14)
para('Decisions requested from Dr. Ruchi',M,564,CW,16,INK,20,True)
y=bullet('Which three capabilities matter most for the first clinic pilot?',M,595,CW,10)
y=bullet('What are the approved timings, fees, booking rules and follow-up process?',M,y,CW,10)
y=bullet('Who should manage appointments and records, and what should parents be able to see?',M,y,CW,10)
band(701,'Suggested next step','Review this demo together, record changes, then agree a written pilot scope with acceptance criteria. Effort, cost and delivery dates can be estimated once that scope is agreed.')
c.showPage();c.save()
print(OUT)
