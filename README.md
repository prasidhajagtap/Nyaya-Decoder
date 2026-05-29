# Law Made Simple — Project Documentation

**Live URL:** https://prasidhajagtap.github.io/Nyaya-Decoder/
**Repository:** https://github.com/prasidhajagtap/Nyaya-Decoder
**Last Updated:** May 2025
**Current Version:** v2.0

---

## Project Purpose

Law Made Simple is a free, public-facing web tool that helps men in India search and understand any Indian law in plain language. It addresses the critical gap where men facing false accusations or gender-biased legal situations cannot access or understand their rights due to complex legal language.

Every search returns a law summary, plain language explanation, how the law affects men specifically, key court judgments, and a step-by-step action plan. Explanations can be translated to Hindi and Marathi with full legal context preserved.

---

## Tech Stack

| Layer | Tool | Cost |
|---|---|---|
| Hosting | GitHub Pages | Free |
| API Proxy + Security | Cloudflare Workers (free tier) | Free |
| Real-time Law Search | Tavily Search API | Free (1000 searches/month) |
| AI Explanation + Translation | Groq API — llama-3.3-70b-versatile | Free (14,400 req/day) |
| Fonts | Google Fonts — Roboto Slab + Open Sans | Free |
| Database | None | — |
| Backend | None | — |

---

## File Structure

```
Nyaya-Decoder/
├── index.html       # Main HTML. All page sections and structure.
├── style.css        # All styles. Light and dark theme. Mobile responsive.
├── app.js           # All JavaScript. Calls Cloudflare Worker. No API keys.
├── worker.js        # Cloudflare Worker. Deployed to Cloudflare ONLY.
│                    # NOT pushed to GitHub repo. Contains Tavily + Groq logic.
└── UPDATES.md       # This file. Project documentation and update log.
```

> `worker.js` is deployed directly to Cloudflare. Never push it to GitHub.

---

## Security Architecture

```
User Browser
    |
    | HTTPS POST (section + act only, no keys)
    v
app.js on GitHub Pages
    |
    | HTTPS POST (structured query)
    v
Cloudflare Worker (worker.js)
    |
    |─── HTTPS POST → Tavily API (real-time law search)
    |         ↓ returns live law text from Indian Kanoon,
    |           India Code, legislative.gov.in
    |
    |─── HTTPS POST → Groq API (explanation + translation)
              ↓ returns structured JSON with all sections
    |
    v
app.js → renders result to user
```

All API keys (GROQ_KEY, TAVILY_KEY) stored as encrypted secrets in Cloudflare. Never sent to browser. Never in GitHub repo. Never logged.

---

## Cloudflare Worker Setup

1. Go to cloudflare.com. Sign up free.
2. Workers and Pages. Create Worker. Name: `law-made-simple-proxy`. Deploy.
3. Edit Code. Paste full contents of `worker.js`. Deploy.
4. Settings tab. Variables and Secrets. Add two secrets:

| Variable Name | Value | Where to get it |
|---|---|---|
| `GROQ_KEY` | Your Groq API key | console.groq.com (free) |
| `TAVILY_KEY` | Your Tavily API key | app.tavily.com (free) |

5. For each: Type = Secret (Encrypt). Click Save and Deploy.
6. Copy Worker URL. Paste into `app.js` line 3.

---

## API Details

### Groq
- Model: llama-3.3-70b-versatile
- Purpose: AI explanation, men's context, judgments, steps, translation
- Free tier: 30 req/minute, 14,400 req/day
- Key: Cloudflare secret `GROQ_KEY`
- Get key: console.groq.com

### Tavily
- Purpose: Real-time search of Indian legal databases
- Searches: indiankanoon.org, indiacode.nic.in, legislative.gov.in, sci.gov.in, mha.gov.in
- Free tier: 1000 searches/month
- Paid tier: $30/month for 30,000 searches
- Key: Cloudflare secret `TAVILY_KEY`
- Get key: app.tavily.com
- Fallback: If Tavily fails or quota runs out, worker falls back to Groq knowledge automatically. Site never breaks.

---

## How Real-Time Search Works

Every search does two things in sequence inside the Cloudflare Worker:

1. **Tavily search** — queries `indiankanoon.org`, `indiacode.nic.in`, `legislative.gov.in` with the exact section and act. Returns live law content from authoritative sources.

2. **Groq explanation** — receives the live content as context. Generates law summary, simple explanation, men's context, key judgments, steps, and amendment note based on real content. Not from training data alone.

Result card shows a source note:
- "Content fetched live from Indian legal databases." — Tavily succeeded.
- "Live fetch unavailable. Based on AI training knowledge. Verify on Indian Kanoon." — Tavily failed, Groq fallback used.

---

## Search Interface

### Dropdown Acts Available

**New Laws 2023**
- BNS 2023 — Bharatiya Nyaya Sanhita (replaced IPC 1860)
- BNSS 2023 — Bharatiya Nagarik Suraksha Sanhita (replaced CrPC 1973)
- BSA 2023 — Bharatiya Sakshya Adhiniyam (replaced Evidence Act 1872)

**Criminal Laws**
- IPC 1860 — Indian Penal Code
- CrPC 1973 — Code of Criminal Procedure
- Indian Evidence Act 1872

**Family and Personal Laws**
- Hindu Marriage Act 1955
- Special Marriage Act 1954
- Hindu Succession Act 1956
- Guardians and Wards Act 1890
- Muslim Personal Law 1937

**Protection Acts**
- DV Act 2005 — Domestic Violence
- POCSO Act 2012
- Dowry Prohibition Act 1961
- POSH Act 2013

**Other Laws**
- Constitution of India
- RTI Act 2005
- IT Act 2000
- Maintenance of Parents Act 2007
- Indian Contract Act 1872
- CPC 1908 — Civil Procedure

**Special Option**
- 🔍 All Acts / I am not sure — Groq identifies the correct Act from section number

---

## Result Sections Per Search

| Section | Content |
|---|---|
| 📜 Law Summary | Faithful AI summary based on live law content. Not verbatim. Disclaimer shown. |
| 💡 Simple Explanation | Plain English. Under 80 words. Zero jargon. |
| 🛡️ How This Affects Men | Misuse patterns against men. Men's rights under this section. |
| ⚖️ Key Court Judgments | Real verified Supreme Court and High Court cases. |
| 🚨 Steps to Protect Yourself | Numbered immediate action plan for men. |
| 📋 Amendment Note | Shown only if a recent confirmed amendment exists. |
| 🔗 Verify on Indian Kanoon | Direct link to exact section on indiankanoon.org. Always shown. |

Translation of Simple Explanation available in Hindi and Marathi. Both use Groq with full law summary passed as context for accurate, non-word-for-word translation.

---

## How to Deploy Updates

```bash
# Make changes locally in VS Code
git add index.html style.css app.js UPDATES.md
git commit -m "describe what changed"
git push
```

GitHub Pages auto-deploys on push. Live in 1 to 2 minutes.

If `worker.js` changed, re-deploy manually to Cloudflare (Edit Code, paste, Deploy).
`worker.js` is NEVER pushed to GitHub.

---

## How to Rotate API Keys

### Groq key
1. console.groq.com. API Keys. Create new key.
2. Cloudflare. Worker. Settings. Variables and Secrets. Edit `GROQ_KEY`. Save and Deploy.

### Tavily key
1. app.tavily.com. API Keys. Create new key.
2. Cloudflare. Worker. Settings. Variables and Secrets. Edit `TAVILY_KEY`. Save and Deploy.

---

## Known Limitations

| Item | Status | Notes |
|---|---|---|
| Tavily free tier: 1000 searches/month | Active limit | Upgrade to $30/month if traffic grows. Or apply for Indian Kanoon API (free for non-commercial). |
| Law summary is not verbatim | By design | LLMs cannot reliably reproduce verbatim text. Summary + Indian Kanoon link is the correct approach. |
| AI-generated judgments | Risk | Model prompted to use real cases only. Always verify critical cases independently. |
| Translation covers Simple Explanation only | By design | Full result translation is in roadmap. |

---

## Future Upgrade: Indian Kanoon API

For a fully authoritative solution, apply for the **Indian Kanoon API** at `developer.indiankanoon.org`. It provides:
- Actual verbatim statute text
- Complete case law database
- Regular updates from government sources
- Free for non-commercial use

This would replace Tavily for law text fetching and eliminate any remaining accuracy concerns.

---

## Pending Updates

Add items here before next session with Claude.

- [ ] ...
- [ ] ...
- [ ] ...

---

## Full Version History

### v2.0 — May 2025 — Real-Time Law Search via Tavily
- Added Tavily Search API in Cloudflare Worker for live content from Indian legal databases
- Worker now searches indiankanoon.org, indiacode.nic.in, legislative.gov.in in real time
- Groq receives live content as context, not just training knowledge
- Source note on every result: shows whether content came from live fetch or AI knowledge
- Graceful fallback: if Tavily fails, Groq knowledge used automatically. Site never breaks.
- Added TAVILY_KEY as second Cloudflare encrypted secret alongside GROQ_KEY

### v1.9 — May 2025 — Structured Search with Act Dropdown
- Replaced free text search with dropdown (Act selection) + section number input
- Dropdown covers all major Indian Acts in categorised groups
- Added "All Acts / I am not sure" as first option for users unsure of Act name
- Search builds precise query: "Section X of Act Y" for accurate model response
- Quick chips updated to fill both dropdown and section field on click
- Groq prompt rebuilt with explicit section-level knowledge of BNS, BNSS, BSA, IPC, CrPC
- Jina AI dependency removed (unreliable in Cloudflare Workers)
- Found-false threshold raised: model answers confidently, only rejects truly invalid queries

### v1.8 — May 2025 — Anti-Hallucination + Indian Kanoon Link
- Renamed "Actual Law Text" to "Law Summary" with clear AI disclaimer
- Model instructed to write faithful summaries, not fabricate verbatim text
- Added "found" boolean in JSON response to handle truly invalid law queries
- When found is false, shows clear "Not found" message with suggestion
- Switched verification link from India Code to Indian Kanoon (more reliable URL format)
- Indian Kanoon link now pre-searches the exact section and act

### v1.7 — May 2025 — Translation Fixed
- Renamed translate() to doTranslate() — was conflicting with browser built-in name
- Translation now confirmed working for both Hindi and Marathi
- Full law summary passed as lawContext to Groq for every translation
- Groq translates with full legal meaning, not word-for-word

### v1.6 — May 2025 — Amendment Notes + Verify Button
- Amendment note box added: yellow highlight appears when recent amendment detected
- Verify on India Code button added to every result
- Source note displayed under law summary

### v1.5 — May 2025 — Font Update for Readability
- Headings: Playfair Display replaced with Roboto Slab
- Body text: Outfit replaced with Open Sans
- Law text block: italic serif replaced with Open Sans regular
- Letter spacing and line height improved throughout

### v1.4 — May 2025 — Five Result Sections
- Added three new sections to every result: How This Affects Men, Key Court Judgments, Steps to Protect Yourself
- Groq prompt rebuilt to return structured JSON with all five sections
- Men-specific context added throughout
- Error messages now show actual error reason

### v1.3 — May 2025 — Cloudflare Security Layer
- API key moved from browser (exposed) to Cloudflare Worker encrypted secret
- app.js now contains no secrets. Only the Worker URL.
- Worker uses env.GROQ_KEY server-side
- Switched from Gemini to Groq API throughout

### v1.2 — May 2025 — Groq API
- Switched from Gemini (429 rate limit issues, daily quota exhausted during testing) to Groq
- Groq free tier: 30 req/minute, 14,400 req/day. Far more generous.
- Retry logic: auto-retries 2 times with 4 second wait on 429

### v1.1 — May 2025 — Three File Structure
- Split single HTML file into index.html + style.css + app.js
- Direct Gemini API call from browser (later replaced with Cloudflare Worker for security)

### v1.0 — May 2025 — Initial Build
- Single page web app on GitHub Pages
- Law search, plain English explanation, Hindi and Marathi translation
- Light and dark theme toggle
- Multiple API iterations: Claude API (paid) → Gemini (rate limited) → Groq (current)
- Multiple architecture iterations: direct browser call (insecure) → Cloudflare Worker (secure)
- Debugging sessions: missing https://, old inline script conflict, wrong model name,
  invalid API keys, daily quota exhaustion, translate() browser conflict, Jina AI timeout

---

## Future Roadmap

- Indian Kanoon API integration for verbatim statute text
- Search history via localStorage
- Bookmark and save laws for later
- Share result as a link
- PDF export of full result
- Related laws section per result
- Full result translation (not just simple explanation)
- Tamil and Telugu translation
- Lawyer directory or legal aid contact section
- Community-verified judgment references
