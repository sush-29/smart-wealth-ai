import { useRouter } from "next/router";
import { useEffect } from "react";
import ProfileSettings from "../components/ProfileSettings";
import { supabase } from "../utils/supabaseClient";

export default function ProfileSettingsPage() {
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

  return <ProfileSettings />;
}