import { saveGmailSessionTokens } from "./gmail";
import { supabase } from "./supabase";

const GMAIL_SCOPES = "email profile https://www.googleapis.com/auth/gmail.readonly";

export async function syncGmailFromGoogleLogin() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return null;
  const isGoogle =
    session.user.app_metadata?.provider === "google" ||
    session.user.identities?.some((identity) => identity.provider === "google");
  if (!isGoogle) return null;
  if (!session.provider_token && !session.provider_refresh_token) {
    return { email: session.user.email || null, stored: false };
  }
  await saveGmailSessionTokens({
    email: session.user.email,
    access_token: session.provider_token,
    refresh_token: session.provider_refresh_token,
    expires_in: 3600,
  }).catch(() => null);
  return { email: session.user.email || null, stored: true };
}

export async function requestGmailAccess(returnTo = "/") {
  const origin = window.location.origin;
  const redirectUrl = `${origin}${returnTo}`;
  localStorage.setItem("auth_redirect_url", redirectUrl);
  localStorage.setItem("auth_origin", origin);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      scopes: GMAIL_SCOPES,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      },
    },
  });
  if (error) {
    localStorage.removeItem("auth_redirect_url");
    localStorage.removeItem("auth_origin");
    throw error;
  }
}
