import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SignIn() {
  // Already signed in? Go straight to the app.
  if (await auth()) redirect("/");

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900/60 p-8 text-center">
        <div className="text-3xl mb-2">📈</div>
        <h1 className="text-xl font-bold mb-1">Stock Tracker</h1>
        <p className="text-sm text-gray-400 mb-6">
          Private access. Sign in with an authorised Google account.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-white text-gray-900 font-medium px-4 py-2.5 hover:bg-gray-100 transition"
          >
            Sign in with Google
          </button>
        </form>
        <p className="mt-6 text-xs text-gray-600">
          Only pre-approved accounts can enter. This tool shows informational
          indicators, not investment advice.
        </p>
      </div>
    </div>
  );
}
