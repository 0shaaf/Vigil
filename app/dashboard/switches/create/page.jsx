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
    <div className="switch-create-page-wrapper">
      <div className="switch-view-container">
        <CreateSwitchForm availableContacts={contacts || []} />
      </div>
    </div>
  );
}