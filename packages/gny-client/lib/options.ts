const optionMap: any = {
  clientDriftSeconds: 5,
};

export function set(key: string, val: any) {
  optionMap[key] = val;
}

export function get(key: string) {
  return optionMap[key];
}

export function getAll() {
  return optionMap;
}
