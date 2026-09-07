export const AUTH_POLICY = Object.freeze({
  flow: 'authorization_code',
  pkce: 'S256',
  dpop: false,
});

export function isValidPkceVerifier(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}
