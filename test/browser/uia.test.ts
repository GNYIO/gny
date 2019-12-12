import * as gnyClient from '@gny/client';

import 'jest-extended';

describe('uia', () => {
  beforeEach(async () => {
    await page.goto(PATH, { waitUntil: 'load' });
  });

  describe('/registerIssuer', () => {
    describe('returned registerIssuer transaction', () => {
      it('should have id as string', async () => {
        const trs = await page.evaluate(() => {
          return gnyClient.uia.registerIssuer(
            'xpgeng',
            'sdfsf',
            'secret',
            null
          );
        });
        expect(trs.id).toBeString();
      });
    });
  });

  describe('#registerAsset', () => {
    describe('returned registerAsset transaction', () => {
      it('should have id as string', async () => {
        const trs = await page.evaluate(() => {
          return gnyClient.uia.registerAsset(
            'aaa',
            'some thing',
            String(10 * 1e8),
            8,
            'secret',
            'second password'
          );
        });
        expect(trs.id).toBeString();
      });
    });
  });

  describe('/issue', () => {
    describe('returned issue transaction', () => {
      it('should have id as string', async () => {
        const trs = await page.evaluate(() => {
          return gnyClient.uia.issue(
            'ABC',
            String(10 * 1e8),
            'secret',
            'second password'
          );
        });
        expect(trs.id).toBeString();
      });
    });
  });

  describe('/transfer', () => {
    describe('returned transfer transaction', () => {
      it('should have id as string', async () => {
        const trs = await page.evaluate(() => {
          return gnyClient.uia.transfer(
            'ABC',
            String(10 * 1e8),
            'recipient',
            'some message',
            'secret',
            'second password'
          );
        });
        expect(trs.id).toBeString();
      });
    });
  });
});
