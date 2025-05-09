import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function BillDetails() {
  const router = useRouter();
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const { billInfo } = router.query;
    if (billInfo) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(billInfo));
        setBillData(parsedData);
      } catch (err) {
        setError('Failed to load bill information');
      }
    }
    setLoading(false);
  }, [router.query]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!billData) return <div className="p-4">No bill data found</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Bill Details</h1>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Extracted Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Amount</p>
                <p className="text-xl font-semibold">
                  ${billData.price ? billData.price.toFixed(2) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Category</p>
                <p className="text-xl font-semibold">{billData.category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Date</p>
                <p className="text-xl font-semibold">{billData.date || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Time</p>
                <p className="text-xl font-semibold">{billData.time || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}