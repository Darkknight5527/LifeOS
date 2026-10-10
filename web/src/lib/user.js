// Who is logged in (name, email, role). Kept on the device so the right
// pages show instantly, and refreshed from the server on every start.
import { createContext, useContext } from "react";

const KEY = "lifeos_me_v1";

export function readMe() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && v.email ? v : null;
  } catch {
    return null;
  }
}
export function saveMe(user) {
  try {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  } catch {
    /* not critical */
  }
}

export const UserContext = createContext({ me: null, isOwner: false, setMe: () => {} });
export const useMe = () => useContext(UserContext);

/** First name for greetings ("Rahul K" → "Rahul"). */
export const firstName = (me) => (me?.name || me?.email?.split("@")[0] || "").trim().split(/\s+/)[0] || "";
