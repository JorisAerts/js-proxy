/**
 * Generates the contents of the PAC-file
 *
 * @see https://en.wikipedia.org/wiki/Proxy_auto-config
 */
export const getPac = (proxy: string) =>
  `
function FindProxyForURL(url, host) {
  if (
    url.substring(0, 4) === 'http' ||
    url.substring(0, 5) === 'https' ||
    url.substring(0, 3) === 'ws:'
  ) {
    return 'PROXY ${proxy}'
  }
  return 'DIRECT'
}`.trim()
