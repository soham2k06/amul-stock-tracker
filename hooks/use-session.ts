"use client";

import { authClient } from "@/lib/auth-client";
import type { ServerSession } from "@/lib/get-server-session";
import { useHasMounted } from "./use-has-mounted";

// Merges the session a Server Component already fetched (from request
// cookies) with the client's own session fetch. The server-provided value
// is used for the initial render on both server and client, so there's no
// hydration mismatch and no flash of a signed-out state while the client
// fetch is in flight. Once the client fetch resolves, its value takes over
// so sign-in/sign-out stay reactive without a page reload.
export function useSession(initialSession?: ServerSession) {
  const mounted = useHasMounted();
  const client = authClient.useSession();
  const data = !mounted || client.isPending ? initialSession : client.data;
  return { ...client, data };
}
