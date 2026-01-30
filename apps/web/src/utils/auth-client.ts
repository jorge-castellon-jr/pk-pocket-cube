import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient(
  {
    baseURL: import.meta.env.VITE_SERVER_URL, // The base URL of your auth server
  }
);

/**
 * This hook is a simple abstraction over the better-auth's useSession hook.
 * It adds an additional state to check if it's the first time checking for the session.
 * This is useful for example when you want to show a loading state until the session is checked.
 */
export const useSession = () => {
  const { data, isPending, error, refetch } = authClient.useSession();
  const [isInitialPending, setIsInitialPending] = useState(true);

  useEffect(() => {
    if (error || data || !isPending) {
      setIsInitialPending(false);
    }
  }, [data, error, isPending]);

  return {
    data,
    isInitialPending,
    isPending,
    error,
    refetch,
    isAuthenticated: !!data?.user,
  };
};

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
