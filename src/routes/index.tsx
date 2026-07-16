import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const { ready, ageOk, username, pinOk } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!ageOk) navigate({ to: "/age" });
    else if (!username) navigate({ to: "/login" });
    else if (!pinOk) navigate({ to: "/pin" });
    else navigate({ to: "/home" });
  }, [ready, ageOk, username, pinOk, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}
