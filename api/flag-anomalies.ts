type VercelRequest = { method?: string; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status(code: number): VercelResponse; end(): VercelResponse; json(body: unknown): VercelResponse };
declare const process: { env: Record<string, string | undefined> };

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET" && request.method !== "POST") return response.status(405).end();
  const secret = process.env.CRON_SECRET || process.env.RETENTION_CRON_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!secret || !supabaseUrl) return response.status(503).json({ error: "Anomaly detection service is not configured." });
  const header = request.headers.authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  if (!authorization || !constantTimeEqual(authorization, `Bearer ${secret}`)) return response.status(401).json({ error: "Unauthorized." });
  const result = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/flag-anomalies`, {
    method: "POST",
    headers: { "x-retention-secret": secret, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(25000),
  });
  const payload = await result.json().catch(() => ({ error: "Anomaly detection service returned invalid data." }));
  return response.status(result.status).json(payload);
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index++) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}
