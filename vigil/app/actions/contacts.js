"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase/server-client";

export async function getContacts() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", data: [] };

  const { data, error } = await supabase
    .from("contacts")
    .select(`
      id,
      contact_name,
      email,
      created_at,
      switch_contacts (
        switch_id
      )
    `)
    .eq("usr_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase Error] getContacts:", error);
    return { error: error.message, data: [] };
  }

  return { data, error: null };
}

export async function createContact(payload) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const name = payload.contact_name?.trim();
  const email = payload.email?.trim().toLowerCase();

  if (!name || !email) {
    return { error: "Name and email are required." };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      usr_id: user.id,
      contact_name: name,
      email: email,
    })
    .select()
    .single();

  if (error) {
    console.error("[Supabase Error] createContact:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/switches");
  return { success: true, contact: data };
}

export async function deleteContact(contactId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("usr_id", user.id);

  if (error) {
    console.error("[Supabase Error] deleteContact:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/switches");
  return { success: true };
}