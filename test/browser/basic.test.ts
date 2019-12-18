import 'jest-extended';

const TIMEOUT = 60000;

describe('basic', () => {
  beforeEach(async () => {
    await page.goto(PATH, { waitUntil: 'load' });
  });

  describe('/setUserName', () => {
    it(
      'should return the transaction id',
      async () => {
        const trs = await page.evaluate(() => {
          // console.log('foo');
          return gnyClient.basic.setUserName('sqfasd', 'secret', null);
        });
        expect(trs.id).toBeString();
      },
      TIMEOUT
    );
  });

  describe('/setSecondPassphrase', () => {
    it(
      'should return the transaction id',
      async () => {
        const trs = await page.evaluate(() => {
          // console.log('foo');
          return gnyClient.basic.setSecondPassphrase(
            'secret',
            'second password'
          );
        });
        expect(trs.id).toBeString();
      },
      TIMEOUT
    );
  });
});
