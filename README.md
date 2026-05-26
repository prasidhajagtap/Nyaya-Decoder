# Nyaya Decoder Pipeline Debugging Ledger & Architecture Fix Guide

This document catalogs the complete pipeline fixes engineered to overcome processing blockages occurring when parsing legal notices via mobile/desktop browser viewports on GitHub Pages.

---

## 🔍 Core Defect Log & Resolutions

### 1. File Type / Blob Extraction Dropouts
* **Defect:** `TypeError: Failed to execute 'readAsDataURL' on 'FileReader': parameter 1 is not of type 'Blob'.`
* **Root Cause:** When clicking styled layout components or processing camera snapshots, the browser runtime sometimes multi-triggers events, making `e.target.files` return empty or return a generic structural configuration wrapper object missing native binary Blob properties.
* **Resolution:** Re-architected code scope layout to extract the file reference inside an isolated structural block immediately. Added multi-tiered image decoding fallback options (`URL.createObjectURL` $\\rightarrow$ `FileReader` $\\rightarrow$ Raw payload pass-through) to handle all custom browser variant types without throwing fatal exceptions.

### 2. Tesseract WASM Subsystem Overloads
* **Defect:** `Error in pixReadStream: Unknown format: no pix returned` / `Image file /input cannot be read!`
* **Root Cause:** Direct unbuffered injection of high-resolution device picture file objects straight into the raw `Tesseract.recognize()` top-level API container caused allocation failures inside the Emscripten virtual file system stack.
* **Resolution:** Implemented explicit initialization workflow routines utilizing `Tesseract.createWorker('eng+hin+mar')` to load and allocate memory zones properly before injecting base64 streams or pre-rendered elements.

### 3. Missing Explicit Workflow Submission Controller
* **Defect:** Pipeline was executing raw triggers automatically on `change`, causing confusion, partial loads, and zero touch confirmation states on mobile screens.
* **Resolution:** Introduced a clear, dedicated button element (`#submit-document-btn`). The UI holds reference structures safely until the button element receives an intentional touch, bypassing accidental clicks.

### 4. Broken Mobile UI Layout & Scale Problems
* **Defect:** Standard unstyled desktop buttons bled off screens, causing rendering problems in adaptive views.
* **Resolution:** Upgraded to an adaptive, mobile-first design system. Added specific touch target scales, set explicit container width caps at `480px`, and included full `-webkit-tap-highlight` handling.

---

## 🛠️ Deployment Configuration Blueprint

For any alternative Large Language Model (LLM) or configuration engine to parse this repository layer seamlessly, ensure these three baseline scripts are locked inside the target code module headers:
