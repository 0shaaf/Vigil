import { createSupabaseServerClient } from "../lib/supabase/server-client";
import ConstellationWeb from "./components/ConstellationWeb";
import "./css/dashboard.css";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: switches } = await supabase
    .from("switches")
    .select("*")
    .eq("usr_id", user.id);

  return <ConstellationWeb switches={switches || []} />;
}