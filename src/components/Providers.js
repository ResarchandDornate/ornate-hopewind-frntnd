"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import ThemeProvider, { useTheme } from "@/components/ThemeProvider";

export default function Providers({ children }) {
  // Lazy-init so a single client instance is shared for the page load.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            retry: 1,
            // Background tabs get their timers throttled, so a dashboard left
            // open elsewhere falls behind. Re-sync the moment it regains focus.
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Sonner paints its own surface, so it has to be told the theme explicitly -
 * left on its default the toasts stay white on a dark dashboard.
 */
function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-center" theme={theme} richColors closeButton />;
}
