// we don't want a delegate name with only numbers
// therefore we also check that there is at least one lower case
// character somwherein the string
export function isUsername(input: any) {
  const usernameRegex = new RegExp(/^[a-z0-9_]{2,20}$/);

  // this has no ^$ to check for beginning of word
  // this only checks if anywhere in the string a small character
  // appears
  const atLeastOneSmallCharacterRegex = new RegExp(/[a-z]/);

  if (usernameRegex.test(input) && atLeastOneSmallCharacterRegex.test(input)) {
    return true;
  } else {
    return false;
  }
}
