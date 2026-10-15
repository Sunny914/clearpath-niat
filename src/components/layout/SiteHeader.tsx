export function SiteHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            className="flex size-9 items-center justify-center rounded-lg bg-teal/10 text-sm font-bold text-teal"
            aria-hidden
          >
            CP
          </span>
          <span className="text-lg font-semibold tracking-tight text-navy">
            ClearPath NIAT
          </span>
        </div>
        <p className="hidden text-sm text-navy-muted sm:block">
          Prototype · Growth Hack Challenge
        </p>
      </div>
    </header>
  );
}
