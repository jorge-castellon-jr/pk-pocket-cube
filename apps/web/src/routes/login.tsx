import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../utils/auth-client";
import { authClient } from "../utils/auth-client";
import { Button } from "@repo/ui/button";
import {
  fetchEditors,
  setEditor as setEditorApi,
  type EditorUser,
} from "../api/draft-pool";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isInitialPending } = useSession();

  const editorsQuery = useQuery({
    queryKey: ["editors"],
    queryFn: fetchEditors,
    enabled: !!session?.user,
  });

  const setEditorMutation = useMutation({
    mutationFn: ({ userId, canEdit }: { userId: string; canEdit: boolean }) =>
      setEditorApi(userId, canEdit),
    onMutate: async ({ userId, canEdit }) => {
      await queryClient.cancelQueries({ queryKey: ["editors"] });
      const previous = queryClient.getQueryData<{
        users: EditorUser[];
        isEditor: boolean;
      }>(["editors"]);
      queryClient.setQueryData<
        { users: EditorUser[]; isEditor: boolean }
      >(["editors"], (old) =>
        old
          ? {
              ...old,
              users: old.users.map((u) =>
                u.id === userId ? { ...u, canEdit } : u,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["editors"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["editors"] });
    },
  });

  const signIn = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: window.location.origin + "/",
    });
  };

  const signOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  const handleCanEditChange = (user: EditorUser) => {
    setEditorMutation.mutate({ userId: user.id, canEdit: !user.canEdit });
  };

  if (isInitialPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white flex flex-col items-center justify-center gap-6">
        <div className="animate-pulse text-white/70">Loading…</div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-bounce [animation-delay:0ms]" />
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-bounce [animation-delay:150ms]" />
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (session?.user) {
    const users = editorsQuery.data?.users ?? [];
    const isEditor = editorsQuery.data?.isEditor ?? false;

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
        <header className="border-b border-white/10 bg-blue-950/90 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-white/70 hover:text-white text-sm">
              ← Home
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 w-full text-center space-y-6">
            <h1 className="text-lg font-semibold text-yellow-200 uppercase tracking-wider">
              Signed in
            </h1>
            <div className="flex flex-col items-center gap-3">
              <img
                src={
                  session.user.image ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name ?? session.user.email ?? "User")}&background=5865F2&color=fff`
                }
                alt=""
                className="w-16 h-16 rounded-full border-2 border-white/20"
              />
              <p className="text-white font-medium">
                {session.user.name ?? session.user.email ?? "User"}
              </p>
              {session.user.email && (
                <p className="text-sm text-white/60">{session.user.email}</p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="outline" asChild>
                <Link to="/">Back to home</Link>
              </Button>
              <Button variant="secondary" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>

          {editorsQuery.isSuccess && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 w-full space-y-4">
              <h2 className="text-lg font-semibold text-yellow-200 uppercase tracking-wider">
                Users
              </h2>
              <p className="text-sm text-white/60">
                {isEditor
                  ? "Toggle who can edit the draft pool."
                  : "Only editors can change who can edit."}
              </p>
              {editorsQuery.isPending ? (
                <p className="text-white/60 text-sm">Loading users…</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-4 py-3 font-medium text-white/90">
                          User
                        </th>
                        <th className="px-4 py-3 font-medium text-white/90 w-24 text-center">
                          Can edit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  user.image ??
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name ?? user.email ?? "?")}&background=5865F2&color=fff`
                                }
                                alt=""
                                className="h-8 w-8 rounded-full border border-white/20"
                              />
                              <div>
                                <span className="font-medium text-white">
                                  {user.name ?? user.email ?? "—"}
                                </span>
                                {user.email && (
                                  <span className="ml-2 text-white/60">
                                    {user.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={user.canEdit}
                              onChange={() => handleCanEditChange(user)}
                              disabled={
                                !isEditor ||
                                (setEditorMutation.isPending &&
                                  setEditorMutation.variables?.userId === user.id)
                              }
                              className="h-4 w-4 rounded border-white/30 bg-white/10 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 focus:ring-offset-transparent"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      </div>
      <header className="relative z-10 border-b border-white/10 bg-blue-950/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-white/70 hover:text-white text-sm">
            ← Home
          </Link>
        </div>
      </header>
      <main className="relative z-10 max-w-md mx-auto px-4 py-20 flex flex-col items-center gap-10">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-white/70 text-sm">
            Sign in with Discord to access draft pool editing and more.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-10 w-full flex flex-col items-center gap-6">
          <Button
            size="lg"
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium"
            onClick={signIn}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Login with Discord
          </Button>
        </div>
      </main>
    </div>
  );
}
