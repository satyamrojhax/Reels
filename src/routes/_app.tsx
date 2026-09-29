import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Sidebar, BottomNav, Footer, MobileHeader } from "@/components/nav";
import { InstallPwa } from "@/components/install-pwa";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useTheme();
  const navigate = useNavigate();
  const { ready, ageOk, username, pinOk } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReels = pathname === "/reels" || pathname === "/category" || pathname.startsWith("/creator");

  const [activeCrt, setActiveCrt] = useState(false);
  useEffect(() => {
    setActiveCrt(localStorage.getItem("ig.crt") === "true");
    const handleEffectsChange = () => {
      setActiveCrt(localStorage.getItem("ig.crt") === "true");
    };
    window.addEventListener("effects-change", handleEffectsChange);
    return () => window.removeEventListener("effects-change", handleEffectsChange);
  }, []);

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
    <div className={`flex min-h-screen w-full bg-background ${activeCrt ? "crt-filter" : ""}`}>
      <Sidebar username={username} />
      <div className="flex-1 min-w-0 flex flex-col relative h-screen overflow-y-auto">
        {!isReels && <MobileHeader />}
        <main className={`flex-1 relative ${isReels ? "" : "pt-14 pb-20 md:pb-0"}`}>
          <Outlet />
        </main>
        {!isReels && <BottomNav />}
      </div>
      <InstallPwa />
    </div>
  );
}
