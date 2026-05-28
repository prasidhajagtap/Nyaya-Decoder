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
      max_tokens: 1500,
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
    const raw = await callGroq(prompt);
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
    document.getElementById('erMsg').textContent = e.message || 'Search failed. Check your API key or try again.';
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
    const translated = await callGroq(prompt);
    txt.textContent = translated.trim();
  } catch (e) {
    txt.textContent = e.message || 'Translation failed. Please try again.';
  } finally {
    btnHi.disabled = false;
    btnMr.disabled = false;
  }
}
