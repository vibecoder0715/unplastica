// Probe for the deployed /api/score handler (api/score.ts).
// Read-only: it imports the real handler and calls it with synthetic requests.
//
//   node ml/probe_score_api.mjs
//
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import handler from "../api/score.ts";

function makeReq({ method = "POST", headers = {}, body = {} } = {}) {
  const req = Readable.from([]);
  req.method = method;
  req.headers = headers;
  req.body = body;
  return req;
}

function makeRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k, v) => { res.headers[k] = v; return res; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; res.finished = true; return res; };
  res.end = () => res;
  return res;
}

async function call(label, req) {
  const res = makeRes();
  await handler(req, res);
  console.log(`\n--- ${label}`);
  console.log(`    HTTP ${res.statusCode}`);
  console.log(`    ${JSON.stringify(res.body)}`);
  return res;
}

// 1. Health probe
await call("GET /api/score (health)", makeReq({ method: "GET" }));

// 2. The claim: does the server classify the image, or echo the habit code?
await call("POST /api/score  habit_code=box_cutlery, NO image", makeReq({
  body: { habit_code: "box_cutlery" },
}));

// 3. Same, with an arbitrary base64 blob that is NOT a real photo
await call("POST /api/score  habit_code=box_cutlery, junk base64 'AAAA...'", makeReq({
  body: { habit_code: "box_cutlery", image: "AAAA" + "A".repeat(200) },
}));

// 4. A real JPEG header + random bytes (not a decodable photo, not a habit)
const jpegLike = "/9j/" + "A".repeat(400);
await call("POST /api/score  habit_code=beeswax_food_wraps, JPEG magic + junk", makeReq({
  body: { habit_code: "beeswax_food_wraps", image: jpegLike },
}));

// 5. A DIFFERENT habit's habit_code over the same image -> does the label change?
await call("POST /api/score  habit_code=self_bottle_refill, same junk image", makeReq({
  body: { habit_code: "self_bottle_refill", image: jpegLike },
}));
