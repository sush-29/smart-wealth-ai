import { useEffect, useState } from "react";
import '../styles/globals.css';
import { supabase } from "../utils/supabaseClient";

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch user session on mount
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching user:", error.message);
      } else {
        setUser(data?.session?.user || null);
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  return <Component {...pageProps} user={user} />;
}

export default MyApp;
