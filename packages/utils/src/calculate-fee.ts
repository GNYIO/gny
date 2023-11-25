export interface FeeCalculatorIndexer {
  [index: number]: () => number;
}

export const feeCalculators: FeeCalculatorIndexer = {
  // basic
  0: () => 0.1,
  1: () => 5,
  2: () => 5,
  3: () => 0.1,
  4: () => 0.1,
  5: () => 0.1,
  6: () => 0,
  10: () => 100,
  20: () => 0.1,

  // uia
  100: () => 100,
  101: () => 500,
  102: () => 0.1,
  103: () => 0.1,

  // dat (nft)
  300: () => 100,
  301: () => 0.1,
};
