import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSwitchById } from "@/app/actions/switches"; // Adjust to your server action import path
import EditFormSwitch from "../../components/EditFormSwitch";
import "../../css/edit-switch.css";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

export const metadata = {
  title: "Configure Switch | Vigil",
};

export default async function EditSwitchPage({ params }) {
  const resolvedParams = await params;
  const swid = resolvedParams.swid;
  

  console.log("Params : " , resolvedParams)
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

  return (
    <main className="edit-switch-container">
      <header className="edit-switch-header">
        <h1>
          Configure Switch
          <span className="edit-header-badge">#{switchData.id}</span>
        </h1>
        <p>Modify duration thresholds, criticality tiers, and autonomous action modules.</p>
      </header>

      <EditFormSwitch initialSwitch={switchData} />
    </main>
  );
}