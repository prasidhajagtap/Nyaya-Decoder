const docSelector = document.getElementById('document-selector');
const progContainer = document.getElementById('progress-container');
const progStatus = document.getElementById('progress-status');
const progBar = document.getElementById('progress-bar');
const resultBox = document.getElementById('result-box');
const dangerBadge = document.getElementById('danger-badge');
const simpleExplanation = document.getElementById('simple-explanation');

const SUPABASE_FUNCTION_URL = "https://kgbcygfemcdorqryvxdp.supabase.co/functions/v1/decode-notice";

if (docSelector) {
    docSelector.addEventListener('change', async (e) => {
        if (!e.target || !e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files;
        if (!file) return;

        progContainer.classList.remove('hidden');
        resultBox.classList.add('hidden');
        updateProgress("Waking up processing engine...", 5);

        let compiledText = "";
        const fileName = (file.name || "").toLowerCase();

        try {
            // STEP 1: ROUTE BY EXTENSION FOR MAXIMUM COMPATIBILITY
            if (fileName.endsWith('.pdf') || file.type === "application/pdf") {
                // PDF processing track
                updateProgress("Reading PDF binary stream...", 15);
                const arrayBuffer = await readFileAsArrayBufferAsynchronous(file);
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const totalPages = pdf.numPages;

                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    updateProgress(`Rendering page ${pageNum}/${totalPages}...`, Math.floor((pageNum / totalPages) * 30));
                    const canvas = await renderPdfPageToCanvas(pdf, pageNum);
                    
                    updateProgress(`OCR scanning page ${pageNum}/${totalPages}...`, 30 + Math.floor((pageNum / totalPages) * 50));
                    const pageText = await runOcrOnSource(canvas);
                    compiledText += " " + pageText;
                    
                    canvas.width = 0; canvas.height = 0; // memory save
                }
            } 
            else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                // WORD DOCUMENT track
                updateProgress("Parsing document text strings...", 30);
                compiledText = await tryExtractTextFromDocFile(file);
            } 
            else {
                // IMAGE track (PNG, JPG, WEBP, HEIC, GIF, BMP)
                updateProgress("Processing image data streams...", 20);
                const imageSourceContainer = await getFallbackImageSource(file);
                
                updateProgress("Running multi-language OCR layer...", 50);
                compiledText = await runOcrOnSource(imageSourceContainer);
            }

            // STEP 2: VALIDATE THE TEXT EXTRACTED
            compiledText = compiledText.trim();
            if (!compiledText || compiledText.length < 3) {
                throw new Error("Could not extract clean text characters from this file format layout.");
            }

            updateProgress("Forwarding content to secure AI Legal Layer...", 85);
            const aiAnalysisResult = await callSecureLegalAI(compiledText);
            
            updateProgress("Rendering results matrix...", 98);
            renderGlassmorphicUI(aiAnalysisResult);

        } catch (err) {
            console.error("Pipeline breakdown:", err);
            alert("Processing Error: " + err.message);
        } finally {
            progContainer.classList.add('hidden');
            docSelector.value = ""; 
        }
    });
}

// ==========================================
// UNBREAKABLE FALLBACK STORAGE FOR IMAGES
// ==========================================
async function getFallbackImageSource(fileObject) {
    // Brute attempt 1: Try Object URL string path
    try {
        const url = URL.createObjectURL(fileObject);
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = url;
        });
        return img;
    } catch (e) {
        console.warn("Object URL route blocked, trying Base64 fallback...");
    }

    // Brute attempt 2: Try standard FileReader DataURL payload
    try {
        const base64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(fileObject);
        });
        return base64;
    } catch (e) {
        console.warn("FileReader blocked, trying direct array buffer injection...");
    }

    // Brute attempt 3: Throw data array directly to worker
    return fileObject;
}

// ==========================================
// DOC/DOCX BACKWARD COMPATIBLE PARSER FLUIDITY
// ==========================================
async function tryExtractTextFromDocFile(fileObject) {
    try {
        const arrayBuffer = await readFileAsArrayBufferAsynchronous(fileObject);
        
        // If mammoth Mammoth developer loaded mammoth mammoth mammoth docx reader library scripts:
        if (typeof mammoth !== 'undefined') {
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            return result.value;
        }
        
        // Brute fallback: Strip readable ASCII characters from text stream natively if script missing
        const decoder = new TextDecoder('utf-8');
        const view = new Uint8Array(arrayBuffer);
        let rawTextString = decoder.decode(view);
        // Clean up out-of-bounds non-printable binary garbage characters
        return rawTextString.replace(/[^\x20-\x7E\t\r\n\u0900-\u097F]/g, ' '); 
    } catch (err) {
        throw new Error("Word file ingestion structure failed: " + err.message);
    }
}

// ==========================================
// CORE PROCESSING AND BACKING SYSTEM TOOLS
// ==========================================
function readFileAsArrayBufferAsynchronous(fileObject) {
    if (typeof fileObject.arrayBuffer === 'function') {
        return fileObject.arrayBuffer();
    }
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsArrayBuffer(fileObject);
    });
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

async function runOcrOnSource(imageSource) {
    const worker = await Tesseract.createWorker('eng+hin+mar');
    const response = await worker.recognize(imageSource);
    await worker.terminate();
    return response.data.text;
}

async function callSecureLegalAI(extractedText) {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText })
    });
    if (!response.ok) throw new Error(`Edge Function error status: ${response.status}`);
    return await response.json();
}

function updateProgress(message, percentage) {
    if (progStatus) progStatus.innerText = message;
    if (progBar) progBar.style.width = percentage + "%";
}

function renderGlassmorphicUI(data) {
    if (!data || !data.dangerLevel) throw new Error("AI response format is corrupt.");
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
