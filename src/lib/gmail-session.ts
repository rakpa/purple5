import { saveGmailSessionTokens } from "./gmail";
import { supabase } from "./supabase";

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
