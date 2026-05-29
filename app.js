// -----------------------------------------------
// REPLACE WITH YOUR CLOUDFLARE WORKER URL
// No API key here. Key is safe inside Cloudflare.
const WORKER = 'https://law-made-simple-proxy.jkuku7866.workers.dev';
// -----------------------------------------------
// -----------------------------------------------
let curExp = '';
let curFullText = '';
let curLang = '';
let theme = 'light';

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

function fill(t) { document.getElementById('q').value = t; doSearch(); }
function show(id) { document.getElementById(id).classList.add('on'); }
function hide(id) { document.getElementById(id).classList.remove('on'); }

function resetUI() {
  hide('ld'); hide('res'); hide('er');
  document.getElementById('tlWrap').classList.remove('on');
  document.getElementById('btnHi').classList.remove('active');
  document.getElementById('btnMr').classList.remove('active');
  curLang = '';
}

function makeList(el, items) {
  el.innerHTML = '';
  (items || []).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
}

function normalizeQuery(q) {
  // Fix common shorthand: BNSS144 -> BNSS Section 144, BNS85 -> BNS Section 85
  q = q.replace(/(BNS|BNSS|BSA|IPC|CrPC)\s*(\d+)/gi, (_, act, num) => act.toUpperCase() + ' Section ' + num);
  // Fix sec/s. shorthand: sec144 -> Section 144
  q = q.replace(/(sec|s\.)\s*(\d+)/gi, 'Section $2');
  // Normalize known act names
  q = q.replace(/bnss/gi, 'BNSS');
  q = q.replace(/bns/gi, 'BNS');
  q = q.replace(/bsa/gi, 'BSA');
  q = q.replace(/ipc/gi, 'IPC');
  q = q.replace(/cr\.?pc/gi, 'CrPC');
  return q.trim();
}

async function doSearch() {
  const q = document.getElementById('q').value.trim();
  if (!q) return;

  resetUI();
  show('ld');
  document.getElementById('sBtn').disabled = true;
  curExp = ''; curFullText = '';

  try {
    const nq = normalizeQuery(q);
  const raw = await callWorker({ type: 'search', query: nq });
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Could not read response. Try again.');
    const r = JSON.parse(m[0]);

    // Law not found — show clear message, do not render empty result
    if (r.found === false) {
      document.getElementById('erMsg').innerHTML =
        '<strong>Law not found.</strong> ' +
        (r.notFoundReason || '') +
        (r.suggestion ? '<br><em>Try: ' + r.suggestion + '</em>' : '');
      show('er');
      hide('ld');
      return;
    }

    // Populate result
    document.getElementById('rTitle').textContent = r.lawTitle || q;
    document.getElementById('rBadge').textContent = r.section || 'Reference';
    document.getElementById('rLaw').textContent = r.actualText || 'Text not available.';
    document.getElementById('rExp').textContent = r.simpleExplanation || '';
    document.getElementById('rMenText').textContent = r.menContext || '';
    makeList(document.getElementById('rJudgeList'), r.keyJudgments);
    makeList(document.getElementById('rStepsList'), r.stepsForMen);

    // Amendment note
    const amendBox = document.getElementById('rAmend');
    if (amendBox) {
      if (r.amendmentNote && r.amendmentNote !== 'null') {
        amendBox.textContent = '📋 Recent Amendment: ' + r.amendmentNote;
        amendBox.style.display = 'block';
      } else {
        amendBox.style.display = 'none';
      }
    }

    // Indian Kanoon verify link (clean search term — section + law name only)
    const searchTerm = (r.section || '') + ' ' + (r.lawTitle || q);
    const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const verifyLink = document.getElementById('verifyLink');
    if (verifyLink) verifyLink.href = 'https://indiankanoon.org/search/?formInput=' + encodeURIComponent(cleanTerm);

    curExp = r.simpleExplanation || '';
    curFullText = r.actualText || '';

    hide('ld'); show('res');
    document.getElementById('res').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    hide('ld');
    document.getElementById('erMsg').textContent = e.message || 'Search failed. Try again.';
    show('er');
  } finally {
    document.getElementById('sBtn').disabled = false;
  }
}

async function doTranslate(code, name, label) {
  if (!curExp) return;

  const btnHi = document.getElementById('btnHi');
  const btnMr = document.getElementById('btnMr');
  const wrap  = document.getElementById('tlWrap');
  const lbl   = document.getElementById('tlLbl');
  const txt   = document.getElementById('tlText');
  const active = code === 'hi' ? btnHi : btnMr;
  const other  = code === 'hi' ? btnMr : btnHi;

  if (curLang === code) {
    active.classList.remove('active');
    wrap.classList.remove('on');
    curLang = ''; return;
  }

  active.classList.add('active');
  other.classList.remove('active');
  curLang = code;
  btnHi.disabled = true; btnMr.disabled = true;
  lbl.textContent = label;
  txt.textContent = 'Translating...';
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
    txt.textContent = e.message || 'Translation failed. Try again.';
  } finally {
    btnHi.disabled = false; btnMr.disabled = false;
  }
}
