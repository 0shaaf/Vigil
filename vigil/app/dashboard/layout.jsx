import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server-client";
import Sidebar from "./components/Sidebar";

export default async function DashboardLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#07090e" }}>
      <Sidebar userEmail={data.user.email} />
      <main style={{ flex: 1, padding: 0, overflow: "hidden", height: "100vh" }}>
        {children}
      </main>
    </div>
  );
}