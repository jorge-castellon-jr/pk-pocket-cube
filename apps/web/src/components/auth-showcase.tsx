import { useSession } from "../utils/auth-client";

import { Button } from "@repo/ui/button";

import { authClient } from "../utils/auth-client";

export const AuthShowcase = () => {
  const { data: session, isInitialPending } = useSession();

  const signIn = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: window.location.origin,
    });
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  if (isInitialPending) {
    return <p>Loading...</p>;
  }

  if (session?.user) {
    return (
      <div className="flex flex-col items-start gap-3 p-4 rounded-lg bg-zinc-800/80 shadow-md">
        <div className="flex items-center gap-2">
          <img
            src={
              session.user.image ??
              `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email ?? "User")}&background=6D28D9&color=fff`
            }
            alt="User avatar"
            className="w-10 h-10 rounded-full border border-white"
          />
          <div>
            <p className="text-base text-white">Signed in as</p>
            <p className="text-base font-medium text-zinc-100">
              {session.user.email}
            </p>
          </div>
        </div>
        <Button
          onClick={signOut}
          className="mt-2 px-4 py-1"
          size="sm"
          variant="secondary"
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-zinc-800/60 shadow">
      <p className="text-lg text-center text-zinc-100">
        Sign in with your Discord account
      </p>
      <Button
        className="flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 text-white font-medium text-base shadow hover:bg-indigo-700 transition"
        onClick={signIn}
      >
        <svg
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 24 24"
          className="mr-1"
        >
          <defs>
            <linearGradient id="discord-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7289da" />
              <stop offset="100%" stopColor="#5865F2" />
            </linearGradient>
          </defs>
          <path
            d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
            fill="url(#discord-gradient)"
          />
        </svg>
        <span>Sign in with Discord</span>
      </Button>
    </div>
  );
};
