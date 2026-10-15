export function formatPoints(points: number): string {
  return new Intl.NumberFormat("en-MY").format(points);
}

export function getPublicAppUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin;
}

