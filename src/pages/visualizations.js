import { useRouter } from "next/router";
import { useEffect } from "react";
import Visualizations from "../components/Visualizations";
import { supabase } from "../utils/supabaseClient";

export default function VisualizationsPage() {
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

  return <Visualizations />;
}