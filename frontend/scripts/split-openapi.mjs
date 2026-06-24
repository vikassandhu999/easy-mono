#!/usr/bin/env node
// Splits the full OpenAPI spec into per-app specs by path prefix.
// coach app: /v1/coach, /v1/businesses, /v1/auth, /v1/public, /api
// client app: /v1/client, /v1/auth, /v1/public, /api
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "openapi");
const spec = JSON.parse(readFileSync(join(dir, "easy-openapi.json"), "utf8"));

const SHARED = ["/v1/auth", "/v1/public", "/api"];
const COACH = ["/v1/coach", "/v1/businesses", ...SHARED];
const CLIENT = ["/v1/client", ...SHARED];

const pick = (prefixes) => {
  const paths = {};
  for (const [p, item] of Object.entries(spec.paths ?? {})) {
    if (prefixes.some((pre) => p === pre || p.startsWith(pre + "/") || p.startsWith(pre))) {
      paths[p] = item;
    }
  }
  // keep full components so $refs resolve; codegen only emits types reachable from included paths
  return { ...spec, paths };
};

writeFileSync(join(dir, "coach.openapi.json"), JSON.stringify(pick(COACH), null, 2));
writeFileSync(join(dir, "client.openapi.json"), JSON.stringify(pick(CLIENT), null, 2));
console.log(`split: coach=${Object.keys(pick(COACH).paths).length} client=${Object.keys(pick(CLIENT).paths).length} paths`);
