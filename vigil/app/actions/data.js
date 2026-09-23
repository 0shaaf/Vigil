"use server";

import { createSupabaseServerClient } from "../lib/supabase/server-client";

export async function readTableData(tableName) {
  const sp_client = await createSupabaseServerClient();
  const { error, data } = await sp_client.from(tableName).select("*");

  if (error) {
    console.log("[Error] : ", error.message);
    throw new Error(error.message);
  }

  return { error: error, data: data };
}

export async function getSwitchByID(id) {
  const sp_client = await createSupabaseServerClient();
  const { error, data } = await sp_client.from('switches').select("*").eq('id' , id);

  if (error) {
    console.log("[Error] : ", error.message);
    throw new Error(error.message);
  }

  return { error: error, data: data };
}