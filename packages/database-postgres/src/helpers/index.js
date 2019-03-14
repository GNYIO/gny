
function toArray(arr) {
  if (Array.isArray(arr)) {
    /** @type {number} */
    var i = 0;
    /** @type {!Array} */
    var arr2 = Array(arr.length);
    for (; i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  } else {
    return Array.from(arr);
  }
}

module.exports = {
  toArray,
}
