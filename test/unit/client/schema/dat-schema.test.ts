import * as gnyClient from '@gnyio/client';

describe('schemas', () => {
  describe('dat schema', () => {
    describe('DATsha256', () => {
      it('DATsha256 - correct object passess check', () => {
        const datHash = {
          version: 1,
          data: 'some data',
          hash:
            '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
          hash_algo: 'sha256',
        };

        const result = gnyClient.schemas.datSchema.validate(datHash);
        expect(result).toEqual({
          result: true,
        });
      });

      it('empty object fails check', () => {
        const datHash = {};

        const result = gnyClient.schemas.datSchema.validate(datHash);
        expect(result).toMatchObject({
          result: false,
        });
      });

      it.skip('adding extra property fails', () => {});

      it.skip('null property fails', () => {});

      it.skip('missing one property fails', () => {});
    });
  });
});
