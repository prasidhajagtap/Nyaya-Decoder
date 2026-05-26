const docSelector = document.getElementById('document-selector');
const progContainer = document.getElementById('progress-container');
const progStatus = document.getElementById('progress-status');
const progBar = document.getElementById('progress-bar');
const resultBox = document.getElementById('result-box');
const dangerBadge = document.getElementById('danger-badge');
const simpleExplanation = document.getElementById('simple-explanation');

// CRITICAL: Put your deployed Supabase URL path here
const SUPABASE_FUNCTION_URL = "https://supabase.com/dashboard/project/kgbcygfemcdorqryvxdp/functions/decode-notice/details";

docSelector.addEventListener('change', async (e) => {
    // Bulletproof check: if no files element, stop completely
    if (!e.target || !e.target.files || e.target.files.length === 0) {
        return;
    }
    
    const file = e.target.files;
    if (!file) {
        return;
    }

    progContainer.classList.remove('hidden');
    resultBox.classList.add('hidden');
    updateProgress("Starting document analysis...", 5);

    let compiledText = "";

    try {
        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdf.numPages;

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                updateProgress(`Rendering page ${pageNum}/${totalPages}...`, Math.floor((pageNum / totalPages) * 35));
                const canvas = await renderPdfPageToCanvas(pdf, pageNum);
                
                updateProgress(`Extracting multi-language text ${pageNum}/${totalPages}...`, 35 + Math.floor((pageNum / totalPages) * 45));
                const pageText = await runOcrOnCanvas(canvas);
                compiledText += " " + pageText;

                canvas.width = 0;
                canvas.height = 0;
            }
        } else {
            updateProgress("Reading image data...", 20);
            
            updateProgress("Scanning text via OCR engine...", 50);
            // Pass the raw file object directly. Tesseract v5 handles it native.
            compiledText = await runOcrOnCanvas(file);
        }

        // Clean up text string before sending to AI
        compiledText = compiledText.trim();
        if (!compiledText) {
            throw new Error("OCR could not find any readable text characters in this document.");
        }

        updateProgress("Passing data to secure AI Legal Layer...", 85);
        const aiAnalysisResult = await callSecureLegalAI(compiledText);
        
        updateProgress("Decompressing payload...", 98);
        renderGlassmorphicUI(aiAnalysisResult);

    } catch (err) {
        console.error("Pipeline crashed:", err);
        alert("Pipeline Processing Error: " + err.message);
    } finally {
        progContainer.classList.add('hidden');
        docSelector.value = ""; // Reset
    }
});

function updateProgress(message, percentage) {
    if (progStatus) progStatus.innerText = message;
    if (progBar) progBar.style.width = percentage + "%";
}

async function renderPdfPageToCanvas(pdfDoc, pageNumber) {
    const page = await pdfDoc.getPage(pageNumber);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const viewport = page.getViewport({ scale: 1.2 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    return canvas;
}

async function runOcrOnCanvas(source) {
    // Recognize handles image file, canvas, or blob string native
    const result = await Tesseract.recognize(source, 'eng+hin+mar');
    return result.data.text;
}

async function callSecureLegalAI(extractedText) {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText })
    });

    if (!response.ok) {
        throw new Error(`Edge Function responded with status code ${response.status}`);
    }
    return await response.json();
}

function renderGlassmorphicUI(data) {
    if (!data || !data.dangerLevel) {
        throw new Error("AI response format is malformed or missing data fields.");
    }

    if (dangerBadge) {
        dangerBadge.className = "badge badge-" + data.dangerLevel.toLowerCase();
        dangerBadge.innerText = "Urgency Rating: " + data.dangerLevel;
    }

    if (simpleExplanation) {
        simpleExplanation.innerHTML = `
            <div class="explanation-item" style="border-left-color: #ec4899;">
                <h3>⚖️ Identified Laws & Acts</h3>
                <p>${data.sectionsIdentified || 'None detected'}</p>
            </div>
            <div class="explanation-item">
                <h3>📱 Quick Summary (English)</h3>
                <p>${data.englishExplanation || 'No data'}</p>
            </div>
            <div class="explanation-item">
                <h3>📢 मुख्य जानकारी (Hindi)</h3>
                <p>${data.hindiExplanation || 'No data'}</p>
            </div>
            <div class="explanation-item">
                <h3>📌 कोर्ट नोटीस स्पष्टीकरण (Marathi)</h3>
                <p>${data.marathiExplanation || 'No data'}</p>
            </div>
        `;
    }
    if (resultBox) resultBox.classList.remove('hidden');
}
