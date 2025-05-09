import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function Header() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fullName, setFullName] = useState('User');
  const [avatarUrl, setAvatarUrl] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Error fetching user:', userError?.message);
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('profilesettings')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error.message);
          await supabase.from('profiles').upsert({
            user_id: user.id,
            full_name: 'User',
            notification_email: user.email,
          });
          setFullName('User');
          setAvatarUrl('');
        } else {
          setFullName(data?.full_name || 'User');
          setAvatarUrl(data?.avatar_url || '');
        }
      } catch (err) {
        console.error('Unexpected error:', err.message);
        router.push('/login');
      }
    };
    fetchUserProfile();
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  return (
    <div className="bg-white shadow-md p-4 mb-6">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-500 to-indigo-600 text-transparent bg-clip-text">
            SmartWealth Finance
          </h1>
          <p className="text-gray-600 text-sm">Manage your finances smarter</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <span className="text-gray-600 hover:text-blue-600 font-medium cursor-pointer">Dashboard</span>
          </Link>
          <Link href="/visualizations">
            <span className="text-gray-600 hover:text-blue-600 font-medium cursor-pointer">Visualizations</span>
          </Link>
          <Link href="/budget-management">
            <span className="text-gray-600 hover:text-blue-600 font-medium cursor-pointer">Budget Management</span>
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowProfileModal(!showProfileModal)}
              className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow hover:shadow-md"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${fullName}'s profile`}
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-gray-800">{fullName}</span>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showProfileModal && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    router.push('/profile-settings');
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}