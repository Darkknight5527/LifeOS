import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { FinCard, Icon, Segmented } from "../finances/fin-ui.jsx";

const SECTIONS = [
  { value: "tech", label: "Tech" },
  { value: "chips", label: "Chips" },
  { value: "india", label: "India" },
  { value: "world", label: "World" },
  { value: "sports", label: "Sports" },
];
const CACHE = "lifeos_news_cache_v1";

function ago(iso) {
  if (!iso) return "";
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function useNews() {
  const [state, setState] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (c?.sections) return { ...c, loading: false, syncing: true, error: null };
    } catch {
      /* ignore */
    }
    return { sections: {}, loading: true, syncing: true, error: null };
  });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, syncing: true, error: null }));
    try {
      const res = await api.paperNews();
      const next = { sections: res.sections || {}, fetchedAt: res.fetchedAt };
      setState({ ...next, loading: false, syncing: false, error: null });
      try {
        localStorage.setItem(CACHE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    } catch (err) {
      setState((s) => ({ ...s, loading: false, syncing: false, error: err.message || "Couldn't load news" }));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

export default function NewsCard({ news }) {
  const [section, setSection] = useState("tech");
  const items = news.sections?.[section] || [];

  return (
    <FinCard
      title={
        <span className="flex items-center gap-2">
          <Icon name="news" size={16} /> Headlines
        </span>
      }
      action={<Segmented className="w-[330px] !p-0.5 [&_button]:!py-1 [&_button]:!text-[12.5px]" value={section} onChange={setSection} options={SECTIONS} />}
      className="lg:flex lg:h-[calc(100dvh-488px)] lg:min-h-[220px] lg:flex-col"
    >
      {news.loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-fin-input" />)}</div>
      ) : items.length ? (
        <ol key={section} className="fin-scroll -mr-2 animate-fade-in divide-y divide-fin-line pr-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {items.map((n, i) => (
            <li key={n.link || n.title}>
              <a href={n.link} target="_blank" rel="noreferrer" className="group flex gap-3 py-2.5">
                <span className="font-paper w-5 shrink-0 text-right text-[17px] font-black leading-snug text-fin-accent/70">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14.5px] font-semibold leading-snug group-hover:text-fin-accent">{n.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-fin-muted">
                    {[n.source, ago(n.published)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <div className="py-6 text-center text-[14px] text-fin-muted">
          {news.error ? "Couldn't reach the news right now." : "No headlines in this section yet."}
          {news.error && (
            <button onClick={news.reload} className="ml-2 font-semibold text-fin-accent">Retry</button>
          )}
        </div>
      )}
    </FinCard>
  );
}
