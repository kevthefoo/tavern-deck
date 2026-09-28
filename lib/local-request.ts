/** JSON mutations are only accepted from the same local origin. */
export function checkLocalMutation(request:Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const hostname = host.replace(/:\d+$/,"");
  if (!["localhost","127.0.0.1","[::1]"].includes(hostname)) throw new Error("Use localhost to change settings.");
  const origin = request.headers.get("origin");
  if (origin && origin !== `${url.protocol}//${host}`) throw new Error("Cross-origin requests are not allowed.");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new Error("Cross-site requests are not allowed.");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Expected JSON.");
}
