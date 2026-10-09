"use server";

import { createSupabaseServerClient } from "../lib/supabase/server-client";

/**
 * Saves operator profile data (Full Name, Age, Profession) into Supabase auth.users raw_user_meta_data.
 * Marks onboarding_completed: true to unlock dashboard access.
 *
 * @param {Object} data - { fullName, age, profession }
 * @returns {Promise<{ success?: boolean, error?: string }>}
 */
export async function completeOnboarding({ fullName, age, profession }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required to complete onboarding." };
  }

  const cleanName = (fullName || "").trim();
  const numAge = parseInt(age, 10);
  const cleanProfession = (profession || "").trim();

  if (!cleanName || cleanName.length < 2) {
    return { error: "Please provide a valid full name." };
  }

  if (isNaN(numAge) || numAge < 13 || numAge > 125) {
    return { error: "Please provide a valid age between 13 and 125." };
  }

  if (!cleanProfession || cleanProfession.length < 2) {
    return { error: "Please provide a valid profession or role." };
  }

  const updatedMetadata = {
    ...(user.user_metadata || {}),
    full_name: cleanName,
    age: numAge,
    profession: cleanProfession,
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase.auth.updateUser({
    data: updatedMetadata,
  });

  if (updateError) {
    console.error("[completeOnboarding] Error updating user metadata:", updateError);
    return { error: updateError.message };
  }

  return { success: true };
}
