import { result } from 'lodash';

const uiaIssuerRegex = new RegExp(/^[A-Za-z]{1,16}$/);
export function isUiaIssuer(input: any) {
  const result = typeof input === 'string' && uiaIssuerRegex.test(input);
  return result;
}

const uiaSymbolRegex = new RegExp(/^[A-Z]{3,6}$/);
export function isUiaSymbol(input: any) {
  const result = typeof input === 'string' && uiaSymbolRegex.test(input);
  return result;
}

const uiaCurrency = new RegExp(/^[A-Za-z]{1,16}.[A-Z]{3,6}$/);
export function isUiaCurrency(input: any) {
  const result = typeof input === 'string' && uiaCurrency.test(input);
  return result;
}
