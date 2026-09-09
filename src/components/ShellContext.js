"use client";

import { createContext, useContext } from "react";

/**
 * Shell state shared by the authenticated area: live-socket status, and the
 * trigger for the mobile navigation drawer the dashboard layout owns.
 *
 * It lives in its own module rather than in layout.js so pages can import the
 * hook without importing a route file.
 */
export const ShellContext = createContext({
  connected: false,
  lastMessageAt: null,
  openNav: () => {},
});

export const useShell = () => useContext(ShellContext);

export default ShellContext;
