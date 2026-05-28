// -----------------------------------------------
// PUT YOUR GROQ API KEY HERE
// Free key at: console.groq.com
const GROQ_KEY = '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';
// -----------------------------------------------
let curExp = '';
let curFullText = '';
let curLang = '';
let theme = 'light';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(prompt, retries = 2) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (res.status === 429) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 4000));
      return callGroq(prompt, retries - 1);
    }
    throw new Error('Too many requests. Wait a few seconds and try again.');
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
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

  const prompt = `You are a senior Indian legal expert. Search for this: "${q}"

Reply ONLY with raw JSON. No markdown. No backticks. No explanation outside JSON.

{
  "lawTitle": "Full official name of the Act and section title",
  "section": "e.g. Section 498A IPC or BNS Section 85",
  "actualText": "Complete verbatim statutory text exactly as written in the Indian statute. Use line breaks between clauses using \\n",
  "simpleExplanation": "Plain English. Under 80 words. No jargon. What does this law mean for a common man on the street?",
  "menContext": "2-3 sentences. How is this law commonly misused against innocent men in India? What should men know about their rights under this law?",
  "keyJudgments": [
    "Case name and year: one sentence on what this judgment decided and how it protects men",
    "Case name and year: one sentence on what this judgment decided and how it protects men",
    "Case name and year: one sentence on what this judgment decided and how it protects men"
  ],
  "stepsForMen": [
    "First immediate step a man should take",
    "Second step",
    "Third step",
    "Fourth step",
    "Fifth step"
  ]
}

Cover all Indian laws: BNS 2023, BNSS 2023, BSA 2023, IPC 1860, CrPC 1973, Indian Evidence Act 1872, PWDVA 2005, POCSO 2012, Dowry Prohibition Act 1961, Hindu Marriage Act 1955, Special Marriage Act 1954, Hindu Succession Act, IT Act 2000, Constitution of India, and all other Indian laws.`;

  try {
    const raw = await callGroq(prompt);
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

async function translate(code, name, label) {
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

  const prompt = `You are an expert Indian legal translator fluent in ${name}.

Law context: "${curFullText}"

Translate this English explanation into ${name}:
"${curExp}"

Rules:
- Understand full legal meaning first. Then write naturally in ${name}.
- Write as a local lawyer explaining to a common man. Conversational tone.
- Preserve every legal detail accurately.
- Return ONLY the translated text. No labels. No quotes. No extra text.`;

  try {
    const out = await callGroq(prompt);
    txt.textContent = out.trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    txt.textContent = e.message || 'Translation failed. Try again.';
  } finally {
    btnHi.disabled = false; btnMr.disabled = false;
  }
}
