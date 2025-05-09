import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const BillUpload = ({ onBillUploaded, userId }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [billData, setBillData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    console.log('Environment Variables:');
    console.log('NEXT_PUBLIC_OCR_API_URL:', process.env.NEXT_PUBLIC_OCR_API_URL);
    console.log('NEXT_PUBLIC_GEMINI_API_KEY:', process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_KEY);
    console.log('Supabase Client Initialized:', supabase);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  }

  async function extractBillInfo(file) {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        if (!process.env.NEXT_PUBLIC_OCR_API_URL || !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
          throw new Error('Missing Gemini API configuration. Please check .env file.');
        }

        const base64Image = await fileToBase64(file);

        const payload = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Image,
                  },
                },
                {
                  text: 'Extract the following details from this receipt image or PDF: category (e.g., Groceries), date, and total amount. For total, remove any currency symbols and return it as a numeric value only. Return ONLY a raw JSON object with keys: category (string), date (string), and total (number).',
                },
              ],
            },
          ],
        };

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_OCR_API_URL}?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();
        console.log('Gemini API Response:', data);

        if (!response.ok) {
          throw new Error(
            `Gemini API error: ${response.status} - ${data.error?.message || 'Unknown error'}`
          );
        }

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) throw new Error('No data returned from Gemini API');

        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON object found in Gemini API response');
        }

        const parsedData = JSON.parse(jsonMatch[0]);
        parsedData.total = typeof parsedData.total === 'string'
          ? parseFloat(parsedData.total.replace(/[^0-9.]/g, '')) || 0
          : parsedData.total || 0;

        if (isNaN(parsedData.total)) {
          throw new Error('Total is not a valid number');
        }

        return parsedData;
      } catch (error) {
        if (error.message.includes('429') && attempts < maxAttempts - 1) {
          const delay = Math.pow(2, attempts) * 1000;
          console.log(`Rate limit hit, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
        } else {
          console.error('extractBillInfo error:', error);
          throw error;
        }
      }
    }

    throw new Error('Max retry attempts reached for Gemini API');
  }

  async function handleFileChange(event) {
    setError(null);
    setBillData(null);
    setPreviewUrl(null);
    setFile(null);

    const selectedFile = event.target.files[0];
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!selectedFile.type || !allowedTypes.includes(selectedFile.type)) {
      setError('Please upload a JPEG, PNG, or PDF file.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(selectedFile.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : null);
  }

  async function handleProcessBill() {
    if (!file) {
      setError('No file selected.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await extractBillInfo(file);
      setBillData(result);
      console.log('Parsed Bill Data:', result);
    } catch (error) {
      setError(error.message || 'Failed to process receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUploadBill() {
    if (!billData) {
      setError('No bill data to upload.');
      return;
    }

    if (!userId) {
      setError('User ID not provided. Please ensure you are logged in.');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated. Please log in.');
      }

      if (user.id !== userId) {
        throw new Error('User ID mismatch. Please log in again.');
      }

      const billRecord = {
        user_id: userId,
        category: billData.category || 'Unknown',
        date: billData.date || new Date().toISOString().split('T')[0],
        total: billData.total || 0,
      };

      const { data, error } = await supabase
        .from('bills')
        .insert([billRecord])
        .select();

      if (error) {
        throw new Error(`Supabase error: ${error.message || 'Unknown error'}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Supabase insert failed: No data returned');
      }

      const insertedBill = data[0];
      if (onBillUploaded) {
        onBillUploaded(insertedBill);
      }

      setError(null);
      setBillData(null);
      setFile(null);
      setPreviewUrl(null);
      alert('Bill successfully uploaded to dashboard!');
    } catch (error) {
      setError(error.message || 'Failed to upload bill to dashboard. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>Upload Receipt</h2>
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFileChange}
        style={{ marginBottom: '10px' }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {file && (
        <div>
          <h3>Image Preview</h3>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Receipt Preview"
              style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
            />
          )}
          <button
            onClick={handleProcessBill}
            disabled={isProcessing}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: isProcessing ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            {isProcessing ? 'Processing...' : 'Process Bill'}
          </button>
        </div>
      )}
      {billData && (
        <div style={{ marginTop: '20px' }}>
          <h3>Receipt Details</h3>
          <p>Category: {billData.category || 'N/A'}</p>
          <p>Date: {billData.date || 'N/A'}</p>
          <p>Total: {billData.total || 'N/A'}</p>
          <button
            onClick={handleUploadBill}
            disabled={isUploading || !userId}
            style={{
              padding: '8px 16px',
              backgroundColor: isUploading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (isUploading || !userId) ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload Bill to Dashboard'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BillUpload;