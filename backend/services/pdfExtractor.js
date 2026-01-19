import fs from 'fs';

// Sanitize text for PostgreSQL - remove null bytes and invalid UTF-8
function sanitizeText(text) {
    if (!text) return '';
    // Remove null bytes and other problematic characters
    return text
        .replace(/\x00/g, '')  // Remove null bytes
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')  // Remove control characters
        .trim();
}

// Simple PDF text extraction
export async function extractTextFromPdf(filePath) {
    try {
        // Dynamic import to handle ES module compatibility
        const pdfParse = (await import('pdf-parse')).default;
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return sanitizeText(data.text);
    } catch (error) {
        console.error('PDF extraction error:', error);

        // Fallback: try reading raw buffer and extract readable text
        try {
            const buffer = fs.readFileSync(filePath);
            const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
            // Extract readable ASCII text
            const readable = text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ');
            if (readable.length > 100) {
                console.log('Using fallback text extraction');
                return sanitizeText(readable);
            }
        } catch (e) {
            console.error('Fallback extraction failed:', e);
        }

        throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
}

export async function extractTextFromBuffer(buffer) {
    try {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        return sanitizeText(data.text);
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
}
