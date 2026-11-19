export type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query?: Record<string, string | string[]>;
};

export type VercelResponse = {
  status(code: number): VercelResponse;
  end(chunk?: unknown): VercelResponse;
  json(body: unknown): VercelResponse;
  send?(body: unknown): VercelResponse;
  setHeader(name: string, value: string | number | readonly string[]): VercelResponse;
};

export const ACTIVE_HABITS = new Set<string>([
  "box_cutlery",
  "greenery_furniture",
  "handicraft_projects",
  "recycle_bags",
  "self_bottle_refill",
]);

export const SIMPLE_HABITS = new Set<string>([
  "self_bottle_refill",
  "recycle_bags",
]);
