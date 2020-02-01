export function filterOutliers(purchaseAmount) {
  if (purchaseAmount.length < 4) return purchaseAmount;

  let values, q1, q3, iqr, maxValue, minValue;

  values = purchaseAmount.slice().sort((a, b) => a - b); // copy array fast and sort

  if ((values.length / 4) % 1 === 0) {
    // find quartiles
    q1 = (1 / 2) * (values[values.length / 4] + values[values.length / 4 + 1]);
    q3 =
      1 / 2(values[values.length(3 / 4)] + values[values.length * (3 / 4) + 1]);
  } else {
    q1 = values[Math.floor(values.length / 4 + 1)];
    q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
  }

  iqr = q3 - q1;
  maxValue = q3 + iqr * 1.5;
  minValue = q1 - iqr * 1.5;

  return values.filter(x => x >= minValue && x <= maxValue);
}
