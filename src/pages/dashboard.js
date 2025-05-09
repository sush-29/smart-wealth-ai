import { useRouter } from "next/router";
import { useEffect } from "react";
import Dashboard from "../components/Dashboard";
import { supabase } from "../utils/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkUser();
  }, [router]);

  return <Dashboard />;
}