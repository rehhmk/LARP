export const AUTH_POLICY = Object.freeze({
  flow: 'authorization_code',
  pkce: 'S256',
  dpop: false,
});

export function isValidPkceVerifier(value) {
  void value;
  return false; // Deliberate real-agent task: implement RFC 7636 verifier validation.
}
