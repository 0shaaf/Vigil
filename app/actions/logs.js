"use server";

import { createSupabaseServerClient } from "../lib/supabase/server-client";

const PAGE_SIZE = 50;

/**
 * Fetches a paginated slice of escalation logs for the authenticated operator.
 * Uses PostgREST .range(from, to) with 0-indexed inclusive bounds.
 *
 * @param {number} page - 1-based page index
 * @returns {Promise<{ logs: Array, totalCount: number, page: number, totalPages: number, error?: string }>}
 */
export async function fetchLogsPage(page = 1) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: "Authentication required",
      logs: [],
      totalCount: 0,
      page: 1,
      totalPages: 1,
    };
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await supabase
    .from("escalation_logs")
    .select(
      `
      id,
      usr_id,
      switch_id,
      event_type,
      channel,
      recipient_email,
      trust_tier,
      status,
      details,
      execution_metadata,
      created_at,
      switches:switch_id (
        id,
        name
      )
    `,
      { count: "exact" }
    )
    .eq("usr_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchLogsPage] Database query error:", error);
    return {
      error: error.message,
      logs: [],
      totalCount: 0,
      page: currentPage,
      totalPages: 1,
    };
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    logs: data || [],
    totalCount,
    page: currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}
