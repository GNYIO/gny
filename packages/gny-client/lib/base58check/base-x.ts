// base-x encoding
// Forked from https://github.com/cryptocoinjs/bs58
// Originally written by Mike Hearn for BitcoinJ
// Copyright (c) 2011 Google Inc
// Ported to JavaScript by Stefan Thomas
// Merged Buffer refactorings from base58-native by Stephen Pair
// Copyright (c) 2013 BitPay Inc

export default class Base {
  private ALPHABET_MAP: any;
  private LEADER: any;
  private BASE: number;
  private ALPHABET: string;

  // pre-compute lookup table

  constructor(ALPHABET: string) {
    this.LEADER = ALPHABET.charAt(0);
    this.ALPHABET_MAP = {};
    this.BASE = ALPHABET.length;
    this.ALPHABET = ALPHABET;

    for (let z = 0; z < ALPHABET.length; z++) {
      const x = ALPHABET.charAt(z);

      if (this.ALPHABET_MAP[x] !== undefined)
        throw new TypeError(x + ' is ambiguous');
      this.ALPHABET_MAP[x] = z;
    }
  }

  public encode(source: any) {
    if (source.length === 0) return '';

    const digits = [0];
    let carry: number;
    for (let i = 0; i < source.length; ++i) {
      for (let j = 0, carry = source[i]; j < digits.length; ++j) {
        carry += digits[j] << 8;
        digits[j] = carry % this.BASE;
        carry = (carry / this.BASE) | 0;
      }

      while (carry > 0) {
        digits.push(carry % this.BASE);
        carry = (carry / this.BASE) | 0;
      }
    }

    let string = '';

    // deal with leading zeros
    for (let k = 0; source[k] === 0 && k < source.length - 1; ++k)
      string += this.ALPHABET[0];
    // convert digits to a string
    for (let q = digits.length - 1; q >= 0; --q)
      string += this.ALPHABET[digits[q]];

    return string;
  }

  public decodeUnsafe(string: any) {
    if (string.length === 0) return Buffer.allocUnsafe(0);

    const bytes = [0];
    let carry: number;
    for (let i = 0; i < string.length; i++) {
      const value = this.ALPHABET_MAP[string[i]];
      if (value === undefined) return;

      for (let j = 0, carry = value; j < bytes.length; ++j) {
        carry += bytes[j] * this.BASE;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }

      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }

    // deal with leading zeros
    for (let k = 0; string[k] === this.LEADER && k < string.length - 1; ++k) {
      bytes.push(0);
    }

    return Buffer.from(bytes.reverse());
  }

  public decode(string: any) {
    const buffer = this.decodeUnsafe(string);
    if (buffer) return buffer;

    throw new Error('Non-base' + this.BASE + ' character');
  }
}
