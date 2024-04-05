// we don't want a delegate name with only numbers
// therefore we force at least one letter in the middle
// the delegate name still can begin with a number
// limiitations: only one number allowed at start of string
export const usernameRegex = new RegExp(
  /^[a-z0-9_]{1}[a-z]{1}[a-z0-9_]{0,18}$/
);
