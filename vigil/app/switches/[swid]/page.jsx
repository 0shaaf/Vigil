import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";
import EditForm from "./EditForm";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
export default async function EditSwitch({ params }) {
  const { swid } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: switchData, error } = await supabase
    .from("switches")
    .select("*, switch_contacts(*), info_to_release(*)")
    .eq("id", swid)
    .single();

    if (error || !switchData) {
    notFound(); // Triggers the nearest not-found.jsx boundary
    }
    
  return (
    <>
      <EditForm swData={switchData} />
    </>
  );
}
