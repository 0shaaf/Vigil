import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import CreateSwitchForm from "../../components/CreateSwitchForm";
import "../../css/switch-form.css";

export default async function CreateSwitchPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch the user's base pool of contacts
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, contact_name, email")
    .eq("usr_id", user.id)
    .order("contact_name", { ascending: true });

  return (
    <div className="switch-view-container">
      <nav className="view-breadcrumb">
        <Link href="/dashboard/switches">Switches</Link>
        <span className="view-breadcrumb-separator">/</span>
        <span>Arm New Switch</span>
      </nav>

      <header className="view-header">
        <div>
          <h1 className="view-title">Arm New Switch</h1>
          <p className="view-description">
            Configure escalation matrix, authorized contacts, and multi-tier disclosure rules.
          </p>
        </div>
      </header>

      <CreateSwitchForm availableContacts={contacts || []} />
    </div>
  );
}