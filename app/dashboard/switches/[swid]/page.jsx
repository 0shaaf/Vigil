import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getSwitchById } from "@/app/actions/switches";
import EditSwitchForm from "../../components/EditFormSwitch";
import "../../css/switch-form.css";

export default async function SwitchDetailPage({ params }) {
  const resolvedParams = await params;
  const swid = resolvedParams.swid;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Fetch target switch data and all available contacts in parallel
  const [switchRes, contactsRes] = await Promise.all([
    getSwitchById(swid),
    supabase
      .from("contacts")
      .select("id, contact_name, email")
      .eq("usr_id", user.id)
      .order("contact_name", { ascending: true }),
  ]);

  if (switchRes.error || !switchRes.data) {
    notFound();
  }

  return (
    <div className="switch-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="view-breadcrumb">
        <Link href="/dashboard/switches">Switches</Link>
        <span className="view-breadcrumb-separator">/</span>
        <span>{switchRes.data.name}</span>
      </nav>

      {/* Header */}
      <header className="view-header">
        <div>
          <h1 className="view-title">{switchRes.data.name}</h1>
          <p className="view-description">
            Update trigger criteria, clearance assignments, and disclosure rows.
          </p>
        </div>
      </header>

      {/* Pre-populated Client Edit Form */}
      <EditSwitchForm
        switchData={switchRes.data}
        availableContacts={contactsRes.data || []}
      />
    </div>
  );
}