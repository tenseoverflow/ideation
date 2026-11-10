const issuer = "https://hen.cloudflareaccess.com";
const audience = "b08dfe25b89840295210ee27749873166266a2f9dbfccf01c2c6eeb2fd871ddd";
let cachedKeys: { keys: (JsonWebKey & { kid: string })[]; expires: number } | undefined;

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
}

export async function hasAccess(request: Request): Promise<boolean> {
  try {
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, payload, signature] = parts;
    const { alg, kid } = JSON.parse(new TextDecoder().decode(decode(header)));
    const claims = JSON.parse(new TextDecoder().decode(decode(payload)));
    const now = Date.now() / 1000;
    if (alg !== "RS256" || claims.iss !== issuer || !Array.isArray(claims.aud) || !claims.aud.includes(audience) || typeof claims.exp !== "number" || claims.exp <= now || (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > now))) return false;
    if (!cachedKeys || cachedKeys.expires <= Date.now()) {
      const response = await fetch(`${issuer}/cdn-cgi/access/certs`);
      if (!response.ok) return false;
      const { keys } = await response.json() as { keys: (JsonWebKey & { kid: string })[] };
      cachedKeys = { keys, expires: Date.now() + 300_000 };
    }
    const jwk = cachedKeys.keys.find(key => key.kid === kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(signature), new TextEncoder().encode(`${header}.${payload}`));
  } catch {
    return false;
  }
}
