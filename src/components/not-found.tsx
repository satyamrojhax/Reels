import { Link, Navigate, useLocation } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

export function NotFoundComponent() {
  const location = useLocation();

  if (location.pathname !== "/something-fake") {
    return <Navigate to={"/something-fake" as any} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dusk-indigo px-4 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 backdrop-blur-md">
        <AlertCircle className="h-12 w-12 text-marker" />
      </div>
      <h1 className="font-display text-8xl font-bold tracking-tighter text-white drop-shadow-md">
        404
      </h1>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white/90">
        Not Found
      </h2>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
        We couldn't find the page you're looking for. It might have been removed, renamed, or didn't exist in the first place.
      </p>
      <Link 
        to="/" 
        className="mt-10 flex items-center justify-center rounded-full bg-marker px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-marker/20 transition hover:bg-marker/90 hover:shadow-marker/40 active:scale-95"
      >
        Take me home
      </Link>
    </div>
  );
}
