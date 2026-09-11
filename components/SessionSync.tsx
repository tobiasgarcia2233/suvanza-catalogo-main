"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";

// Bridges a server-read session flag into the client session store so <Navbar>
// can react to it. Render it from any server page that knows the auth state.
export default function SessionSync({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const setAuthenticated = useSessionStore((s) => s.setAuthenticated);

  useEffect(() => {
    setAuthenticated(isAuthenticated);
  }, [isAuthenticated, setAuthenticated]);

  return null;
}
