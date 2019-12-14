import * as lib from './lib';
import axios from 'axios';

function allItemsEqual(arr: any[]) {
  return new Set(arr).size == 1;
}

export async function allHeightsAreTheSame(ports: number[] = []) {
  const promises = ports.map(x => lib.getHeight(x));
  const result = await Promise.all(promises);

  console.log(`allHeightsAreTheSame: ${JSON.stringify(result)}`);
  const areAllHeightsTheSame = allItemsEqual(result);
  expect(areAllHeightsTheSame).toEqual(true);

  return result;
}

export async function hasXAmountOfPeers(
  port: number,
  expectedNumberOfPeers: number
) {
  const { data } = await axios.get(`http://localhost:${port}/api/peers`);
  expect(data.peers).toHaveLength(expectedNumberOfPeers);
  return data;
}
