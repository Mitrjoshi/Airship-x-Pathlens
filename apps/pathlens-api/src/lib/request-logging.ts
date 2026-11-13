export function getSafeRequestPath(requestUrl: string) {
  try {
    return new URL(requestUrl, "http://localhost").pathname;
  } catch {
    return requestUrl.split("?", 1)[0] ?? "/";
  }
}
