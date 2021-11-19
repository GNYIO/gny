export class TransactionsHelper {
  public static reverseTransactions(
    count: number,
    offset: number,
    limit: number
  ) {
    // example count: 10
    // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9

    let start = count - offset - limit;
    if (start < 0) {
      start = 0;
    }

    let end = count - 1 - offset;
    if (offset === 0) {
      end = count - 1;
    }

    let difference = Math.abs(start - end) + 1;
    if (start === end) {
      difference = 1;
    }
    if (offset == count) {
      difference = 0;
    }
    if (offset > count) {
      difference = 0;
    }

    return [start, end, difference];
  }
}
