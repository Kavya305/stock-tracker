import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Only these email addresses may sign in. Set ALLOWED_EMAILS in the
// environment as a comma-separated list, e.g. "you@gmail.com,dad@gmail.com".
const allowed = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  callbacks: {
    // Reject anyone whose Google email is not on the allowlist.
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      return !!email && allowed.includes(email);
    },
  },
  pages: {
    signIn: "/signin",
  },
});
