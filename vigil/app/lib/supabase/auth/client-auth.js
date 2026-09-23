import { getSupabaseBrowserClient } from "../browser-client";


export async function signUpWithEmail(email, password) {
  const sp_BrowserClient = getSupabaseBrowserClient();
  return await sp_BrowserClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/welcome`,
    },
  });
}


export async function signInWithEmail(email, password) {
  const sp_BrowserClient = getSupabaseBrowserClient();
  return await sp_BrowserClient.auth.signInWithPassword({
    email,
    password,
  });
}


export async function signInWithGoogle() {
  const sp_BrowserClient = getSupabaseBrowserClient();
  return await sp_BrowserClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      skipBrowserRedirect: false,
    },
  });
}

export async function signOutUser() {
  const sp_BrowserClient = getSupabaseBrowserClient();
  return await sp_BrowserClient.auth.signOut();
}


export function subscribeToAuthState(onUserChange) {
  const sp_BrowserClient = getSupabaseBrowserClient();
  const { data: listener } = sp_BrowserClient.auth.onAuthStateChange(
    (_event, session) => {
      onUserChange(session?.user ?? null);
    }
  );

  return () => {
    listener?.subscription.unsubscribe();
  };
}