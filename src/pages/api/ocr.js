// pages/api/ocr.js (Next.js) or similar Node.js route
import formidable from 'formidable';
import fs from 'fs';
import Tesseract from 'tesseract.js';

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing for file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to process file' });
    }

    const file = files.file?.[0]; // Adjust based on formidable version
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      // Perform OCR with Tesseract
      const {
        data: { text },
      } = await Tesseract.recognize(file.filepath, 'eng', {
        logger: (m) => console.log(m), // Log progress
      });

      // Clean up uploaded file
      fs.unlinkSync(file.filepath);

      // Parse receipt text (basic example; customize as needed)
      const parsedData = parseReceiptText(text);
      return res.status(200).json(parsedData);
    } catch (error) {
      console.error('OCR error:', error);
      return res.status(500).json({ error: 'Failed to process receipt' });
    }
  });
}

// Basic receipt parsing (customize based on your needs)
function parseReceiptText(text) {
  // Example: Extract category, date, total using regex or NLP
  const lines = text.split('\n').map((line) => line.trim());
  let category = 'Unknown';
  let date = 'N/A';
  let total = 0;

  // Simple regex for common receipt patterns
  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/;
  const totalRegex = /total\s*[:=]?\s*\$?(\d+\.\d{2})/i;

  for (const line of lines) {
    if (dateRegex.test(line)) {
      date = line.match(dateRegex)[1];
    }
    if (totalRegex.test(line)) {
      total = parseFloat(line.match(totalRegex)[1]);
    }
    // Add category logic (e.g., based on store name or keywords)
    if (line.toLowerCase().includes('grocery') || line.includes('Walmart')) {
      category = 'Groceries';
    }
  }

  return { category, date, total };
}