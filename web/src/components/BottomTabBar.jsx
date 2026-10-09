// Phone / tablet bottom bar shared by every domain: the domain's own tabs,
// then a "Domains" button on the right, under your thumb (opens the switcher).
// Swiping sideways on the page still moves between the tabs, and holding a tab
// pops up its views (Today, History…) to jump straight to one.
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../pages/finances/fin-ui.jsx";
import { useAppMenu } from "./AppMenu.jsx";
import { haptic } from "../lib/inApp.js";

const HOLD_MS = 380;

// tabs: [{ id, label, icon }]
// views (optional): { [tabId]: [{ value, label }] } — hold a tab to jump straight to one of its views
// currentViews (optional): { [tabId]: value } — marks the open view in that menu
// onView(tabId, value): called when a view is picked from the menu
export default function BottomTabBar({ tabs, tab, onTab, views, currentViews, onView }) {
  const { openDomains } = useAppMenu();
  const [menu, setMenu] = useState(null); // { tabId, x } while the hold menu is open
  const [hot, setHot] = useState(null); // view under the finger while sliding
  const press = useRef(null); // { tabId, x, y, timer, opened }
  const navRef = useRef(null);

  const close = useCallback(() => {
    setMenu(null);
    setHot(null);
  }, []);

  // Tap anywhere else (or press Back / Escape) to close the menu.
  useEffect(() => {
    if (!menu) return;
    const outside = (e) => {
      if (!navRef.current?.contains(e.target)) close();
    };
    const key = (e) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", close);
    };
  }, [menu, close]);

  const pick = (tabId, value) => {
    haptic("light");
    close();
    onView?.(tabId, value);
  };

  const itemAt = (x, y) => document.elementFromPoint(x, y)?.closest?.("[data-view-item]")?.dataset.viewItem || null;

  const startHold = (e, t) => {
    if (!views?.[t.id]?.length || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const r = e.currentTarget.getBoundingClientRect();
    const entry = { tabId: t.id, x: touch.clientX, y: touch.clientY, opened: false };
    entry.timer = setTimeout(() => {
      entry.opened = true;
      haptic("heavy");
      setHot(null);
      setMenu({ tabId: t.id, x: r.left + r.width / 2 });
    }, HOLD_MS);
    press.current = entry;
  };
  const moveHold = (e) => {
    const p = press.current;
    if (!p) return;
    const touch = e.touches[0];
    if (!p.opened) {
      // Moved before the menu opened: it's a scroll or swipe, not a hold.
      if (Math.hypot(touch.clientX - p.x, touch.clientY - p.y) > 10) {
        clearTimeout(p.timer);
        press.current = null;
      }
      return;
    }
    // Slide up onto an option, let go to choose it.
    setHot(itemAt(touch.clientX, touch.clientY));
  };
  const endHold = (e) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (!p.opened) return; // a normal tap: the click switches tab as usual
    e.preventDefault(); // stop the tap that ends a hold from also switching tab
    const touch = e.changedTouches[0];
    const v = touch && itemAt(touch.clientX, touch.clientY);
    if (v) pick(p.tabId, v);
    else setHot(null); // lifted on the tab itself: keep the menu open to tap
  };

  const menuViews = menu ? views?.[menu.tabId] || [] : [];
  const menuTab = menu ? tabs.find((t) => t.id === menu.tabId) : null;
  const W = 210;
  const left = menu ? Math.max(8, Math.min(window.innerWidth - W - 8, menu.x - W / 2)) : 0;

  return (
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 z-40 border-t border-fin-line bg-[#0e0e11]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Sections">
      {menu && (
        <div
          role="menu"
          aria-label={`${menuTab?.label} views`}
          className="absolute bottom-[calc(100%+10px)] z-50 origin-bottom animate-pop-in overflow-hidden rounded-2xl bg-[#1b1b21] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
          style={{ left, width: W }}
        >
          <div className="px-3 pb-1 pt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-fin-muted">{menuTab?.label}</div>
          {menuViews.map((v) => {
            const current = menu.tabId === tab && currentViews?.[menu.tabId] === v.value;
            return (
              <button
                key={v.value}
                role="menuitem"
                data-view-item={v.value}
                onClick={() => pick(menu.tabId, v.value)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold transition ${
                  hot === v.value ? "bg-white/10 text-white" : current ? "text-fin-accent" : "text-white/85"
                }`}
              >
                {v.label}
                {current && <Icon name="check" size={16} stroke={2.4} />}
              </button>
            );
          })}
        </div>
      )}
      <div className="mx-auto flex max-w-[880px]">
        {(tabs || []).map((t) => {
          const active = tab === t.id;
          const hasViews = views?.[t.id]?.length > 0;
          return (
            <button
              key={t.id}
              onClick={(e) => {
                if (menu) {
                  // Tapping a tab while its menu is open just closes the menu.
                  e.preventDefault();
                  const same = menu.tabId === t.id;
                  close();
                  if (same) return;
                }
                if (!active) haptic("light");
                onTab(t.id);
              }}
              onTouchStart={(e) => startHold(e, t)}
              onTouchMove={moveHold}
              onTouchEnd={endHold}
              onTouchCancel={() => {
                clearTimeout(press.current?.timer);
                press.current = null;
              }}
              onContextMenu={(e) => hasViews && e.preventDefault()}
              aria-haspopup={hasViews ? "menu" : undefined}
              title={hasViews ? `${t.label} — hold for its views` : t.label}
              // touch-action none: a hold-and-slide onto the menu mustn't scroll the page
              className={`relative flex min-w-0 flex-1 touch-none flex-col items-center gap-1 py-3 text-[12px] font-semibold transition sm:text-[13px] ${active ? "text-fin-accent" : "text-fin-muted hover:text-white"} ${menu?.tabId === t.id ? "bg-white/[0.06]" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-fin-accent transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
              <Icon name={t.icon} size={24} stroke={active ? 2.1 : 1.7} />
              <span className="max-w-full truncate px-0.5">{t.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => {
            close();
            haptic("light");
            openDomains();
          }}
          className="relative flex w-[64px] shrink-0 flex-col items-center gap-1 py-3 text-[12px] font-semibold text-fin-muted transition hover:text-white active:scale-95 sm:text-[13px]"
          aria-label="Switch domain"
        >
          <Icon name="grid" size={24} stroke={1.7} />
          Domains
          <span className="absolute left-0 top-1/2 h-7 w-px -translate-y-1/2 bg-white/10" />
        </button>
      </div>
    </nav>
  );
}

// Pages without tabs (Home, Morning Paper): a floating "Domains" pill at the bottom right.
export function DomainsFab() {
  const { openDomains } = useAppMenu();
  return (
    <button
      onClick={() => {
        haptic("light");
        openDomains();
      }}
      className="fixed bottom-[max(20px,calc(env(safe-area-inset-bottom)+12px))] right-4 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-[#141418]/90 px-5 py-3 font-fin text-[15px] font-semibold text-white shadow-2xl backdrop-blur-xl transition active:scale-95 lg:hidden"
    >
      <Icon name="grid" size={20} stroke={2} /> Domains
    </button>
  );
}
