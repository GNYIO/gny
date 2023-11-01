import * as gnyClient from '@gny/client';

describe('GNY client', () => {
  it('should be object', () => {
    expect(gnyClient).toBeObject();
  });

  it('should have properties', () => {
    const properties = [
      'Connection',
      'basic',
      'crypto',
      'transaction',
      'uia',
      'utils',
      'Connection',
    ];

    properties.forEach(function(property) {
      expect(gnyClient).toHaveProperty(property);
    });
  });

  describe('crypto sha256 and address', () => {
    it('should be equal to the expected address', () => {
      const address = gnyClient.crypto.getAddress(
        '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20'
      );

      expect(address).toEqual('G3ENMYpn7kTwjyai49kJezjkJvaQk');
    });
  });

  describe('test connection constructor', () => {
    describe('url', () => {
      it('should throw when http is used in url', () => {
        const url = 'http://test.com';
        const port = 4096;
        const testnet = 'localnet';

        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, testnet)
        ).toThrow('host not valid');
      });

      it('should throw when https is used in url', () => {
        const url = 'https://test.com';
        const port = 4096;
        const testnet = 'localnet';

        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, testnet)
        ).toThrow('host not valid');
      });

      it('should pass when naked url url is used', () => {
        const url = 'test.com';
        const port = 80;
        const network = 'localnet';

        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, network)
        ).not.toThrow();
      });

      it('should pass when naked url with subdomain is used', () => {
        const url = 'testnet.test.com';
        const port = 80;
        const network = 'localnet';
        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, network)
        ).not.toThrow();
      });

      it('should pass when ip for url is used', () => {
        const url = '127.0.0.1';
        const port = 80;
        const network = 'localnet';
        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, network)
        ).not.toThrow();
      });
    });

    describe('port', () => {
      it('port -1 not valid', () => {
        const url = '127.0.0.1';
        const port = -1;
        const network = 'localnet';

        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, network)
        ).toThrow('port not valid');
      });

      it('port 4096 is valid', () => {
        const url = '127.0.0.1';
        const port = 4096;
        const network = 'localnet';

        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, network)
        ).not.toThrow();
      });

      it('port 80000 not valid', () => {
        const url = '127.0.0.1';
        const port = 80000;
        const network = 'localnet';

        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port)
        ).toThrow('port not valid');
      });

      it('port 2444.2 not valid', () => {
        const url = '127.0.0.1';
        const port = 2444.2;
        const network = 'localnet';

        expect(
          () =>
            // @ts-ignore
            new gnyClient.Connection(url, port, network)
        ).toThrow('port not valid');
      });
    });

    describe('network', () => {
      it('localnet is valid', () => {
        const url = '127.0.0.1';
        const port = 4096;
        const net = 'localnet';

        expect(() => new gnyClient.Connection(url, port, net)).not.toThrow();
      });

      it('testnet is valid', () => {
        const url = '127.0.0.1';
        const port = 4096;
        const net = 'testnet';

        expect(() => new gnyClient.Connection(url, port, net)).not.toThrow();
      });

      it('mainnet is valid', () => {
        const url = '127.0.0.1';
        const port = 4096;
        const net = 'mainnet';

        expect(() => new gnyClient.Connection(url, port, net)).not.toThrow();
      });

      it('hello is not valid', () => {
        const url = '127.0.0.1';
        const port = 4096;
        const net = 'hello';

        expect(() => {
          // @ts-ignore
          return new gnyClient.Connection(url, port, net);
        }).toThrow('networktype not valid');
      });
    });

    describe('https', () => {
      it('true is valid', () => {
        const url = 'test.com';
        const port = 4096;
        const net = 'localnet';
        const https = true;

        expect(
          () => new gnyClient.Connection(url, port, net, https)
        ).not.toThrow();
      });

      it('false is valid', () => {
        const url = 'test.com';
        const port = 4096;
        const net = 'localnet';
        const https = false;

        expect(
          () => new gnyClient.Connection(url, port, net, https)
        ).not.toThrow();
      });

      it('2 is invalid', () => {
        const url = 'test.com';
        const port = 4096;
        const net = 'localnet';
        const https = 2;

        expect(() => {
          // @ts-ignore
          return new gnyClient.Connection(url, port, net, https);
        }).toThrow('https not valid');
      });
    });
  });
});
