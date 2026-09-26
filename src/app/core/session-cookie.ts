// Firebase Hosting only forwards one cookie to Cloud Functions, and it has to be named
// __session. Board documents are served by the `dokument` function, which can't see the
// app's Firebase Auth session (that lives in the browser's own storage) - so while an admin
// has /dokumenter open, a short-lived ID token is kept in this cookie for the function to
// verify. It expires with the token (1 hour) and is cleared on logout / leaving the page.
const NAME = '__session';

export function setSessionCookie(idToken: string) {
  document.cookie = `${NAME}=${encodeURIComponent(idToken)}; Path=/; Max-Age=3300; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  document.cookie = `${NAME}=; Path=/; Max-Age=0; Secure; SameSite=Lax`;
}
