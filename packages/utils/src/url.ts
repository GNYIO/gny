// should only be used with joi
export const urlRegex = new RegExp(
  /^https:\/\/(?:[-a-zA-Z0-9]{1,256}\.)+?[a-zA-Z0-9]{1,15}(?:\/[-a-zA-Z0-9.()*+$!_%]*?)*?(?:(?:\?([-a-zA-Z0-9.()*+$!_%]+?)=[-a-zA-Z0-9.()*+$!_%]+?)(&[-a-zA-Z0-9.()*+$!_%]+?=[-a-zA-Z0-9.()*+$!_%]+?)*)?$/
);
export function isUrl(input: any) {
  const result = typeof input === 'string' && urlRegex.test(input);
  return result;
}

// should only be used in combination with joi
export const datMakerRegex = new RegExp(/^[a-zA-Z_]{1}[a-zA-Z0-9_]{0,29}$/);

export function isDatMaker(input: any) {
  const result = typeof input === 'string' && datMakerRegex.test(input);
  return result;
}

// warning: will pass on undefined and null
// https://stackoverflow.com/questions/27359464/javascript-regex-null-argument-makes-the-regex-match
export const datNameOnlyRegex = new RegExp(/^[0-9a-zA-Z_]{5,40}$/);

export function isDatNameOnly(input: any) {
  const result = typeof input === 'string' && datNameOnlyRegex.test(input);
  return result;
}

// will look like: "DATMaker.DATName"
// max length 71 (30 + dot + 40)
export const datNameRegex = new RegExp(
  /^[a-zA-Z_]{1}[a-zA-Z0-9_]{0,29}\.[0-9a-zA-Z_]{5,40}$/
);

export function isDatName(input: any) {
  const result = typeof input === 'string' && datNameRegex.test(input);
  return result;
}

export const datHashRegex = new RegExp(/^[a-zA-Z0-9]{30,64}$/);

export function isDatHash(input: any) {
  const result = typeof input === 'string' && datHashRegex.test(input);
  return result;
}
