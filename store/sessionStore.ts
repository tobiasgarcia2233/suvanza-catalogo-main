import { create } from "zustand";

// The root layout is deliberately cookie-free — that's what keeps the seller
// catalog (/[seller_name]) statically cached — so the client <Navbar> can't read
// the httpOnly session cookie itself. Pages that already load the session on the
// server (e.g. "/") push the result here via <SessionSync> so the navbar knows
// whether to show the admin links on routes that aren't obviously admin-only.
interface SessionState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}));
