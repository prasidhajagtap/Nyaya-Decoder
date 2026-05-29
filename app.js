// -----------------------------------------------
// REPLACE WITH YOUR CLOUDFLARE WORKER URL
// No API key here. Key is safe inside Cloudflare.
const WORKER = 'https://law-made-simple-proxy.jkuku7866.workers.dev';
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

async function doSearch() {
  const q = document.getElementById('q').value.trim();
  if (!q) return;

  resetUI();
  show('ld');
  document.getElementById('sBtn').disabled = true;
  curExp = ''; curFullText = '';

  try {
    const raw = await callWorker({ type: 'search', query: q });
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Could not read response. Try again.');
    const r = JSON.parse(m[0]);

    document.getElementById('rTitle').textContent = r.lawTitle || q;
    document.getElementById('rBadge').textContent = r.section || 'Reference';
    document.getElementById('rLaw').textContent = r.actualText || 'Text not available.';
    document.getElementById('rExp').textContent = r.simpleExplanation || '';
    document.getElementById('rMenText').textContent = r.menContext || '';
    makeList(document.getElementById('rJudgeList'), r.keyJudgments);
    makeList(document.getElementById('rStepsList'), r.stepsForMen);

    // Show amendment note if present
    const amendBox = document.getElementById('rAmend');
    if (amendBox) {
      if (r.amendmentNote && r.amendmentNote !== 'null') {
        amendBox.textContent = '📋 ' + r.amendmentNote;
        amendBox.style.display = 'block';
      } else {
        amendBox.style.display = 'none';
      }
    }
    curExp = r.simpleExplanation || '';
    curFullText = r.actualText || '';

    // India Code verify link
    const lawQuery = encodeURIComponent((r.lawTitle || q).replace(/section/gi,'').trim());
    const indiaCodeUrl = 'https://www.indiacode.nic.in/search?searchstring=' + lawQuery;
    const verifyLink = document.getElementById('verifyLink');
    if (verifyLink) verifyLink.href = indiaCodeUrl;

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
