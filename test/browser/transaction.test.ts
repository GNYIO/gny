import 'jest-extended';

const TIMEOUT = 60000;

describe('transaction', () => {
  beforeEach(async () => {
    await page.goto(PATH, { waitUntil: 'load' });
  });

  describe('/createTransaction', () => {
    it('should create transaction without second signature', async () => {
      const trs = await page.evaluate(() => {
        return gnyClient.transaction.createTransactionEx({
          type: 1,
          fee: String(1 * 1e8),
          message: '',
          secret:
            'grow pencil ten junk bomb right describe trade rich valid tuna service',
          args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
        });
      });

      expect(trs).toHaveProperty('id');
    });
  });

  describe('/createTransaction with second secret', () => {
    describe('returned transaction', () => {
      it('should have id as string', async () => {
        const trs = await page.evaluate(() => {
          return gnyClient.transaction.createTransactionEx({
            type: 1,
            fee: String(1 * 1e8),
            message: '',
            secret:
              'carpet pudding topple genuine relax rally problem before pill gun nation method',
            secondSecret:
              'carpet pudding topple genuine relax rally problem before pill gun nation method',
            args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
          });
        });

        expect(trs).toHaveProperty('id');
        expect(trs.id).toBeString();
      });
    });
  });
});
