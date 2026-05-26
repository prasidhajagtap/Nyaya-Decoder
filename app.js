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
    // Verify files array actually has an item before running pipeline
    if (!e.target.files || e.target.files.length === 0) {
        return;
    }
    
    const file = e.target.files;
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

                // Force browser to wipe canvas memory instantly
                canvas.width = 0;
                canvas.height = 0;
            }
        } else {
            updateProgress("Creating image memory link...", 20);
            // Bulletproof memory object reference pointer
            const imageBlobUrl = URL.createObjectURL(file);
            
            updateProgress("Scanning text via OCR engine...", 50);
            compiledText = await runOcrOnCanvas(imageBlobUrl);
            
            // Wipe object link to prevent browser engine RAM leak
            URL.revokeObjectURL(imageBlobUrl);
        }

        updateProgress("Passing data to secure AI Legal Layer...", 85);
        const aiAnalysisResult = await callSecureLegalAI(compiledText);
        
        updateProgress("Decompressing payload...", 98);
        renderGlassmorphicUI(aiAnalysisResult);

    } catch (err) {
        console.error(err);
        alert("Pipeline Processing Error: " + err.message);
    } finally {
        progContainer.classList.add('hidden');
        // Clear input slot so user can try same document file again
        docSelector.value = "";
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
    
    const viewport = page.getViewport({ scale: 1.2 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    return canvas;
}

async function runOcrOnCanvas(source) {
    // Combined language block handles mixed English, Hindi, and Marathi characters
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
        throw new Error("Secure AI node returned a processing failure.");
    }
    return await response.json();
}

function renderGlassmorphicUI(data) {
    dangerBadge.className = "badge badge-" + data.dangerLevel.toLowerCase();
    dangerBadge.innerText = "Urgency Rating: " + data.dangerLevel;

    simpleExplanation.innerHTML = `
        <div class="explanation-item" style="border-left-color: #ec4899;">
            <h3>⚖️ Identified Laws & Acts</h3>
            <p>${data.sectionsIdentified}</p>
        </div>
        <div class="explanation-item">
            <h3>📱 Quick Summary (English)</h3>
            <p>${data.englishExplanation}</p>
        </div>
        <div class="explanation-item">
            <h3>📢 मुख्य जानकारी (Hindi)</h3>
            <p>${data.hindiExplanation}</p>
        </div>
        <div class="explanation-item">
            <h3>📌 कोर्ट नोटीस स्पष्टीकरण (Marathi)</h3>
            <p>${data.marathiExplanation}</p>
        </div>
    `;
    resultBox.classList.remove('hidden');
}
