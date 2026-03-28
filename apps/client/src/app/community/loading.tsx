/**
 * Route-level loading UI (Server Component). Shown during navigations while the segment resolves.
 * Auth gating still runs on the client after hydration (tokens live in `localStorage`).
 */
export default function CommunityLoading() {
  return (
    <main className="min-h-dvh bg-background p-8 text-foreground">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-44 rounded-md bg-muted" />
        <div className="h-4 max-w-md rounded-md bg-muted" />
        <div className="h-4 max-w-sm rounded-md bg-muted" />
      </div>
    </main>
  );
}
