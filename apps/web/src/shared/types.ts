import type { HabitCode } from "@unplastica/shared";

export type Page = "home" | "earn" | "events" | "settings" | "login" | "game";
export type Theme = "light" | "dark" | "system";
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};
export type InstallEnvironment = {
  standalone: boolean;
  insideApp: boolean;
  iosSafari: boolean;
};

export type Profile = {
  display_name: string;
  username: string;
  email: string;
  phone: string;
  tagline: string;
  avatar_path: string | null;
  avatar_url: string | null;
  preferences: {
    theme?: Theme;
    language?: string;
    notifications?: boolean;
    has_seen_manual?: boolean;
    sanctuary_save?: unknown;
  };
};

export const guestProfile: Profile = {
  display_name: "Guest account",
  username: "guest",
  email: "",
  phone: "",
  tagline: "",
  avatar_path: null,
  avatar_url: null,
  preferences: { theme: "system", language: "English", notifications: false },
};

export const habitImages: Record<HabitCode, string> = {
  box_cutlery: "/assets/habits/box-cutlery.png",
  recycle_bags: "/assets/habits/recycle-bags.png",
  self_bottle_refill: "/assets/habits/self-bottle-refill.png",
  greenery_furniture: "/assets/habits/greenery-furniture.png?v=2",
  handicraft_projects: "/assets/habits/handicraft-projects.png?v=2",
};
