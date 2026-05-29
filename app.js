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

function fillSearch(actValue, section) {
  const sel = document.getElementById('actSelect');
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value.toLowerCase().includes(actValue.toLowerCase())) {
      sel.selectedIndex = i; break;
    }
  }
  document.getElementById('sectionInput').value = section;
  doSearch();
}

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
    if (!item || item === 'null') return;
    const li = document.createElement('li');
    li.textContent = item;
    el.appendChild(li);
  });
}

async function doSearch() {
  const act     = document.getElementById('actSelect').value.trim();
  const section = document.getElementById('sectionInput').value.trim();

  if (!section) {
    document.getElementById('erMsg').textContent = 'Please enter a section or article number.';
    show('er'); return;
  }

  resetUI();
  show('ld');

  // Update loading message to show live fetch is happening
  const ldMsg = document.querySelector('#ld p');
  if (ldMsg) ldMsg.textContent = 'Fetching live content from Indian Kanoon…';

  document.getElementById('sBtn').disabled = true;
  curExp = ''; curFullText = '';

  try {
    // Send act and section separately so worker builds precise Indian Kanoon URL
    const raw = await callWorker({
      type: 'search',
      act,
      section,
      query: `Section ${section} of ${act}`
    });

    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Could not read response. Please try again.');
    const r = JSON.parse(m[0]);

    if (r.found === false) {
      document.getElementById('erMsg').innerHTML =
        '<strong>Not found.</strong> ' + (r.notFoundReason || '') +
        (r.suggestion ? '<br><em>Suggestion: ' + r.suggestion + '</em>' : '');
      show('er'); hide('ld');
      return;
    }

    document.getElementById('rTitle').textContent   = r.lawTitle || `Section ${section}`;
    document.getElementById('rBadge').textContent   = r.section  || `Section ${section}`;
    document.getElementById('rLaw').textContent     = r.lawSummary || '';
    document.getElementById('rExp').textContent     = r.simpleExplanation || '';
    document.getElementById('rMenText').textContent = r.menContext || '';
    makeList(document.getElementById('rJudgeList'), r.keyJudgments);
    makeList(document.getElementById('rStepsList'), r.stepsForMen);

    // Source note
    const sourceEl = document.getElementById('rSource');
    if (sourceEl) sourceEl.textContent = r.sourceNote || '';

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

    // Indian Kanoon verify link
    const ikQuery = `section ${section} ${act}`;
    const verifyLink = document.getElementById('verifyLink');
    if (verifyLink) verifyLink.href = 'https://indiankanoon.org/search/?formInput=' + encodeURIComponent(ikQuery) + '&doctypes=acts';

    curExp      = r.simpleExplanation || '';
    curFullText = r.lawSummary || '';

    hide('ld'); show('res');
    document.getElementById('res').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    hide('ld');
    document.getElementById('erMsg').textContent = e.message || 'Search failed. Please try again.';
    show('er');
  } finally {
    document.getElementById('sBtn').disabled = false;
    if (ldMsg) ldMsg.textContent = 'Fetching live content from Indian Kanoon…';
  }
}

async function doTranslate(code, name, label) {
  if (!curExp) return;

  const btnHi  = document.getElementById('btnHi');
  const btnMr  = document.getElementById('btnMr');
  const wrap   = document.getElementById('tlWrap');
  const lbl    = document.getElementById('tlLbl');
  const txt    = document.getElementById('tlText');
  const active = code === 'hi' ? btnHi : btnMr;
  const other  = code === 'hi' ? btnMr  : btnHi;

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
    txt.textContent = e.message || 'Translation failed. Please try again.';
  } finally {
    btnHi.disabled = false; btnMr.disabled = false;
  }
}
