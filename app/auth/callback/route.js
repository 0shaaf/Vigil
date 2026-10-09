import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/welcome";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
   
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const hasCompletedOnboarding = Boolean(
        user?.user_metadata?.onboarding_completed
      );

      const destination = hasCompletedOnboarding
        ? next === "/welcome"
          ? "/dashboard"
          : next
        : "/welcome";

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}