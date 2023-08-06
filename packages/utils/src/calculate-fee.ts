export interface FeeCalculatorIndexer {
  [index: number]: () => number;
}

export const feeCalculators: FeeCalculatorIndexer = {
  0: () => 0.1,
  1: () => 5,
  2: () => 5,
  3: () => 0.1,
  4: () => 0.1,
  5: () => 0.1,
  6: () => 0,
  10: () => 100,
  100: () => 100,
  101: () => 500,
  102: () => 0.1,
  103: () => 0.1,
  201: () => 0.1,
  202: () => 0.1,
  203: () => 0.1,
  204: () => 0.1,
  205: () => 0.1,
  206: () => 0.1,
  207: () => 0.1,
  208: () => 0.1,
  209: () => 0.1,
  210: () => 0.1,

  // nft
  300: () => 100,
  301: () => 0.1,
  302: () => 0.2,
};
