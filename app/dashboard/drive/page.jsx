import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import DriveFilesClient from "../components/DriveFilesClient";

export const dynamic = "force-dynamic";

export default async function DrivePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all switches owned by the operator along with their disclosure metadata
  const { data: switchesData, error } = await supabase
    .from("switches")
    .select(`
      id,
      name,
      status,
      criticality,
      info_to_release (
        id,
        file_metadata
      )
    `)
    .eq("usr_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Drive Page] Error fetching switch disclosures:", error);
  }

  // Flatten all files into an asset list with parent switch context
  const initialFiles = [];
  (switchesData || []).forEach((sw) => {
    (sw.info_to_release || []).forEach((disclosure) => {
      const files = Array.isArray(disclosure.file_metadata)
        ? disclosure.file_metadata
        : [];

      files.forEach((file) => {
        initialFiles.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          webViewLink: file.webViewLink,
          iconLink: file.iconLink,
          modifiedTime: file.modifiedTime,
          switch_id: sw.id,
          switch_name: sw.name,
          switch_status: sw.status,
          switch_criticality: sw.criticality,
        });
      });
    });
  });

  return <DriveFilesClient initialFiles={initialFiles} />;
}