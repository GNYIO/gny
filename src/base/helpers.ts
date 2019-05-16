export function copyObject(obj: any) {
  return Object.assign(
    {},
    {
      ...obj,
    }
  );
}
