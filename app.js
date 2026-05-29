// -----------------------------------------------
// REPLACE WITH YOUR CLOUDFLARE WORKER URL
// No API key here. Key is safe inside Cloudflare.
const WORKER = 'https://law-made-simple-proxy.jkuku7866.workers.dev';
// -----------------------------------------------
// REPLACE WITH YOUR CLOUDFLARE WORKER URL
let curExp      = '';
let curFullText = '';
let curLang     = '';
let theme       = 'light';

async function callWorker(payload, retries = 2) {
  const res = await fetch(WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.status === 429) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 4000));
      return callWorker(payload, retries - 1);
    }
    throw new Error('Too many requests. Wait a few seconds and try again.');
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || '';
}

function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('tIco').textContent = theme === 'light' ? '🌙' : '☀️';
  document.getElementById('tLbl').textContent = theme === 'light' ? 'Dark' : 'Light';
}

// Fill from chip — matches partial act name or uses 'all'
function fillSearch(actHint, section) {
  const sel = document.getElementById('actSelect');
  let matched = false;
  for (let i = 0; i < sel.options.length; i++) {
    const v = sel.options[i].value.toLowerCase();
    if (v !== 'all' && v.includes(actHint.toLowerCase())) {
      sel.selectedIndex = i;
      matched = true;
      break;
    }
  }
  if (!matched) {
    // Default to first option (All Acts) if no match
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === 'all') { sel.selectedIndex = i; break; }
    }
  }
  document.getElementById('sectionInput').value = section;
  doSearch();
}

function show(id) { document.getElementById(id).classList.add('on'); }
function hide(id) { document.getElementById(id).classList.remove('on'); }

function setMsg(msg) {
  const el = document.getElementById('ldMsg');
  if (el) el.textContent = msg;
}

function resetUI() {
  hide('ld'); hide('res'); hide('er');
  const tlWrap = document.getElementById('tlWrap');
  if (tlWrap) tlWrap.classList.remove('on');
  const btnHi = document.getElementById('btnHi');
  const btnMr = document.getElementById('btnMr');
  if (btnHi) btnHi.classList.remove('active');
  if (btnMr) btnMr.classList.remove('active');
  curLang = '';
}

function makeList(el, items) {
  if (!el) return;
  el.innerHTML = '';
  (items || []).forEach(item => {
    if (!item || item === 'null') return;
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
}

async function doSearch() {
  const actEl     = document.getElementById('actSelect');
  const secEl     = document.getElementById('sectionInput');
  const act       = actEl  ? actEl.value.trim()  : 'all';
  const section   = secEl  ? secEl.value.trim()  : '';

  if (!section) {
    document.getElementById('erMsg').textContent = 'Please enter a section or article number.';
    show('er'); return;
  }

  resetUI();
  setMsg('Searching Indian law database…');
  show('ld');
  document.getElementById('sBtn').disabled = true;
  curExp = ''; curFullText = '';

  try {
    const raw = await callWorker({
      type: 'search',
      act: act === 'all' ? '' : act,
      section,
      query: act === 'all'
        ? `Section ${section} across all Indian Acts`
        : `Section ${section} of ${act}`
    });

    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Could not read response. Please try again.');
    const r = JSON.parse(m[0]);

    // Not found
    if (r.found === false) {
      document.getElementById('erMsg').innerHTML =
        '<strong>Not found.</strong> ' + (r.notFoundReason || 'This section could not be found.') +
        (r.suggestion ? '<br><em>Suggestion: ' + r.suggestion + '</em>' : '');
      show('er'); hide('ld');
      return;
    }

    // Populate
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
    setText('rTitle',   r.lawTitle         || `Section ${section}`);
    setText('rBadge',   r.section          || `Section ${section}`);
    setText('rLaw',     r.lawSummary       || '');
    setText('rExp',     r.simpleExplanation || '');
    setText('rMenText', r.menContext        || '');
    makeList(document.getElementById('rJudgeList'), r.keyJudgments);
    makeList(document.getElementById('rStepsList'), r.stepsForMen);

    // Amendment note
    const amendBox = document.getElementById('rAmend');
    if (amendBox) {
      if (r.amendmentNote && r.amendmentNote !== 'null') {
        amendBox.textContent   = '📋 Recent Amendment: ' + r.amendmentNote;
        amendBox.style.display = 'block';
      } else {
        amendBox.style.display = 'none';
      }
    }

    // Indian Kanoon verify link
    const ikQ        = `section ${section} ${act === 'all' ? '' : act}`.trim();
    const verifyLink = document.getElementById('verifyLink');
    if (verifyLink) verifyLink.href = 'https://indiankanoon.org/search/?formInput=' + encodeURIComponent(ikQ) + '&doctypes=acts';

    curExp      = r.simpleExplanation || '';
    curFullText = r.lawSummary        || '';

    hide('ld'); show('res');
    document.getElementById('res').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    hide('ld');
    document.getElementById('erMsg').textContent = e.message || 'Search failed. Please try again.';
    show('er');
  } finally {
    document.getElementById('sBtn').disabled = false;
  }
}

async function doTranslate(code, name, label) {
  if (!curExp) return;

  const btnHi  = document.getElementById('btnHi');
  const btnMr  = document.getElementById('btnMr');
  const wrap   = document.getElementById('tlWrap');
  const lbl    = document.getElementById('tlLbl');
  const txt    = document.getElementById('tlText');
  if (!btnHi || !btnMr || !wrap || !lbl || !txt) return;

  const active = code === 'hi' ? btnHi : btnMr;
  const other  = code === 'hi' ? btnMr  : btnHi;

  // Toggle off if already active
  if (curLang === code) {
    active.classList.remove('active');
    wrap.classList.remove('on');
    curLang = ''; return;
  }

  active.classList.add('active');
  other.classList.remove('active');
  curLang = code;
  btnHi.disabled = true;
  btnMr.disabled = true;
  lbl.textContent = label;
  txt.textContent = 'Translating with full context…';
  wrap.classList.add('on');

  try {
    const translated = await callWorker({
      type: 'translate',
      query: curExp,
      language: name,
      lawContext: curFullText
    });
    txt.textContent = translated.trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    txt.textContent = e.message || 'Translation failed. Please try again.';
  } finally {
    btnHi.disabled = false;
    btnMr.disabled = false;
  }
}
