"use client";

import * as React from "react";
import { useNexusStore } from "@/lib/store";
import type { User } from "@/lib/store";

/**
 * Returns the currently signed-in user, or undefined.
 *
 * Selects primitive state (userId) and looks up the user separately so the
 * selector returns a stable reference. Avoids the React "getSnapshot should
 * be cached" warning that occurs when calling signedInUser() directly inside
 * a selector.
 */
export function useSignedInUser(): User | undefined {
  const userId = useNexusStore((s) => s.session?.userId);
  const user = useNexusStore((s) => (userId ? s.users.find((u) => u.id === userId) : undefined));
  return user;
}
