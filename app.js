// Multilingual Legal Regex and Actionable Guidance Database (2026 Legal Updates)
const LegalDatabase = [
    {
        pattern: /(144\s*BNSS|125\s*CrPC|maintenance|भरणपोषण|पोटगी|खर्चा)/i,
        title: "Maintenance Case (भरणपोषण / पोटगी)",
        danger: "Medium",
        desc: "English: Your spouse or child has claimed monthly financial support. You must produce genuine salary/income declarations.\n\nहिंदी: आपके जीवनसाथी या बच्चे ने मासिक खर्च की मांग की है। आपको अदालत में अपनी सही आय के दस्तावेज देने होंगे।\n\nमराठी: तुमच्या जोडीदाराने किंवा मुलाने महिन्याच्या खर्चाची मागणी केली आहे. तुम्हाला तुमचे खरे उत्पन्नाचे कागदपत्र दाखवावे लागतील."
    },
    {
        pattern: /(section\s*13|HMA|divorce|विवाह\s*विच्छेद|घटस्फोट)/i,
        title: "Divorce Petition (विवाह विच्छेद / घटस्फोट)",
        danger: "High",
        desc: "English: A legal case has been filed to dissolve the marriage. You must submit a 'Written Statement' response within 30-90 days.\n\nहिंदी: शादी खत्म करने के लिए केस दायर किया गया है। आपको 30 से 90 दिनों के भीतर अपना जवाब अदालत में देना होगा।\n\nमराठी: लग्न मोडण्यासाठी कोर्टात केस दाखल केली आहे. तुम्हाला ३० ते ९० दिवसांत कोर्टात तुमचे लेखी म्हणणे मांडणे बंधनकारक आहे."
    },
    {
        pattern: /(DV\s*Act|domestic\s*violence|घरेलू\s*हिंसा|कौटुंबिक\s*हिंसाचार)/i,
        title: "Domestic Violence Case (घरेलू हिंसा / कौटुंबिक हिंसाचार)",
        danger: "High",
        desc: "English: Case filed alleging domestic abuse. Court can grant fast orders regarding residence security and compensation.\n\nहिंदी: घर में प्रताड़ना का आरोप लगाया गया है। अदालत रहने की जगह और हर्जाने के बारे में त्वरित आदेश दे सकती है.\n\nमराठी: घरगुती त्रासाबद्दल केस दाखल केली आहे. कोर्ट राहण्याच्या जागेबाबत आणि नुकसानभरपाईबाबत तातडीने आदेश देऊ शकते."
    },
    {
        pattern: /(ex\s*-\s*parte|exparte|एकपक्षीय)/i,
        title: "Ex-Parte Threat Warning (एकपक्षीय आदेश की चेतावनी)",
        danger: "Critical",
        desc: "English: EMERGENCY: If you miss the hearing, the judge will rule against you instantly without listening to your story.\n\nहिंदी: आपातकालीन चेतावनी: यदि आप अगली तारीख पर नहीं गए, तो जज आपकी बात सुने बिना आपके खिलाफ फैसला सुना देंगे।\n\nमराठी: तातडीची चेतावणी: जर तुम्ही पुढील तारखेला हजर राहिले नाही, तर कोर्ट तुमचे न ऐकता तुमच्या विरोधात निकाल देईल."
    }
];

const docSelector = document.getElementById('document-selector');
const progContainer = document.getElementById('progress-container');
const progStatus = document.getElementById('progress-status');
const progBar = document.getElementById('progress-bar');
const resultBox = document.getElementById('result-box');
const dangerBadge = document.getElementById('danger-badge');
const simpleExplanation = document.getElementById('simple-explanation');

docSelector.addEventListener('change', async (e) => {
    const file = e.target.files;
    if (!file) return;

    progContainer.classList.remove('hidden');
    resultBox.classList.add('hidden');
    updateProgress("Initializing processing pipeline...", 5);

    let compiledText = "";

    try {
        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdf.numPages;

            // Sequential Processing Loop to crack the Memory Wall
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                updateProgress(`Rendering page ${pageNum} of ${totalPages}...`, Math.floor((pageNum / totalPages) * 40));
                
                const canvas = await renderPdfPageToCanvas(pdf, pageNum);
                
                updateProgress(`Scanning page ${pageNum} text (Eng+Hin+Mar)...`, 40 + Math.floor((pageNum / totalPages) * 50));
                const pageText = await runOcrOnCanvas(canvas);
                compiledText += " " + pageText;

                // FORCE RAM RELEASE: Destroy canvas references completely before iterating
                canvas.width = 0;
                canvas.height = 0;
            }
        } else {
            updateProgress("Scanning image file (Eng+Hin+Mar)...", 50);
            compiledText = await runOcrOnCanvas(file);
        }

        updateProgress("Analyzing text mappings...", 95);
        analyzeExtractedText(compiledText);

    } catch (err) {
        console.error(err);
        alert("System Execution Fault: " + err.message);
    } finally {
        progContainer.classList.add('hidden');
    }
});

function updateProgress(message, percentage) {
    progStatus.innerText = message;
    progBar.style.width = percentage + "%";
}

async function renderPdfPageToCanvas(pdfDoc, pageNumber) {
    const page = await pdfDoc.getPage(pageNumber);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Scale 1.2 optimal middleground for mobile RAM and OCR reading visibility
    const viewport = page.getViewport({ scale: 1.2 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    return canvas;
}

async function runOcrOnCanvas(source) {
    // Specify English, Hindi, and Marathi datasets concurrently
    const result = await Tesseract.recognize(source, 'eng+hin+mar');
    return result.data.text;
}

function analyzeExtractedText(rawText) {
    let triggeredHtml = "";
    let systemDanger = "Low";
    let matchesFound = false;

    for (let item of LegalDatabase) {
        if (item.pattern.test(rawText)) {
            matchesFound = true;
            triggeredHtml += `
                <div class="explanation-item">
                    <h3>${item.title}</h3>
                    <p style="white-space: pre-line;">${item.desc}</p>
                </div>`;
            
            if (item.danger === "Critical" || item.danger === "High") {
                systemDanger = "High";
            } else if (item.danger === "Medium" && systemDanger !== "High") {
                systemDanger = "Medium";
            }
        }
    }

    if (!matchesFound) {
        triggeredHtml = `
            <div class="explanation-item">
                <h3>No Standard Patterns Detected</h3>
                <p>English: Could not confidently identify core family court clauses. Please verify image sharpness.\n\nहिंदी: मुख्य अदालती धाराओं की पहचान नहीं हो सकी। कृपया सुनिश्चित करें कि फोटो साफ है।\n\nमराठी: मुख्य न्यायालयीन कलमे आढळली नाहीत. कृपया फोटो स्पष्ट असल्याची खात्री करा.</p>
            </div>`;
    }

    dangerBadge.className = "badge badge-" + (systemDanger === "High" ? "critical" : systemDanger.toLowerCase());
    dangerBadge.innerText = "System Danger Action Assessment: " + systemDanger;
    simpleExplanation.innerHTML = triggeredHtml;
    resultBox.classList.remove('hidden');
}
