export function getBaseUrl() {
  const host = global.host || '127.0.0.1';
  const port = global.port || 4096;

  return `http://${host}:${port}`;
}
