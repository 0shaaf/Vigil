import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import { getContacts } from "@/app/actions/contacts";
import ContactsClient from "../components/ContactsClient";

export default async function ContactsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: contacts } = await getContacts();

  return <>
   <ContactsClient initialContacts={contacts || []} />;
  </>
}