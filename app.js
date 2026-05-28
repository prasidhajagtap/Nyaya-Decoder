// -----------------------------------------------
// PUT YOUR GEMINI API KEY HERE
const GEMINI_KEY = 'AIzaSyBEHH8dx5uGCGfy3GWRaBnU9_cvN99SWUE';
// -----------------------------------------------

let curExp = '';
let curFullText = '';
let curLang = '';
let theme = 'light';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('tIco').textContent = theme === 'light' ? '🌙' : '☀️';
  document.getElementById('tLbl').textContent = theme === 'light' ? 'Dark' : 'Light';
}

function fill(t) {
  document.getElementById('q').value = t;
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

async function doSearch() {
  const q = document.getElementById('q').value.trim();
  if (!q) return;

  resetUI();
  show('ld');
  document.getElementById('sBtn').disabled = true;
  curExp = '';
  curFullText = '';

  const prompt = `You are a senior Indian legal expert with deep knowledge of all Indian laws past and present.

The user is searching for: "${q}"

Respond ONLY with a valid JSON object. No markdown fences. No preamble. Raw JSON only.

{
  "lawTitle": "Full official name of the Act and section",
  "section": "Section number or reference e.g. Section 498A IPC",
  "actualText": "The actual verbatim statutory text of this law exactly as it appears in the statute. Include full text of the section.",
  "simpleExplanation": "Plain English explanation under 100 words. Zero legal jargon. Explain like the person has never read a law. Be direct and factual. What does this law mean for a common man?",
  "context": "One sentence: in what real-life situation is this law typically applied or misused?"
}

You must know all Indian laws: BNS 2023, BNSS 2023, BSA 2023, IPC 1860, CrPC 1973, Indian Evidence Act 1872, Protection of Women from Domestic Violence Act 2005, POCSO Act 2012, Dowry Prohibition Act 1961, Hindu Marriage Act 1955, Special Marriage Act 1954, Hindu Succession Act 1956, Muslim Personal Law, Christian Personal Law, Guardians and Wards Act 1890, Maintenance and Welfare of Parents Act, IT Act 2000, Companies Act, Income Tax Act, GST Act, RTI Act, Constitution of India, all Fundamental Rights, all Directive Principles, and every other Central or State law from the beginning of Indian legal history including colonial era laws.`;

  try {
    const raw = await callGemini(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Parse error');
    const r = JSON.parse(m[0]);

    document.getElementById('rTitle').textContent = r.lawTitle || q;
    document.getElementById('rBadge').textContent = r.section || 'Reference';
    document.getElementById('rLaw').textContent = r.actualText || 'Text not available.';
    document.getElementById('rExp').textContent = r.simpleExplanation || '';
    document.getElementById('rCtx').textContent = r.context ? '📌 ' + r.context : '';

    curExp = r.simpleExplanation || '';
    curFullText = r.actualText || '';

    hide('ld');
    show('res');
    document.getElementById('res').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    hide('ld');
    document.getElementById('erMsg').textContent = 'Search failed. Check your API key or try again.';
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
    curLang = '';
    return;
  }

  active.classList.add('active');
  other.classList.remove('active');
  curLang = code;
  btnHi.disabled = true;
  btnMr.disabled = true;
  lbl.textContent = label;
  txt.textContent = 'Translating with full context...';
  wrap.classList.add('on');

  // Use Gemini for context-aware translation. Not word-for-word.
  const prompt = `You are an expert Indian legal translator fluent in ${name}.

Here is the original law text for context:
"${curFullText}"

Here is the simple English explanation that must be translated:
"${curExp}"

Translate the simple explanation into ${name}.

Critical rules:
- Do NOT translate word by word
- First understand the complete legal meaning and real-life impact
- Then write the explanation naturally in ${name} as a local lawyer would explain it to a common man in India
- Use conversational everyday ${name}, not formal textbook language
- Every legal detail must be preserved with full accuracy
- Return ONLY the translated explanation. Nothing else. No labels. No quotes.`;

  try {
    const translated = await callGemini(prompt);
    txt.textContent = translated.trim();
  } catch {
    txt.textContent = 'Translation failed. Please try again.';
  } finally {
    btnHi.disabled = false;
    btnMr.disabled = false;
  }
}
