import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push('/dashboard');
    };
    checkUser();
  }, []);

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) console.error('Error signing in:', error);
    else router.push('/dashboard');
  };

  return (
    <div>
      <h2>Sign In</h2>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <button onClick={signIn}>Sign In</button>
    </div>
  );
}
