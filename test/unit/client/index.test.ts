import 'jest-extended';
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
        expect(() => new gnyClient.Connection(url)).toThrow();
      });

      it('should throw when https is used in url', () => {
        const url = 'https://test.com';
        expect(() => new gnyClient.Connection(url)).toThrow();
      });

      it('should pass when naked url url is used', () => {
        const url = 'test.com';
        expect(() => new gnyClient.Connection(url)).not.toThrow();
      });

      it('should pass when naked url with subdomain is used', () => {
        const url = 'testnet.test.com';
        expect(() => new gnyClient.Connection(url)).not.toThrow();
      });

      it('should pass when ip for url is used', () => {
        const url = '127.0.0.1';
        expect(() => new gnyClient.Connection(url)).not.toThrow();
      });
    });

    describe('port', () => {
      it('port -1 not valid', () => {
        const url = '127.0.0.1';
        const port = -1;
        expect(() => new gnyClient.Connection(url, port)).toThrow();
      });

      it('port 4096 is valid', () => {
        const url = '127.0.0.1';
        const port = 4096;
        expect(() => new gnyClient.Connection(url, port)).not.toThrow();
      });

      it('port 80000 not valid', () => {
        const url = '127.0.0.1';
        const port = 80000;
        expect(() => new gnyClient.Connection(url, port)).toThrow();
      });

      it('port 2444.2 not valid', () => {
        const url = '127.0.0.1';
        const port = 2444.2;
        expect(() => new gnyClient.Connection(url, port)).toThrow();
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
        expect(() => new gnyClient.Connection(url, port, net)).toThrow();
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
        expect(() => new gnyClient.Connection(url, port, net, https)).toThrow();
      });
    });
  });
});
