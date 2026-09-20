"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase/server-client";

// Create contact (from app/actions.js)
export async function createContact(name, email) {
  const sp_client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sp_client.auth.getUser();

  const outGoingData = {
    usr_id: user.id,
    email: email,
    contact_name: name,
  };

  const response = await sp_client.from("contacts").insert(outGoingData);

  if (response.error) {
    console.log("Error Creating Contact : ", response);
    return response.error;
  } else {
    revalidatePath("/contacts");
  }
}

// Update contact (from app/actions.js)
export async function updateContact(contactID, name, email) {
  const sp_client = await createSupabaseServerClient();

  const response = await sp_client
    .from("contacts")
    .update({
      contact_name: name,
      email: email,
    })
    .eq("id", contactID);

  if (response.error) {
    console.log("[Failed] : Error Updating contacts. Response : ", response);
    return response.error;
  }
}

// Remove contact (from app/actions.js)
export async function removeContact(contactID) {
  const sp_client = await createSupabaseServerClient();

  const response = await sp_client
    .from("contacts")
    .delete()
    .eq("id", contactID);

  if (response.error) {
    console.log("[Failed] : Error deleteing contacts. Response : ", response);
    return response.error;
  }
}