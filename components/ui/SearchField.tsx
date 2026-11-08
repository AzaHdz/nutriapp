/** GET search form for list pages: full width on mobile, capped on larger screens.
 *  `keep` carries the active filters (e.g. { filtro: "pendiente" }) across searches. */
export function SearchField({
  placeholder,
  defaultValue,
  keep = {},
}: {
  placeholder: string;
  defaultValue?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form className="flex w-full items-center gap-2 rounded-pill border border-border-strong bg-surface px-4 py-2 sm:max-w-sm sm:flex-1">
      <SearchIcon />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
      />
      {Object.entries(keep).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-text-3" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
