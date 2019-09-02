import * as crypto from 'crypto';

const base58 = require('./bs58.js');

// SHA256(SHA256(buffer))
function sha256x2(buffer: any) {
  const tmp = crypto
    .createHash('sha256')
    .update(buffer)
    .digest();
  return crypto
    .createHash('sha256')
    .update(tmp)
    .digest();
}

// Encode a buffer as a base58-check encoded string
export function encode(payload: any) {
  const checksum = sha256x2(payload);
  return base58.encode(Buffer.concat([payload, checksum], payload.length + 4));
}

function decodeRaw(buffer: any) {
  const payload = buffer.slice(0, -4);
  const checksum = buffer.slice(-4);
  const newChecksum = sha256x2(payload);

  if (
    (checksum[0] ^ newChecksum[0]) |
    (checksum[1] ^ newChecksum[1]) |
    (checksum[2] ^ newChecksum[2]) |
    (checksum[3] ^ newChecksum[3])
  )
    return;

  return payload;
}

// Decode a base58-check encoded string to a buffer, no result if checksum is wrong
export function decodeUnsafe(string: string) {
  const buffer = base58.decodeUnsafe(string);
  if (!buffer) return;

  return decodeRaw(buffer);
}

export function decode(string: string) {
  const buffer = base58.decode(string);
  const payload = decodeRaw(buffer);
  if (!payload) throw new Error('Invalid checksum');
  return payload;
}
