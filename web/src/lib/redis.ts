/** Minimal Upstash Redis REST client (works with Vercel KV env names too). */

const URL_ = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const redisConfigured = Boolean(URL_ && TOKEN);

export async function redis(
  ...command: (string | number)[]
): Promise<unknown> {
  if (!redisConfigured) throw new Error("Redis not configured");
  const res = await fetch(URL_!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

/** HGETALL comes back as a flat [field, value, field, value] array. */
export function pairsToRecord(flat: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(flat)) return out;
  for (let i = 0; i < flat.length - 1; i += 2) {
    out[String(flat[i])] = Number(flat[i + 1]);
  }
  return out;
}
