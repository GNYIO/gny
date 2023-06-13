/**
 * we can only predict the day for the target height
 * if we know the current date and the current block height
 * @param currentHeight e.g. 5944284
 * @param currentDate e.g. 20230522
 * @param targetHeight e.g. 7000000
 * @returns e.g. 20240829
 */
export function getDate(
  currentHeight: string,
  currentDate: string,
  targetHeight: string
) {
  const dateRegex = /^[0-9]{8}$/;
  if (!dateRegex.test(currentDate)) {
    throw new Error('currentDate not in correct format');
  }

  if (typeof currentHeight !== 'string') {
    throw new Error('currentHeight is not an string');
  }
  if (typeof targetHeight !== 'string') {
    throw new Error('targetHeight is not an string');
  }

  const intRegex = /^[1-9]{1}[0-9]*$/;
  if (!intRegex.test(currentHeight)) {
    throw new Error('currentHeight is not an int');
  }
  if (!intRegex.test(targetHeight)) {
    throw new Error('targetHeight is not an int');
  }

  const diff = parseInt(targetHeight) - parseInt(currentHeight);
  if (diff <= 0) {
    throw new Error('targetHeight needs to be greater than currentHeight');
  }

  const secondsPerDay = 86400;
  const blocksPerDay = secondsPerDay / 10;

  const daysUntilTarget = Math.floor(diff / blocksPerDay);

  const year = currentDate.slice(0, 4);
  const month = currentDate.slice(4, 6);
  const day = currentDate.slice(6, 8);

  const oneDayInUTC = 86400000;
  const currentUTC = Date.parse(`${year}-${month}-${day}`);

  const targetDateUTC = currentUTC + oneDayInUTC * daysUntilTarget;
  const targetDateRaw = new Date(targetDateUTC);

  const resultYear = targetDateRaw
    .getUTCFullYear()
    .toString()
    .padStart(2, '0');
  const resultMonth = (targetDateRaw.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0');
  const resultDay = targetDateRaw
    .getUTCDate()
    .toString()
    .padStart(2, '0');

  return `${resultYear}${resultMonth}${resultDay}`;
}
