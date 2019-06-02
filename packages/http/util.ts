import { IBlock } from '../../src/interfaces';

export default zscheme => (req, res, next) => {
  req.sanitize = function sanitize(value, scheme, callback) {
    return zscheme.validate(value, scheme, (err, valid) =>
      callback(
        null,
        {
          isValid: valid,
          issues: err ? `${err[0].message}: ${err[0].path}` : null,
        },
        value
      )
    );
  };
  next();
};

export async function getBlocks(
  minHeight: number,
  maxHeight: number,
  withTransaction: boolean
) {
  const blocks: IBlock[] = await global.app.sdb.getBlocksByHeightRange(
    minHeight,
    maxHeight
  );

  if (!blocks || !blocks.length) {
    return [];
  }

  maxHeight = blocks[blocks.length - 1].height;
  if (withTransaction) {
    const transactions = await global.app.sdb.findAll('Transaction', {
      condition: {
        height: { $gte: minHeight, $lte: maxHeight },
      },
    });
    const firstHeight = blocks[0].height;
    for (const t of transactions) {
      const h = t.height;
      const b = blocks[h - firstHeight];
      if (b) {
        if (!b.transactions) {
          b.transactions = [];
        }
        b.transactions.push(t);
      }
    }
  }

  return blocks;
}
