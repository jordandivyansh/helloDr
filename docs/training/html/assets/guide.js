(() => {
  const storageKey = 'littleleaf-guide-progress-v1';
  let completed = [];
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) completed = saved.filter(v => typeof v === 'string'); } catch {}
  const knownPages = [...document.querySelectorAll('.sidebar nav a')].map(a => a.getAttribute('href'));
  completed = [...new Set(completed)].filter(v => knownPages.includes(v));
  const page = document.body.dataset.page;
  const complete = document.querySelector('[data-complete]');
  function progress() {
    document.getElementById('course-progress').style.width = `${completed.length / 8 * 100}%`;
    document.getElementById('progress-label').textContent = `${completed.length} of 8 chapters marked complete`;
    complete.textContent = completed.includes(page) ? 'Completed ✓ · Undo' : 'Mark complete';
    complete.setAttribute('aria-pressed', String(completed.includes(page)));
  }
  complete.addEventListener('click', () => {
    completed = completed.includes(page) ? completed.filter(p => p !== page) : [...completed, page];
    try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch {}
    progress();
  });
  progress();
  document.querySelector('[data-print]').addEventListener('click', () => window.print());
  document.querySelectorAll('.copy').forEach(button => button.addEventListener('click', async () => {
    const text = button.closest('.codebox').querySelector('code').textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(button.closest('.codebox').querySelector('code'));
        selection.removeAllRanges(); selection.addRange(range);
        if (!document.execCommand('copy')) throw new Error('Select manually');
        selection.removeAllRanges();
      }
      button.textContent = 'Copied ✓';
    } catch { button.textContent = 'Select code to copy'; }
    setTimeout(() => { button.textContent = 'Copy'; }, 2200);
  }));
  const input = document.getElementById('guide-search');
  const results = document.querySelector('.search-results');
  input.addEventListener('input', () => {
    results.replaceChildren();
    const query = input.value.trim().toLowerCase();
    if (!query) return;
    const matches = (window.GUIDE_SEARCH || []).filter(item => `${item.title} ${item.page}`.toLowerCase().includes(query)).slice(0,8);
    if (!matches.length) { results.textContent = 'No matching topic. Try a shorter word.'; return; }
    matches.forEach(item => { const a = document.createElement('a'); a.href = item.href; a.textContent = `${item.page} · ${item.title}`; results.append(a); });
  });
  const sim = document.querySelector('[data-simulator]');
  if (!sim) return;
  const labels = ['Parent selects a child and a future slot.', 'Browser sends JSON and the session cookie.', 'Server resolves the session to a user.', 'Server validates input, child access, and published availability.', 'Database accepts the unique slot; an audit event follows.', '201 Created — booking saved; the portal reloads.'];
  const models = {
    success: { stages:[0,1,2,3,4,5], labels },
    session: { stages:[0,1,2,5], labels:[labels[0],labels[1],'Session is missing or expired.','401 Unauthorized — sign in; no booking inserted.'] },
    family: { stages:[0,1,2,3,5], labels:[labels[0],labels[1],labels[2],'The requested child is outside this parent’s scope.','404 Not found — access denied; no booking inserted.'] },
    conflict: { stages:[0,1,2,3,4,5], labels:[...labels.slice(0,4),'A competing insert already occupies this slot.','409 Conflict — choose another time; no duplicate inserted.'] }
  };
  let scenario = 'success', step = 0;
  const nodes = [...sim.querySelectorAll('.sim-step')];
  const back = sim.querySelector('[data-back]'), next = sim.querySelector('[data-next]');
  function render() {
    const model = models[scenario];
    nodes.forEach((node,index) => {
      const visited = model.stages.indexOf(index);
      node.classList.toggle('active', visited === step);
      node.classList.toggle('passed', visited >= 0 && visited < step);
      if (visited === step) node.setAttribute('aria-current','step'); else node.removeAttribute('aria-current');
    });
    sim.querySelector('.sim-status').textContent = model.labels[step];
    sim.querySelector('[data-count]').textContent = `${step+1} / ${model.stages.length}`;
    back.disabled = step === 0; next.disabled = step === model.stages.length-1;
  }
  sim.querySelector('select').addEventListener('change',event => { scenario = event.target.value; step=0; render(); });
  back.addEventListener('click',()=>{step=Math.max(0,step-1);render();});
  next.addEventListener('click',()=>{step=Math.min(models[scenario].stages.length-1,step+1);render();});
  render();
})();
