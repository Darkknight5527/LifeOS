// Every LifeOS domain, in menu order. One list drives the laptop side menu,
// the phone domain switcher and ↑ / ↓ switching.
// ready: built pages (↑ / ↓ cycles through these; the rest show "Soon").
export const DOMAINS = [
  { to: "/", label: "North Star", short: "Home", icon: "star", color: "#f2c14e", end: true, ready: true, ownerOnly: true },
  { to: "/paper", label: "Morning Paper", short: "Paper", icon: "news", color: "#f2c14e", ready: true },
  { to: "/mental", label: "Mental & Psych", short: "Mind", icon: "brain", color: "#a78bfa" },
  { to: "/grooming", label: "Grooming", short: "Grooming", icon: "drop", color: "#2dd4bf", ready: true },
  { to: "/fitness", label: "Fitness & Nutrition", short: "Fitness", icon: "dumbbell", color: "#60a5fa", ready: true },
  { to: "/finances", label: "Finances", short: "Money", icon: "wallet", color: "#fb8a3c", ready: true },
  { to: "/goals", label: "Goals", short: "Goals", icon: "target", color: "#fb7185" },
  { to: "/technical", label: "Technical & Projects", short: "Tech", icon: "code", color: "#4ade80" },
  { to: "/learning", label: "Learning", short: "Learning", icon: "book", color: "#f472b6" },
];

export const READY = DOMAINS.filter((d) => d.ready);

// North Star (/) is the owner's own page; friends don't see it.
export const domainsFor = (isOwner) => (isOwner ? DOMAINS : DOMAINS.filter((d) => !d.ownerOnly));
export const readyFor = (isOwner) => domainsFor(isOwner).filter((d) => d.ready);

// Dark pages that draw their own full-screen layout and header.
export const DARK_PAGES = ["/", "/finances", "/grooming", "/paper", "/fitness", "/account"];

export const domainFor = (path) => DOMAINS.find((d) => d.to === path) || DOMAINS[0];
