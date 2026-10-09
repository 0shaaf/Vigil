import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSwitchById } from "@/app/actions/switches";
import CreateSwitchForm from "../../components/CreateSwitchForm";
import "../../css/switch-form.css";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

export const metadata = {
  title: "Configure Switch | Vigil",
};

export default async function EditSwitchPage({ params }) {
  const resolvedParams = await params;
  const swid = resolvedParams.swid;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const switchData = await getSwitchById(swid);

  if (!switchData || switchData.usr_id !== user.id) {
    notFound();
  }

  // Fetch the user's available base contacts pool
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, contact_name, email")
    .eq("usr_id", user.id)
    .order("contact_name", { ascending: true });

  return (
    <div className="switch-create-page-wrapper">
      <div className="switch-view-container">
        <CreateSwitchForm
          initialSwitch={switchData}
          availableContacts={contacts || []}
        />
      </div>
    </div>
  );
}