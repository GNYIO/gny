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

      it('DATsha256 - empty object fails check', () => {
        const datHash = {};

        const result = gnyClient.schemas.datSchema.validate(datHash);
        expect(result).toMatchObject({
          result: false,
        });
      });

      it('DATsha256 - adding extra property fails', () => {
        const datHash = {
          version: 1,
          data: 'some data',
          hash:
            '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
          hash_algo: 'sha256',
          extra: true, // added
        };

        const result = gnyClient.schemas.datSchema.validate(datHash);
        expect(result).toMatchObject({
          result: false,
        });
      });

      it('DATsha256 - null property fails', () => {
        const datHash = {
          version: 1,
          data: 'some data',
          hash:
            '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
          hash_algo: null,
        };

        const result = gnyClient.schemas.datSchema.validate(datHash);
        expect(result).toMatchObject({
          result: false,
        });
      });

      it('DATsha256 - missing one property fails', () => {
        const datHash = {
          version: 1,
          data: 'some data',
          hash:
            '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
          // hash_algo: 'sha256',
        };

        const result = gnyClient.schemas.datSchema.validate(datHash);
        expect(result).toMatchObject({
          result: false,
        });
      });

      describe('DATsha256 - data', () => {
        it('DATsha256 - fails if "data" property is null', () => {
          const datHash = {
            version: 1,
            data: null,
            hash:
              '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
            hash_algo: 'sha256',
          };

          const result = gnyClient.schemas.datSchema.validate(datHash);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATsha256 - fails if "data" property is undefined', () => {
          const datHash = {
            version: 1,
            data: undefined,
            hash:
              '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
            hash_algo: 'sha256',
          };

          const result = gnyClient.schemas.datSchema.validate(datHash);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATsha256 - fails if "data" property is missing', () => {
          const datHash = {
            version: 1,
            // data: 'some data',
            hash:
              '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
            hash_algo: 'sha256',
          };

          const result = gnyClient.schemas.datSchema.validate(datHash);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATsha256 - succeeds if "data" property is object', () => {
          const datHash = {
            version: 1,
            data: {},
            hash:
              '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
            hash_algo: 'sha256',
          };

          const result = gnyClient.schemas.datSchema.validate(datHash);
          expect(result).toMatchObject({
            result: true,
          });
        });

        // wrong, fix test
        it('DATsha256 - fails if "data" property is number', () => {
          const datHash = {
            version: 1,
            data: 99,
            hash:
              '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
            hash_algo: 'sha256',
          };

          const result = gnyClient.schemas.datSchema.validate(datHash);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATsha256 - succeeds if "data" property is string', () => {
          const datHash = {
            version: 1,
            data: 'some string',
            hash:
              '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
            hash_algo: 'sha256',
          };

          const result = gnyClient.schemas.datSchema.validate(datHash);
          expect(result).toMatchObject({
            result: true,
          });
        });

        it('DATsha256 - succeeds if "data" property is array', () => {
          const datHash = {
            version: 1,
            data: [],
            hash:
              '1307990e6ba5ca145eb35e99182a9bec46531bc54ddf656a602c780fa0240dee',
            hash_algo: 'sha256',
          };

          const result = gnyClient.schemas.datSchema.validate(datHash);
          expect(result).toMatchObject({
            result: true,
          });
        });
      });
    });

    describe('DATed25519', () => {
      it('DATed25519 - correct object passess check', () => {
        const datEd25519 = {
          version: 1,
          data: 'some data',
          publicKey:
            'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
          signature:
            'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
          cipher: 'ed25519',
        };

        const result = gnyClient.schemas.datSchema.validate(datEd25519);
        expect(result).toEqual({
          result: true,
        });
      });

      it('DATed25519 - empty object fails check', () => {
        const datEd25519 = {};

        const result = gnyClient.schemas.datSchema.validate(datEd25519);
        expect(result).toMatchObject({
          result: false,
        });
      });

      it('DATed25519 - adding extra property fails', () => {
        const datEd25519 = {
          version: 1,
          data: 'some data',
          publicKey:
            'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
          signature:
            'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
          cipher: 'ed25519',
          extra: true,
        };

        const result = gnyClient.schemas.datSchema.validate(datEd25519);
        expect(result).toMatchObject({
          result: false,
        });
      });

      it('DATed25519 - null property fails', () => {
        const datEd25519 = {
          version: 1,
          data: 'some data',
          publicKey:
            'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
          signature:
            'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
          cipher: null,
        };

        const result = gnyClient.schemas.datSchema.validate(datEd25519);
        expect(result).toMatchObject({
          result: false,
        });
      });

      it('DATed25519 - missing one property fails', () => {
        const datEd25519 = {
          version: 1,
          data: 'some data',
          publicKey:
            'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
          signature:
            'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
        };

        const result = gnyClient.schemas.datSchema.validate(datEd25519);
        expect(result).toMatchObject({
          result: false,
        });
      });

      describe('DATed25519 - data', () => {
        it('DATed25519 - fails if property "data" is null', () => {
          const datEd25519 = {
            version: 1,
            data: null,
            publicKey:
              'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
            signature:
              'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
            cipher: 'ed25519',
          };

          const result = gnyClient.schemas.datSchema.validate(datEd25519);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATed25519 - fails if property "data" is undefined', () => {
          const datEd25519 = {
            version: 1,
            data: undefined,
            publicKey:
              'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
            signature:
              'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
            cipher: 'ed25519',
          };

          const result = gnyClient.schemas.datSchema.validate(datEd25519);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATed25519 - fails if property "data" is missing', () => {
          const datEd25519 = {
            version: 1,
            // data: 'some data',
            publicKey:
              'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
            signature:
              'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
            cipher: 'ed25519',
          };

          const result = gnyClient.schemas.datSchema.validate(datEd25519);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATed25519 - fails if property "data" is number', () => {
          const datEd25519 = {
            version: 1,
            data: 100,
            publicKey:
              'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
            signature:
              'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
            cipher: 'ed25519',
          };

          const result = gnyClient.schemas.datSchema.validate(datEd25519);
          expect(result).toMatchObject({
            result: false,
          });
        });

        it('DATed25519 - succeeds if property "data" is object', () => {
          const datEd25519 = {
            version: 1,
            data: {},
            publicKey:
              'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
            signature:
              'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
            cipher: 'ed25519',
          };

          const result = gnyClient.schemas.datSchema.validate(datEd25519);
          expect(result).toMatchObject({
            result: true,
          });
        });

        it('DATed25519 - succeeds if property "data" is array', () => {
          const datEd25519 = {
            version: 1,
            data: [],
            publicKey:
              'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
            signature:
              'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
            cipher: 'ed25519',
          };

          const result = gnyClient.schemas.datSchema.validate(datEd25519);
          expect(result).toMatchObject({
            result: true,
          });
        });

        it('DATed25519 - succeeds if property "data" is string', () => {
          const datEd25519 = {
            version: 1,
            data: 'aaaaaaaaaaaa',
            publicKey:
              'D83C80D63CBAABF0410DD2F3E9FD167D09F91C94D154C4DF6B0D6DF4EEB81F2C',
            signature:
              'd7f2ad8343b413509ae850cade71083d25d42c4423d46bc0610441ff9b9b723f27e909b8629b154af847196ad8c4eb1a1f49803c1254c23346c5f00c4d16b30c',
            cipher: 'ed25519',
          };

          const result = gnyClient.schemas.datSchema.validate(datEd25519);
          expect(result).toMatchObject({
            result: true,
          });
        });
      });
    });
  });
});
