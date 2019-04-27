import * as gnyJS from 'gny-js';
import * as lib from '../lib';
import axios from 'axios';

const oneMinute = 60 * 1000;
const tenMinutes = 10 * 60 * 1000;

describe('basic', () => {
  beforeAll(async done => {
    await lib.buildDockerImage();
    done();
  }, tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, oneMinute);

  describe('transfer', () => {
    it('should transfer to a recipient account', async done => {});
  });
});
