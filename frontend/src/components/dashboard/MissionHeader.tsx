export function MissionHeader() {
  return (
    <header className="pb-1 pt-2">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-[28px]">
        Mission overview
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Current mission status, detections, and target locations.
      </p>
    </header>
  );
}
