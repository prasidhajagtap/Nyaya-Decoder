// -----------------------------------------------
// REPLACE WITH YOUR CLOUDFLARE WORKER URL
// No API key here. Key is safe inside Cloudflare.
const WORKER = 'https://law-made-simple-proxy.jkuku7866.workers.dev';
// -----------------------------------------------
// Law Made Simple — Cloudflare Worker v4
// Indian Kanoon (Verbatim) + Tavily Search (Fallback) + Groq (Explanation)
// Cloudflare Secrets needed:
//   GROQ_KEY     → console.groq.com (free)
//   TAVILY_KEY   → app.tavily.com   (free, 1000 searches/month)
//   KANOON_TOKEN → api.indiankanoon.org

export default {
  async fetch(request, env) {

    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

    try {
      const { type, act, section, query, language, lawContext } = await request.json()

      // ── SEARCH ──────────────────────────────────────────────
      if (type === 'search') {

        const isAllActs = !act || act === 'all'
        const searchQuery = isAllActs
          ? `Section ${section} Indian law statute text`
          : `Section ${section} ${act} statute text`

        let liveContext = ''
        let sourceLabel = 'Based on AI training knowledge.'

        // ── Step 1: Try Indian Kanoon Verbatim Fetch ──────────
        try {
          if (env.KANOON_TOKEN) {
            const kanoonSearchUrl = `https://api.indiankanoon.org/search/?formInput=${encodeURIComponent(searchQuery)}&pagenum=0`
            const kanoonSearchRes = await fetch(kanoonSearchUrl, {
              headers: { 
                'Authorization': `Token ${env.KANOON_TOKEN}`,
                'Accept': 'application/json'
              }
            })
            
            if (kanoonSearchRes.ok) {
              const kData = await kanoonSearchRes.json()
              if (kData.docs && kData.docs.length > 0) {
                const docId = kData.docs.tid || kData.docs.docid
                const kDocUrl = `https://api.indiankanoon.org/doc/${docId}/`
                const kDocRes = await fetch(kDocUrl, {
                  headers: { 
                    'Authorization': `Token ${env.KANOON_TOKEN}`,
                    'Accept': 'application/json'
                  }
                })
                
                if (kDocRes.ok) {
                  const docData = await kDocRes.json()
                  const verbatimText = docData.doc || docData.body || ''
                  if (verbatimText) {
                    liveContext = `VERBATIM STATUTE TEXT FROM INDIAN KANOON:\n"""\n${verbatimText}\n"""`
                    sourceLabel = `Verbatim text fetched directly from Indian Kanoon (Doc ID: ${docId}).`
                  }
                }
              }
            }
          }
        } catch (kErr) {
          // Fail silently, fall through to Tavily
        }

        // ── Step 2: Fallback to Tavily if Kanoon Empty ────────
        if (!liveContext) {
          try {
            const tavilyRes = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.TAVILY_KEY}`
              },
              body: JSON.stringify({
                query: searchQuery,
                search_depth: 'advanced',
                include_domains: [
                  'indiankanoon.org',
                  'indiacode.nic.in',
                  'legislative.gov.in',
                  'mha.gov.in',
                  'lawmin.gov.in',
                  'sci.gov.in'
                ],
                max_results: 4,
                include_raw_content: false,
                include_answer: true
              })
            })

            if (tavilyRes.ok) {
              const td = await tavilyRes.json()
              const parts = []
              if (td.answer) parts.push(td.answer)
              if (td.results && td.results.length > 0) {
                td.results.slice(0, 3).forEach(r => {
                  if (r.content) parts.push(`[${r.url}]\n${r.content}`)
                })
              }
              if (parts.length > 0) {
                liveContext = parts.join('\n\n').substring(0, 5000)
                sourceLabel = 'Content fetched live from Indian legal databases (Indian Kanoon, India Code, Legislative.gov.in).'
              }
            }
          } catch (tavilyErr) {
            tavilyContext = ''
            sourceLabel = 'Live fetch unavailable. Based on AI training knowledge. Verify on Indian Kanoon.'
          }
        }

        const contextBlock = liveContext
          ? `LIVE CONTENT FROM INDIAN LEGAL DATABASES:\n"""\n${liveContext}\n"""\n\nUse the above as primary source of truth.`
          : `No live content available. Use your training knowledge carefully and accurately.`

        const fullQuery = isAllActs
          ? `Section ${section} (identify the correct Indian Act)`
          : `Section ${section} of ${act}`

        // ── Step 3: Groq explanation ─────────────────────────
        const prompt = `You are a senior Indian legal expert.

${contextBlock}

The user is asking about: "${fullQuery}"

RULES:
1. Use the live content above as primary source. Do not contradict it.
2. If live content clearly identifies the section, set found to true always.
3. Set found to false ONLY if content confirms no such section exists, or if section number is clearly impossible (e.g. Section 9999 of BNSS which has max 535 sections).
4. lawSummary: faithful accurate summary of what the section says. Use newlines between key points.
5. simpleExplanation: under 80 words, zero legal jargon, plain English.
6. menContext: how this section is used against men and what rights men have.
7. keyJudgments: real verified cases only. Omit if unsure rather than guess.
8. stepsForMen: practical immediate actions for a man facing this section.

Reply ONLY with raw JSON. No markdown. No backticks. Nothing outside JSON.

{
  "found": true or false,
  "notFoundReason": "Only if found is false. Null otherwise.",
  "suggestion": "Only if found is false. Better search terms. Null otherwise.",
  "lawTitle": "Full official name e.g. Section 144, Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)",
  "section": "Short form e.g. BNSS Section 144",
  "lawSummary": "Complete accurate summary of the section. Use newlines between key points.",
  "simpleExplanation": "Plain English, under 80 words, zero jargon.",
  "menContext": "2-3 sentences on misuse against men and men's rights under this section.",
  "keyJudgments": [
    "Real verified case name and year: what it decided and how it helps men"
  ],
  "stepsForMen": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
  "amendmentNote": "Any confirmed recent amendment. Null if none.",
  "sourceNote": "${sourceLabel}"
}`

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.GROQ_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
          })
        })

        if (!groqRes.ok) {
          const err = await groqRes.json()
          return new Response(JSON.stringify({ error: err.error?.message || 'Groq error' }), {
            status: groqRes.status, headers: { 'Content-Type': 'application/json', ...CORS }
          })
        }

        const gData = await groqRes.json()
        const text  = gData.choices?.?.message?.content || ''

        return new Response(JSON.stringify({ text }), {
          headers: { 'Content-Type': 'application/json', ...CORS }
        })

      // ── TRANSLATE ────────────────────────────────────────────
      } else if (type === 'translate') {

        const prompt = `You are an expert Indian legal translator fluent in ${language}.

Law context for reference: "${lawContext}"

Translate this English explanation into ${language}:
"${query}"

Rules:
- Read and understand the full legal context first.
- Write naturally in ${language} as a local lawyer explaining to a common man.
- Conversational, simple everyday language. Not textbook language.
- Preserve every legal detail and meaning accurately.
- Return ONLY the translated explanation. No labels. No quotes. No extra text.`

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.GROQ_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.15,
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
          })
        })

        const gData = await groqRes.json()
        const text  = gData.choices?.?.message?.content || ''

        return new Response(JSON.stringify({ text }), {
          headers: { 'Content-Type': 'application/json', ...CORS }
        })

      } else {
        return new Response(JSON.stringify({ error: 'Invalid type' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
        })
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }
  }
}
