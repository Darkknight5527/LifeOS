// Phone domain switcher: a sheet that slides up from the bottom with every
// domain as a big tile, so switching never needs a reach to the top corner.
import { useLocation, useNavigate } from "react-router-dom";
import { domainsFor } from "../lib/domains.js";
import { useMe } from "../lib/user.js";
import { Icon, Sheet } from "../pages/finances/fin-ui.jsx";
import { APP_VERSION, IN_APP, appVersionBelow, haptic } from "../lib/inApp.js";

export default function DomainSwitcher({ open, onClose, onLogout }) {
  const { pathname } = useLocation();
  const { isOwner } = useMe();
  const DOMAINS = domainsFor(isOwner);
  const navigate = useNavigate();

  const go = (to) => {
    haptic("light");
    onClose();
    if (to !== pathname) {
      navigate(to);
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="LifeOS">
      <div className="grid grid-cols-3 gap-2.5 pb-2 pt-1">
        {DOMAINS.map((d) => {
          const here = d.to === pathname;
          return (
            <button
              key={d.to}
              onClick={() => go(d.to)}
              aria-current={here ? "page" : undefined}
              className={`relative flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl px-1 py-3 text-center transition active:scale-95 ${
                here ? "bg-white/10 ring-2" : "bg-white/[0.04] hover:bg-white/[0.07]"
              } ${d.ready ? "" : "opacity-55"}`}
              style={here ? { "--tw-ring-color": d.color } : undefined}
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${d.color}22`, color: d.color }}>
                <Icon name={d.icon} size={23} stroke={2} />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-white/90">{d.label}</span>
              {!d.ready && <span className="absolute right-2 top-2 rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-white/60">Soon</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2 border-t border-fin-line pt-3">
        <button onClick={() => go("/account")} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white/75 hover:bg-white/5">
          <Icon name="gear" size={18} /> {isOwner ? "Account & friends" : "Account"}
        </button>
        <button onClick={onLogout} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white/55 hover:bg-white/5">
          <Icon name="logout" size={18} /> Log out
        </button>
      </div>
      <div className="pb-1 pt-2 text-center text-[12px] text-fin-faint">
        {IN_APP
          ? appVersionBelow("1.5.1")
            ? "LifeOS app: older than 1.5.1 — install the latest from the download link"
            : `LifeOS app version ${APP_VERSION}`
          : "LifeOS website"}
      </div>
    </Sheet>
  );
}
