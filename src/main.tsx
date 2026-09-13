import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./styles.css";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes — prevents redundant refetches on
      // focus, mount, or tab switch for recently-fetched data.
      staleTime: 5 * 60_000,
      // Keep data in the cache for 30 minutes after last use
      gcTime: 30 * 60_000,
      // Only retry network errors, not 4xx client errors
      retry: (failureCount, error) => {
        const status = (error as any)?.status ?? 0;
        if (status >= 400 && status < 500 && status !== 429) return false;
        return failureCount < 3;
      },
      retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
      // Refetch on reconnect but not on every window focus (reduces noise)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
