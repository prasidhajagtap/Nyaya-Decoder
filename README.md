# Law Made Simple — Project Documentation

**Live URL:** https://prasidhajagtap.github.io/Nyaya-Decoder/
**Repository:** https://github.com/prasidhajagtap/Nyaya-Decoder
**Last Updated:** May 2025
**Current Version:** v1.3

---

## Project Purpose

Law Made Simple is a free, public-facing web tool that helps men in India search and understand any Indian law in plain language. It addresses the critical gap where men facing false accusations or gender-biased legal situations cannot access or understand their own rights due to complex legal language.

Every search returns the actual statute text, a plain language explanation, how the law affects men specifically, key court judgments, and a step-by-step action plan. Explanations can be translated to Hindi and Marathi with full legal context preserved.

---

## Tech Stack

| Layer | Tool | Cost |
|---|---|---|
| Hosting | GitHub Pages | Free |
| API Proxy | Cloudflare Workers (free tier) | Free |
| AI Engine | Groq API — llama-3.3-70b-versatile | Free (14,400 req/day) |
| Translation | Groq API (context-aware, not word-for-word) | Free |
| Fonts | Google Fonts — Roboto Slab + Open Sans | Free |
| Database | None | — |
| Backend | None | — |

---

## File Structure

```
Nyaya-Decoder/
├── index.html       # Main HTML. All page sections and structure.
├── style.css        # All styles. Light and dark theme. Mobile responsive.
├── app.js           # All JavaScript. Calls Cloudflare Worker. No API key.
├── worker.js        # Cloudflare Worker code. Deployed to Cloudflare only.
│                    # NOT pushed to GitHub repo.
└── UPDATES.md       # This file. Project documentation and update log.
```

> `worker.js` is deployed directly to Cloudflare. It is not part of the GitHub repo and should never be pushed there.

---

## Security Architecture

```
User Browser
    |
    | HTTPS POST (query only, no key)
    v
app.js on GitHub Pages
    |
    | HTTPS POST (query only, no key)
    v
Cloudflare Worker (worker.js)
    |
    | HTTPS POST (query + GROQ_KEY from encrypted secret)
    v
Groq API
    |
    | Response
    v
Cloudflare Worker (strips key, forwards text)
    |
    v
app.js → renders result to user
```

The Groq API key is stored as an encrypted secret in Cloudflare. It is never sent to the browser. It is never visible in the GitHub repo. It is never logged.

---

## Cloudflare Worker Setup

1. Go to cloudflare.com. Sign up free.
2. Workers and Pages. Create Worker. Name: `law-made-simple-proxy`. Deploy.
3. Edit Code. Paste full contents of `worker.js`. Deploy again.
4. Settings tab. Variables and Secrets. Add:
   - Variable name: `GROQ_KEY`
   - Value: your Groq API key
   - Type: Secret (Encrypt)
   - Click Save and Deploy.
5. Copy the Worker URL shown at top. Looks like: `https://law-made-simple-proxy.YOURNAME.workers.dev`
6. Open `app.js` line 3. Replace placeholder with actual Worker URL.

---

## API Details

**Provider:** Groq
**Model:** llama-3.3-70b-versatile
**Key location:** Cloudflare Worker secret (`GROQ_KEY`)
**Key in browser:** Never. Zero exposure.
**Free tier limits:** 30 requests per minute. 14,400 requests per day.
**Auto-retry:** app.js retries up to 2 times with 4 second wait on 429 errors.

**Get a Groq key:** console.groq.com. Sign up free. No credit card needed.

---

## Result Sections (Per Search)

Every search returns five sections:

| Section | Content |
|---|---|
| 📜 Actual Law Text | Verbatim statutory text as written in the Indian statute |
| 💡 Simple Explanation | Plain English. Under 80 words. Zero legal jargon. |
| 🛡️ How This Affects Men | Misuse patterns. Men's rights. What to know. |
| ⚖️ Key Court Judgments | Supreme Court and High Court cases relevant to the law |
| 🚨 Steps to Protect Yourself | Numbered action plan. What to do immediately. |

Translation of the simple explanation is available in Hindi and Marathi. Both use Groq for context-aware translation, not word-for-word.

---

## Laws Covered

BNS 2023, BNSS 2023, BSA 2023, IPC 1860, CrPC 1973, Indian Evidence Act 1872, Protection of Women from Domestic Violence Act 2005, POCSO Act 2012, Dowry Prohibition Act 1961, Hindu Marriage Act 1955, Special Marriage Act 1954, Hindu Succession Act 1956, Muslim Personal Law, Christian Personal Law, Guardians and Wards Act 1890, Maintenance and Welfare of Parents and Senior Citizens Act, IT Act 2000, Companies Act, Income Tax Act, GST Act, RTI Act 2005, Constitution of India (all Articles, Fundamental Rights, Directive Principles), and all other Central and State laws from the beginning of Indian legal history including colonial era laws.

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

---

## How to Replace Groq API Key

1. Go to console.groq.com. API Keys. Create new key.
2. Cloudflare dashboard. Your worker. Settings. Variables and Secrets.
3. Edit `GROQ_KEY`. Delete old value. Paste new key. Encrypt. Save and Deploy.
4. No change needed to GitHub files.

---

## Known Issues

| Issue | Status | Notes |
|---|---|---|
| Judgment references are AI-generated | Known | Verify critical cases independently before relying on them |
| No search history | Pending | Future feature |
| No bookmark or save feature | Pending | Future feature |
| Translation only covers simple explanation | Known | Full result translation planned for future |

---

## Pending Updates

Add items here before next session with Claude.

- [ ] ...
- [ ] ...
- [ ] ...

---

## Full Version History

### v1.3 — May 2025 — Cloudflare Security Layer Restored
- Moved Groq API key out of browser and into Cloudflare Worker encrypted secret
- `app.js` now calls Cloudflare Worker only. Zero secrets in frontend code.
- `worker.js` updated to use Groq API (replaces old Gemini/Claude versions)
- Worker handles both search and translation requests
- Security architecture: Browser > Cloudflare Worker > Groq API
- `GROQ_KEY` stored as encrypted secret in Cloudflare, never exposed

### v1.2 — May 2025 — Font and Readability Update
- Replaced Playfair Display with Roboto Slab for headings
- Replaced Outfit with Open Sans for all body text
- Law text block changed from italic serif to Open Sans regular for easier reading
- Letter spacing and line height improved throughout

### v1.1 — May 2025 — Content and Feature Expansion
- Added three new result sections: How This Affects Men, Key Court Judgments, Steps to Protect Yourself
- Translation fixed. Both Hindi and Marathi now use Groq for context-aware output
- Translation passes full law text as context so meaning is preserved
- Prompt engineering improved for cleaner JSON output
- Error messages now show actual error reason instead of generic text
- Favicon added (emoji SVG, no 404)
- Retry logic added: auto-retries up to 2 times on 429 rate limit errors

### v1.0 — May 2025 — Initial Launch
- Three-file structure: index.html, style.css, app.js
- Groq API (llama-3.3-70b-versatile) for law search and explanation
- Context-aware translation to Hindi and Marathi
- Five result sections per search
- Light and dark theme toggle
- Quick search chips for common men's rights queries
- Mobile responsive layout
- Switched from Claude API (paid) to Gemini (free) to Groq (free, better limits)
- Switched from Cloudflare Worker to direct browser calls (later reversed for security)
- Debugged multiple issues: wrong model name, invalid API keys, daily quota exhaustion, exposed key in console, old inline script in index.html, missing https:// in worker URL

---

## Future Roadmap

- Search history via localStorage
- Bookmark and save laws for later
- Share result as a link
- PDF export of full result
- Related laws section per result
- Tamil and Telugu translation
- Community-verified judgment references
- Lawyer directory or legal aid contact section
