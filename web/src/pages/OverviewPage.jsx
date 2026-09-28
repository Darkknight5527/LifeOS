export default function OverviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="text-slate-500">
        This is the starting point for your LifeOS dashboard. Port each section
        from the prototype artifact (Physical, Goals, Technical &amp; Projects,
        Learning, and eventually Mental &amp; Psych) into its own page here,
        wired to the real API in <code>src/api.js</code> instead of the
        artifact's <code>db</code> capability.
      </p>
    </div>
  );
}
