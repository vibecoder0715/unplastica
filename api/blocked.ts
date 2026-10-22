type VercelRequest = {
  method?: string;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  send(body: unknown): VercelResponse;
  end(): VercelResponse;
};

export default function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Content-Security-Policy", "default-src 'none'");
  return response.status(404).send("Not Found");
}
