export const urlRegex = new RegExp(
  /^https:\/\/(?:[-a-zA-Z0-9]{1,256}\.)+?[a-zA-Z0-9]{1,15}(?:\/[-a-zA-Z0-9.()*+$!_%]*?)*?(?:(?:\?([-a-zA-Z0-9.()*+$!_%]+?)=[-a-zA-Z0-9.()*+$!_%]+?)(&[-a-zA-Z0-9.()*+$!_%]+?=[-a-zA-Z0-9.()*+$!_%]+?)*)?$/
);

export const nftMakerRegex = new RegExp(/^[a-zA-Z_]{1,16}$/);

export const nftNameRegex = new RegExp(/^[0-9a-zA-Z_]{5,20}$/);

export const nftHashRegex = new RegExp(/^[a-zA-Z0-9]{30,60}$/);
