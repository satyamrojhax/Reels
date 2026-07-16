import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Sidebar, BottomNav, MarqueeStrip, Footer } from "@/components/nav";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useTheme();
  const navigate = useNavigate();
  const { ready, ageOk, username, pinOk } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReels = pathname === "/reels";

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age" });
    else if (!username) navigate({ to: "/login" });
    else if (!pinOk && pathname !== "/pin" && pathname !== "/pin-setup") navigate({ to: "/pin" });
  }, [ready, ageOk, username, pinOk, navigate, pathname]);

  if (!ready || !ageOk || !username || !pinOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isReels && <MarqueeStrip />}
      <Sidebar username={username} />
      <main
        className={
          isReels ? "md:pl-[244px]" : "pb-20 md:pb-0 md:pl-[244px]"
        }
      >
        <Outlet />
      </main>
      {!isReels && <BottomNav />}
    </div>
  );
}

