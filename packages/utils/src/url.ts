export const urlRegex = new RegExp(
  /^https:\/\/(?:[-a-zA-Z0-9]{1,256}\.)+?[a-zA-Z0-9]{1,15}(?:\/[-a-zA-Z0-9.()*+$!_%]*?)*?(?:(?:\?([-a-zA-Z0-9.()*+$!_%]+?)=[-a-zA-Z0-9.()*+$!_%]+?)(&[-a-zA-Z0-9.()*+$!_%]+?=[-a-zA-Z0-9.()*+$!_%]+?)*)?$/
);

export const datMakerRegex = new RegExp(/^[a-zA-Z_]{1}[a-zA-Z0-9_]{0,29}$/);

export const datNameRegex = new RegExp(/^[0-9a-zA-Z_]{5,40}$/);

export const datHashRegex = new RegExp(/^[a-zA-Z0-9]{30,64}$/);
