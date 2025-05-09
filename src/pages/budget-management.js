import { useRouter } from "next/router";
import { useEffect } from "react";
import BudgetManagement from "../components/BudgetManagement";
import { supabase } from "../utils/supabaseClient";

export default function BudgetManagementPage() {
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

  return <BudgetManagement />;
}