"use client";

import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};
const getMountedTrue = () => true;
const getMountedFalseOnServer = () => false;

// Client/server render the same on first paint (false), then this flips to
// true right after hydration, letting client-only state (e.g. an auth
// session fetched over HTTP) safely diverge without a hydration mismatch.
export function useHasMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    getMountedTrue,
    getMountedFalseOnServer,
  );
}
