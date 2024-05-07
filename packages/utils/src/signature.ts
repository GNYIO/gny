export function isSignature(input: any) {
  const signatureRegex = /^[a-z0-9]+$/;

  const result =
    typeof input === 'string' &&
    signatureRegex.test(input) &&
    input.length >= 10 &&
    input.length <= 128;
  return result;
}

export function isIdentifier(input: any) {
  const identifierRegex = /^[A-Z_]+$/;

  const result =
    typeof input === 'string' &&
    identifierRegex.test(input) &&
    input.length >= 5 &&
    input.length <= 64;

  return result;
}
