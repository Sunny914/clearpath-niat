export function BriefViewSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby={id}
    >
      <h3 id={id} className="text-base font-semibold text-navy">
        {title}
      </h3>
      <div className="mt-3 text-sm leading-relaxed text-navy-muted">{children}</div>
    </section>
  );
}
