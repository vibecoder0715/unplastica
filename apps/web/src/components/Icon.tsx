import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "earn"
  | "events"
  | "user"
  | "camera"
  | "info"
  | "arrow"
  | "back"
  | "close"
  | "check"
  | "play"
  | "leaf"
  | "sun"
  | "moon"
  | "monitor"
  | "globe"
  | "bell"
  | "logout"
  | "mail"
  | "trophy"
  | "medal"
  | "users"
  | "like"
  | "bulb"
  | "shield"
  | "refresh";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
  earn: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.6-.7-1.5-1-2.7-1-1.5 0-2.5.8-2.5 1.9 0 2.8 5.2 1.3 5.2 4.2 0 1.2-1.1 2-2.7 2-1.2 0-2.2-.4-2.9-1.2M12 5.5v13" /></>,
  events: <><path d="M8 21h8M12 17v4M7 4H5a2 2 0 0 0-2 2v2a5 5 0 0 0 5 5M17 4h2a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5" /><path d="M7 3h10v8a5 5 0 0 1-10 0z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></>,
  camera: <><path d="M14 5h-4l-1.5 2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5z" /><circle cx="12" cy="13" r="3.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  back: <><path d="m15 18-6-6 6-6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></>,
  leaf: <><path d="M20 4c-8 0-14 2-14 9a7 7 0 0 0 7 7c7 0 9-8 7-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" /></>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  trophy: <><path d="M8 21h8m-4-4v4M7 4h10v7a5 5 0 0 1-10 0zM7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4" /></>,
  medal: <><circle cx="12" cy="8" r="6" /><path d="m8.2 13-1 8 4.8-3 4.8 3-1-8" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7.5a4 4 0 0 1 0 7.8m6 10v-2a4 4 0 0 0-3-3.9" /></>,
  like: <><path d="m7 10 5-7 2 1-1 5h6a2 2 0 0 1 2 2l-1.5 8a2 2 0 0 1-2 1.6H7zM3 10h4v11H3z" /></>,
  bulb: <><path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.7.5 1 1.2 1 2.3h6c0-1.1.3-1.8 1-2.3A7 7 0 0 0 12 2Z" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" /></>,
};

export function Icon({
  name,
  size = 22,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

