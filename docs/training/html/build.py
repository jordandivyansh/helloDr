#!/usr/bin/env python3
"""Build the offline handbook from the course's constrained Markdown syntax.
Uses Python's standard library only. Run from any working directory.
"""
from pathlib import Path
import html, re, json
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent
PAGES = [
 ('START-HERE.md','index.html','Start here','Your project. Understood.','A visual field guide to running, changing, and explaining Littleleaf. Start with the whole system, then follow one request at a time.'),
 ('01-foundations.md','foundations.html','Foundations','From DSA to full stack','Connect familiar programming ideas to browsers, APIs, React state, and persistent data.'),
 ('02-code-walkthrough.md','code-walkthrough.html','Code walkthrough','Follow the request','Trace a parent’s click through the frontend, permissions, SQL, and the response.'),
 ('03-data-security-tests.md','data-security.html','Data & security','Make the rules durable','Understand relationships, authentication, ownership, concurrency, and the tests behind the promises.'),
 ('04-operating-guide.md','operating-guide.html','Run & host','Take the controls','Start the project, inspect failures, edit confidently, and understand what actually reaches hosting.'),
 ('05-practice-labs.md','practice-labs.html','Practice labs','Learn by changing it','Six ordered exercises that move from a sentence on screen to a database concurrency guarantee.'),
 ('06-clients-and-interviews.md','clients-interviews.html','Clients & interviews','Explain your decisions','Connect working features to client value, then defend the implementation and its tradeoffs.'),
 ('CHEATSHEET.md','cheatsheet.html','Desk reference','Keep this beside you','Commands, routes, and vocabulary for the moments when you need a quick answer.')]
LINKS = {p[0]:p[1] for p in PAGES}
E = html.escape

def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
def inline(s):
    stash=[]
    def keep(v): stash.append(v); return f'\x00{len(stash)-1}\x00'
    s=re.sub(r'`([^`]+)`',lambda m:keep('<code>'+E(m[1])+'</code>'),s)
    s=E(s)
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m: '<a href="'+E(LINKS.get(html.unescape(m[2]),html.unescape(m[2])),quote=True)+'">'+m[1]+'</a>',s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
    s=re.sub(r'\x00(\d+)\x00',lambda m:stash[int(m[1])],s)
    return s

def node(title,detail='',color='teal',tag=''):
    return f'<div class="node {color}">'+(f'<span class="tag">{E(tag)}</span>' if tag else '')+f'<strong>{E(title)}</strong><small>{E(detail)}</small></div>'
def figure(title,body,caption=''):
    return f'<figure class="visual"><figcaption>{E(title)}</figcaption>{body}'+(f'<p class="caption">{E(caption)}</p>' if caption else '')+'</figure>'
def flow(title,items,caption=''):
    return figure(title,'<div class="flow">'+'<span class="arrow" aria-hidden="true">→</span>'.join(node(*v) for v in items)+'</div>',caption)
def stack(title,items,caption=''):
    return figure(title,'<div class="stack">'+''.join(node(*v) for v in items)+'</div>',caption)
def compare(title,items,caption=''):
    return figure(title,'<div class="compare">'+''.join(node(*v) for v in items)+'</div>',caption)
def timeline(title,items,caption=''):
    return figure(title,'<div class="timeline">'+''.join(f'<div class="timeline-row"><span class="dot {c}">{i+1:02}</span><div><strong>{E(t)}</strong><p>{E(d)}</p></div></div>' for i,(t,d,c) in enumerate(items))+'</div>',caption)

LOCAL=flow('On your laptop', [('Browser','127.0.0.1:3000','blue','User interface'),('Next.js proxy','/api/* → port 4000','teal','Routing'),('Express','Identity + business rules','violet','Backend'),('SQLite','data/clinic.sqlite','amber','Storage')], 'Responses travel back through the same path. The browser keeps one origin while two local processes run.')
CLOUD=flow('The hosted demonstration', [('Sites access','Owner-private boundary','blue'),('Assets / API','Static pages or Worker route','teal'),('Express Worker','Same business logic + D1 adapter','violet'),('D1','Independent hosted records','amber')], 'Static frontend files still call a dynamic backend. Local and hosted records are not synchronized.')
STATE=figure('Appointment transitions', '<div class="flow">'+node('Scheduled','Parent or doctor may cancel','blue')+'<span class="arrow" aria-hidden="true">→</span>'+node('Checked-in','Doctor checks in; cancellation still allowed','violet')+'<span class="arrow" aria-hidden="true">→</span>'+node('Completed','Doctor completes; terminal state','teal')+'</div><p class="caption">Scheduled or checked-in → Cancelled (terminal). Scheduled → Completed is rejected.</p>', 'This diagram describes the current backend, including parent cancellation after check-in.')
RELATIONS=figure('How records connect', ''.join('<div class="relation">'+node(a,ad,ac)+'<span class="arrow" aria-label="links to">→</span>'+node(b,bd,bc)+'</div>' for a,ad,ac,b,bd,bc in [
 ('User','Parent account','blue','Children','One parent → many children','teal'),('Child','Stable child ID','teal','Appointments','One child → many visits','violet'),('Child','Record owner','teal','Notes + vaccines','History and manually entered plans','amber'),('User','Doctor account','blue','Notes','Author of published follow-up','amber'),('User','Signed-in account','blue','Sessions','Hashed token and expiry','rose')]), 'The current model has one parent per child. Slots connect logically by clinic + day + time.')
FUTURE=flow('Future white-label platform — proposed', [('Verified domain','Resolve clinic identity','blue'),('Membership','Verify user and clinic role','violet'),('Shared product','Clinic branding + scoped rules','teal'),('Isolated records','Tenant-aware storage + jobs','amber')], 'Tenant provisioning and domain-based routing are future work, not capabilities already deployed.')
BOOKING=timeline('A booking crosses six boundaries', [('Collect','Portal.tsx reads the selected child, date, time, type, and reason.','blue'),('Send','lib/api.ts sends a same-origin HTTP POST with JSON and the session cookie.','teal'),('Authorize','Express verifies identity, clinic scope, and family access.','violet'),('Validate','Zod and business rules check input, future time, and published availability.','violet'),('Persist','The unique index decides whether the slot can be occupied.','amber'),('Respond','Return 201 or a conflict; the UI reloads the successful booking.','teal')])

def diagram(code):
    if 'sequenceDiagram' in code:return BOOKING
    if 'stateDiagram' in code:return STATE
    if 'erDiagram' in code:return RELATIONS
    if 'Next.js :3000' in code:return LOCAL
    if 'Sites private access' in code:return CLOUD
    if 'Clinic A verified domain' in code:return FUTURE
    raise ValueError('Unmapped diagram: '+code)

SIM='''<figure class="visual" data-simulator><figcaption>Try the booking request</figcaption>
<div class="sim-controls"><label for="scenario">Scenario</label><select id="scenario"><option value="success">Available slot</option><option value="session">Expired session</option><option value="family">Another family's child</option><option value="conflict">Another request books first</option></select></div>
<div class="flow">'''+''.join(node(t,d,c,str(i+1)) .replace('class="node ', 'class="node sim-step ') for i,(t,d,c) in enumerate([('Form','React state','blue'),('Request','HTTP + cookie','teal'),('Session','Who are you?','violet'),('Rules','May you book?','violet'),('Insert','Slot constraint','amber'),('Result','JSON → UI','teal')]))+'''</div><div class="sim-status" aria-live="polite"></div><div class="sim-actions"><button type="button" data-back>Previous</button><button type="button" class="primary" data-next>Next step</button><span data-count></span></div><p class="caption">Teaching simulation only. This never calls the clinic API or changes appointments.</p></figure>'''

EXTRAS={
 'START-HERE.md':{
 'What you own today': compare('What works now, what comes next', [('Working now','Appointments, profiles, role-based records, and private hosting.','teal'),('Still to build','Payments, reminders, mobile apps, and repeatable clinic onboarding.','amber')]),
 'The first concept to master':flow('From a DSA function to a web feature',[('Input','Parent fills the form','blue'),('Rules','Backend validates and authorizes','violet'),('State','Database stores the change','amber'),('Output','UI displays the result','teal')]),
 'First 30 minutes':timeline('Your first complete loop',[('Run','Start the local frontend and backend.','blue'),('Act','Book a fictional visit as the parent.','teal'),('Verify','Refresh, then inspect it as the doctor.','violet'),('Close the loop','Publish a note; return as the parent to read it.','amber')])},
 '01-foundations.md':{
 'A browser is another program':compare('Same feature, different responsibilities',[('Browser: interaction','Render screens, collect input, show loading and errors. Treat all client input as untrusted.','blue'),('Server: authority','Validate, authorize, apply business rules, and return only permitted records.','violet')]),
 'State exists in different places':stack('Where does a value live?',[('React state','Selected child or open modal → usually lost on reload.','blue'),('Cookie','Session token → browser sends it; HttpOnly blocks direct JS reads.','teal'),('Database','Appointments and notes → persist beyond page and process lifetime.','amber'),('Environment','Ports, origin, database path → configure a process or deployment.','violet')]),
 'Async programming without mysticism':compare('Waiting is different from computing',[('await network I/O','This async function waits; other work can proceed while the request is in flight.','teal'),('Synchronous CPU work','scryptSync still occupies the JavaScript thread. Adding async does not make it parallel.','amber')])},
 '02-code-walkthrough.md':{
 'Booking, step by step':SIM,
 'Middleware order is part of security':flow('Order determines access',[('Parse + protect','Headers, JSON, Origin, limits','blue'),('Public routes','Health, clinic, sign-in','teal'),('Authenticate','Resolve req.user','violet'),('Private routes','Role + resource checks','amber')]),
 'Login is another request flow':flow('Password verification → session',[('Credentials','Verify salted scrypt hash','blue'),('Random token','Create 32 random bytes','violet'),('Two destinations','Raw token → cookie; hash → DB','amber'),('Next request','Hash cookie → session lookup','teal')]),
 'Why the same backend works locally and online':compare('One interface, two storage adapters',[('Local adapter','DatabaseSync executes against a local SQLite file.','amber'),('Cloud adapter','D1 calls are awaited and mapped to run/get/all results.','violet')], 'createApp({ db }) receives its dependency; tests can supply in-memory storage.')},
 '03-data-security-tests.md':{
 'Preventing double booking':compare('The race: both users saw the slot as available',[('Request A wins','INSERT satisfies the unique index → appointment stored → 201.','teal'),('Request B loses','Same tenant/day/time violates the index → no second booking → 409.','rose')], 'The database decides atomically whether an insert violates uniqueness. A prior availability check cannot guarantee it.'),
 'Authentication, authorization, and isolation':flow('Three questions before returning records',[('Identity','Who is making this request?','blue'),('Permission','May this role perform this action?','violet'),('Scope','Does this child belong to this family and clinic?','amber')]),
 'Tests are executable claims':flow('Integration test structure',[('Arrange','In-memory DB + known fixtures','blue'),('Act','Real HTTP request to test server','violet'),('Assert','Status, response, and durable effect','teal')]),
 'Real limitations worth understanding':compare('Not every write is fully atomic',[('Guaranteed today','A unique slot index rejects competing occupied-slot inserts.','teal'),('Remaining work','Status read/update races and separate business/audit writes need stronger guarantees.','amber')])},
 '04-operating-guide.md':{
 'Start on this computer':compare('One launcher starts two processes',[('Next :3000','Pages and /api forwarding → started by sh start-local.sh.','teal'),('Express :4000','Business API and SQLite → started by the same launcher.','violet')], 'The launcher starts both processes. Next forwards API requests to Express.'),
 'Which command does what?':compare('Build and publish are separate actions',[('Build locally','pnpm build creates dist/client and the Worker bundle. It does not publish a URL.','blue'),('Publish a version','The authenticated Sites workflow uploads and deploys the built version.','teal')]),
 'Debug by layer':timeline('Find the failing boundary',[('Screen','Inspect the action and browser console.','blue'),('Network','Read method, URL, status, payload, and response.','teal'),('API','Read the route and terminal error; check auth and Origin.','violet'),('Storage','Check schema, constraints, and the correct database.','amber')]),
 'Hosting: what was actually done':CLOUD},
 '05-practice-labs.md':{
 'Lab 1 — Change visible content':flow('Build confidence in small steps',[('1 · Text','One file; visible result','blue'),('2 · Filter','React state + derived array','teal'),('3 · Rule','UI + API + test','violet')]),
 'Lab 4 — Add a scoped read-only endpoint':flow('A complete new feature',[('Route','After authentication','violet'),('SQL','Tenant + family scope','amber'),('Response','Typed counts in JSON','blue'),('UI + tests','Display and verify isolation','teal')]),
 'Lab 5 — Add a persistent field carefully':stack('A field touches more than a form',[('Database','Local schema + upgrade path + cloud migration.','amber'),('Writes','Validation + explicit column lists + both seeds.','violet'),('Interface','Response type + input control + display.','blue'),('Verification','Old rows, new rows, invalid input, and access checks.','teal')]),
 'Lab 6 — Fix a concurrency issue':compare('Optimistic concurrency',[('Old approach','Read scheduled → decide → update by ID. A competing update can intervene.','rose'),('Conditional update','Update only WHERE status = previously read status. Zero changed rows means conflict.','teal')])},
 '06-clients-and-interviews.md':{
 'A client explanation in 45 seconds':flow('Explain the outcome first',[('Parent','Book and track a child’s care','blue'),('Doctor','Manage visits and publish records','violet'),('Clinic','A branded, connected workflow','teal')]),
 'AI: present implementation versus future design':compare('Be precise about the assistant',[('Current: structured preview','Formats recorded fields. No AI model, clinical inference, or external transmission.','teal'),('Future: reviewed draft','Authorized retrieval → model draft → evaluation → doctor approval → publication.','violet')]),
 'Tell an engineering story with evidence':flow('A strong interview answer',[('Problem','Two users choose one slot','blue'),('Decision','Database uniqueness','violet'),('Evidence','One 201 + one 409','teal'),('Limit','One clinic resource per slot','amber')])},
 'CHEATSHEET.md':{'Never confuse these':compare('Use accurate language',[('Implemented guarantees','Server permissions, durable bookings, tested slot conflict behavior.','teal'),('Do not imply','Production certification, unlimited scale, native mobile, or real AI.','amber')])}}

CHECKS={
 0:[('Where should I start?','Run the app, book a fictional appointment, refresh, and follow it as the doctor. Then trace the booking files.')],
 1:[('Why does a booking survive a page refresh?','It is stored in the database. React reloads it through the API; the browser’s component state is not the durable source.'),('Does async make scryptSync nonblocking?','No. Synchronous work still occupies the JavaScript thread.')],
 2:[('Can a parent bypass security by calling the endpoint directly?','The backend must independently enforce the session, role, tenant, and family checks. UI visibility does not grant permission.'),('Why reload after booking?','The server owns the authoritative record. Reloading reconciles the interface with the saved result.')],
 3:[('Why can’t two availability checks prevent a double booking?','Both can read free before either writes. The database unique constraint resolves the concurrent inserts.'),('Does an audit table make every write atomic?','No. The current business and audit writes are separate operations.')],
 4:[('Does pnpm build update the live Site?','No. It produces a hosted artifact. Publishing through the authenticated hosting workflow is a separate step.'),('Will a local booking appear in D1?','No. Local SQLite and hosted D1 are independent databases.')],
 5:[('Why add a backend test when changing a UI validation rule?','A client can skip the UI. The backend must enforce the rule for all callers.'),('Why check changed rows after a conditional update?','Zero means the old-state precondition did not hold, so a competing change or missing record must be handled.')],
 6:[('What is a truthful AI claim today?','The assistant creates a deterministic structured preview from stored records. It does not call an AI model.'),('What proves I own the project technically?','You can trace, change, test, debug, and explain its behavior and limitations independently.')],
 7:[('What are the three questions for any feature?','Where is it displayed? Where is it validated? Where is it stored?')]}

# Deliberately small renderer for the Markdown features used by this course.
# Fenced blocks, paragraphs, headings, tables, lists, and inline code/links/emphasis.
def render(markdown, filename):
    lines=markdown.splitlines(); out=[]; toc=[]; i=0
    while i<len(lines):
        line=lines[i]
        if not line.strip():i+=1;continue
        if line.startswith('# '):i+=1;continue
        h=re.match(r'^(#{2,3}) (.+)',line)
        if h:
            level=len(h[1]);title=h[2];ident=slug(title)
            out.append(f'<h{level} id="{ident}">{inline(title)}</h{level}>')
            if level==2:toc.append((title,ident))
            out.append(EXTRAS.get(filename,{}).get(title,''));i+=1;continue
        if line.lstrip().startswith('```'):
            indent=len(line)-len(line.lstrip());lang=line.strip()[3:];code=[];i+=1
            while i<len(lines) and not lines[i].lstrip().startswith('```'):
                code.append(lines[i][indent:] if lines[i].startswith(' '*indent) else lines[i]);i+=1
            i+=1;code='\n'.join(code)
            if lang=='mermaid':out.append(diagram(code))
            else:out.append(f'<div class="codebox"><div class="codebar"><span>{E(lang or "text")}</span><button type="button" class="copy" aria-label="Copy code">Copy</button></div><pre><code>{E(code)}</code></pre></div>')
            continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                row=[v.strip() for v in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+',v) for v in row):rows.append(row)
                i+=1
            out.append('<div class="table-wrap" role="region" aria-label="Reference table" tabindex="0"><table><thead><tr>'+''.join('<th scope="col">'+inline(v)+'</th>' for v in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+inline(v)+'</td>' for v in row)+'</tr>' for row in rows[1:])+'</tbody></table></div>');continue
        match=re.match(r'^(\d+\.|-) (.*)',line)
        if match:
            ordered=match[1]!='-';tag='ol' if ordered else 'ul';start=f' start="{match[1][:-1]}"' if ordered else ''
            items=[]
            while i<len(lines):
                m=re.match(r'^(\d+\.|-) (.*)',lines[i])
                if not m or (m[1]!='-')!=ordered:break
                items.append('<li>'+inline(m[2])+'</li>');i+=1
                if i<len(lines) and not lines[i].strip() and i+1<len(lines) and re.match(r'^(\d+\.|-) ',lines[i+1]):i+=1
            out.append(f'<{tag}{start}>'+''.join(items)+f'</{tag}>');continue
        para=[line.strip()];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(#{1,3} |\s*```|\||\d+\. |- )',lines[i]):
            para.append(lines[i].strip());i+=1
        out.append('<p>'+inline(' '.join(para))+'</p>')
    return '\n'.join(out),toc

SEARCH=[]
for number,(source,target,label,title,description) in enumerate(PAGES):
    md=(SOURCE/source).read_text();body,toc=render(md,source)
    words=len(md.split());minutes=max(1,round(words/180))
    nav=''.join(f'<a href="{p[1]}"'+(' aria-current="page"' if j==number else '')+f'><span class="chapter-number">{j:02}</span><span>{E(p[2])}</span></a>' for j,p in enumerate(PAGES))
    onpage=''.join(f'<a href="#{ident}">{E(t)}</a>' for t,ident in toc)
    for t,ident in toc:SEARCH.append({'title':t,'page':label,'href':target+'#'+ident})
    if number==0:
        cards='<div class="course-grid">'+''.join(f'<a class="course-card" href="{p[1]}"><small>LESSON {j:02}</small><strong>{E(p[2])}</strong><p>{E(p[4])}</p></a>' for j,p in enumerate(PAGES[1:],1))+'</div>'
        body='<div class="callout"><strong>Your route:</strong> understand → trace → verify → operate → change → explain. All eight pages work offline; no clinic server or account is required to read them.</div>'+cards+body
    quiz='<section class="checkpoint" aria-label="Check your understanding"><h2>Pause & explain</h2><p>Answer aloud, then open the explanation.</p>'+''.join(f'<details><summary>{E(q)}</summary><p>{E(a)}</p></details>' for q,a in CHECKS[number])+'</section>'
    prev=f'<a href="{PAGES[number-1][1]}">← {E(PAGES[number-1][2])}</a>' if number else '<span></span>'
    nxt=f'<a href="{PAGES[number+1][1]}">{E(PAGES[number+1][2])} →</a>' if number+1<len(PAGES) else '<a href="index.html">Back to course →</a>'
    page=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="{E(description)}"><title>{E(label)} · Littleleaf Field Guide</title><script src="assets/theme.js"></script><link rel="stylesheet" href="assets/guide.css"><script src="assets/search-index.js" defer></script><script src="assets/guide.js" defer></script></head>
<body data-page="{target}"><a class="skip" href="#main">Skip to lesson</a>
<aside class="sidebar"><a class="brand" href="index.html">littleleaf<span> / learn</span></a><div class="edition">Project field guide · 01</div><label for="guide-search">Find a topic</label><input type="search" id="guide-search" placeholder="Try: hosting or sessions" autocomplete="off"><div class="search-results" aria-live="polite"></div><nav aria-label="Course chapters">{nav}</nav><div class="note">Your path from basic DSA to understanding and maintaining a full-stack clinic project.</div><div class="progress-track"><span id="course-progress" style="width:0%"></span></div><div class="progress-label" id="progress-label">0 of 8 chapters marked complete</div><div class="offline">Offline-ready · No external libraries<br>Project snapshot: 6 October 2026</div></aside>
<main class="workspace" id="main"><div class="topline"><span>Littleleaf / Engineering handbook</span><div class="guide-actions"><button type="button" data-theme-toggle aria-pressed="false" hidden>Dark mode</button><button type="button" data-print>Print / Save PDF</button></div></div><header class="hero"><div class="eyebrow">Chapter {number:02} / {E(label)}</div><h1>{E(title)}</h1><p class="lede">{E(description)}</p><div class="meta"><span class="pill">{minutes} min reading + practice</span><span class="pill">Beginner friendly</span><span class="pill">Based on your actual repository</span></div></header>
<noscript><p class="no-js">All lessons and diagrams remain readable. Enable JavaScript for search, copy buttons, progress, and the booking simulator.</p></noscript>
<div class="reading-layout"><article>{body}{quiz}<footer class="lesson-footer"><div class="complete"><p>Finish the exercise before marking this chapter complete.</p><button type="button" class="primary" data-complete aria-pressed="false">Mark complete</button></div><nav class="pager" aria-label="Adjacent chapters">{prev}{nxt}</nav></footer></article><aside class="toc" aria-label="On this page"><strong>On this page</strong>{onpage}</aside></div><p class="footer-note">Littleleaf learning edition · Working MVP, not a production-readiness certification. Examples and diagrams distinguish current behavior from future design.</p></main></body></html>'''
    (ROOT/target).write_text(page)
(ROOT/'assets/search-index.js').write_text('window.GUIDE_SEARCH = '+json.dumps(SEARCH,ensure_ascii=False)+';\n')
print(f'Built {len(PAGES)} pages and {len(SEARCH)} searchable sections in {ROOT}')
