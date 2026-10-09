"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase/server-client";

export async function getContacts() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [getContacts] Unauthorized access attempt:", {
      authError: authErr?.message,
      hasUser: Boolean(user),
    });
    return { error: "Unauthorized", data: [] };
  }

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
    console.error("[SERVER ERROR] [getContacts] Failed querying user contacts from database:", {
      userId: user.id,
      error: error.message,
      details: error.details,
      code: error.code,
    });
    return { error: error.message, data: [] };
  }

  return { data, error: null };
}

export async function createContact(payload) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [createContact] Unauthorized attempt to create contact:", {
      authError: authErr?.message,
    });
    return { error: "Unauthorized" };
  }

  const name = payload.contact_name?.trim();
  const email = payload.email?.trim().toLowerCase();

  if (!name || !email) {
    console.error("[SERVER ERROR] [createContact] Invalid input payload:", {
      name,
      email,
      userId: user.id,
    });
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
    console.error("[SERVER ERROR] [createContact] Database error inserting new contact:", {
      userId: user.id,
      contactName: name,
      email,
      error: error.message,
      details: error.details,
    });
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
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    console.error("[SERVER ERROR] [deleteContact] Unauthorized attempt to delete contact:", {
      contactId,
      authError: authErr?.message,
    });
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("usr_id", user.id);

  if (error) {
    console.error("[SERVER ERROR] [deleteContact] Database error deleting contact:", {
      contactId,
      userId: user.id,
      error: error.message,
      details: error.details,
    });
    return { error: error.message };
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/switches");
  return { success: true };
}