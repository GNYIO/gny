import account from '../../../packages/cli/src/api/account';
import { ApiConfig } from '../../../packages/cli/src/lib/api';
import { stdout } from 'test-console';
import * as program from 'commander';
import * as nock from 'nock';

import moxios from 'moxios';

import * as request from 'request';
import * as fetch from 'node-fetch';

function test(adderss) {
  return fetch(
    'http://127.0.0.1:4096/api/accounts/getBalance/?address=' + adderss
  )
    .then(function(response) {
      if (response.status !== 200) {
        console.log(
          'Looks like there was a problem. Status Code: ' + response.status
        );
        return response.status;
      }

      // Examine the text in the response
      return response.json();
    })
    .catch(function(err) {
      console.log('Fetch Error :-S', err);
    });
}

describe('account', () => {
  // const nockUrl = nock('127.0.0.1:4096');
  const baseDir = '/api/accounts/';

  beforeEach(function() {
    moxios.install();
  });

  afterEach(function() {
    moxios.uninstall();
  });

  // describe('openaccount', () => {
  //   const expected = {
  //     success: true,
  //     account: {
  //       address: 'G4b8BhmeRFBmWAHZemKD25BmEP2G',
  //       balance: 0,
  //       secondPublicKey: '',
  //       lockHeight: 0,
  //       publicKey: 'bd1e78c5a10fbf1eca36b28bbb8ea85f320967659cbf1f7ff1603d0a368867b9'
  //     },
  //   };
  //   const publicKey = 'bd1e78c5a10fbf1eca36b28bbb8ea85f320967659cbf1f7ff1603d0a368867b9';

  //   const scope = nock('http://127.0.0.1:4096')
  //     .post(baseDir + 'openAccount', {publicKey})
  //     .reply(200, 'test');

  //   const argv = ['openaccount', publicKey];
  //   program.parse(argv);

  //   const output = stdout.inspectSync(account(program as ApiConfig));
  //   // console.log(result);
  //   expect(output).toHaveProperty('account');
  // });

  describe('getbalance', () => {
    it('should get balance by the address', done => {
      const expected = {
        success: true,
        account: {
          address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
          balance: 0,
          secondPublicKey: '',
          lockHeight: 0,
          publicKey:
            'bd1e78c5a10fbf1eca36b28bbb8ea85f320967659cbf1f7ff1603d0a368867b9',
        },
      };
      const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

      // nock.disableNetConnect();

      // nock('http://127.0.0.1:4096')
      //   .get(baseDir + 'getBalance/?address=' + address)
      //   // .query({address: address})
      //   .reply(200, { expected });

      const argv = ['getbalance', address];
      program.parse(argv);

      moxios.wait(function() {
        const request = moxios.requests.mostRecent();
        request
          .respondWith({
            status: 200,
            response: { data: expected },
          })
          .then(function() {
            const output = stdout.inspectSync(function() {
              account(program as ApiConfig);
            });
            expect(output).toHaveProperty('account');
            done();
          });
      });

      // expect(test(address)).resolves.toHaveProperty('expected');
      // done();

      // const argv = ['getbalance', address];
      // program.parse(argv);

      // const output = stdout.inspectSync(function () {
      //   // account(program as ApiConfig);
      //   test();
      // });

      // const inspect = stdout.inspect();
      // // account(program as ApiConfig);
      // test();
      // inspect.restore();
      // console.log(output);
      // expect(output).toBe('account');
    });
  });
});
