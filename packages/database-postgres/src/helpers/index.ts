
export function toArray(arr) {
  if (Array.isArray(arr)) {
    const i = 0;
    const arr2 = Array(arr.length);
    for (; i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  } else {
    return Array.from(arr);
  }
}
