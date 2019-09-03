import { TransactionPool } from '../../../src/utils/transaction-pool';
import { ITransaction } from '../../../packages/interfaces';
import { randomBytes } from 'crypto';
import { generateAddress } from '../../../src/utils/address';

function createRandomBytes(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

function createTransaction(id: string) {
  const receiver = generateAddress(createRandomBytes(32));
  const senderPublicKey = createRandomBytes(32);
  const senderId = generateAddress(senderPublicKey);
  const transaction: ITransaction = {
    id,
    args: [12412524, receiver],
    type: 0,
    senderId,
    senderPublicKey,
    signatures: createRandomBytes(64),
    fee: String(0),
    height: String(1),
    message: undefined,
    timestamp: 0,
  };
  return transaction;
}

describe('TransactionPool', () => {
  let sut: TransactionPool; // system under test
  beforeEach(done => {
    sut = new TransactionPool();
    done();
  });
  afterEach(done => {
    sut = undefined;
    done();
  });

  it('get() - empty pool returns undefined', done => {
    const result = sut.get(
      'c4c1e34f4160e1d12e402a280398be7d16bf168166b27a5d8fff0deed6f8b7fe'
    );
    expect(result).toBeUndefined();

    done();
  });

  it('get() - pool with transaction returns correct transaction', done => {
    const trans = createTransaction(
      'c4c1e34f4160e1d12e402a280398be7d16bf168166b27a5d8fff0deed6f8b7fe'
    );

    sut.add(trans);

    const result = sut.get(
      'c4c1e34f4160e1d12e402a280398be7d16bf168166b27a5d8fff0deed6f8b7fe'
    );
    expect(result).toEqual(trans);

    done();
  });

  it('get() - pool with transaction - after clear() transaction gets no longer returned', done => {
    const trans = createTransaction(
      'c4c1e34f4160e1d12e402a280398be7d16bf168166b27a5d8fff0deed6f8b7fe'
    );

    sut.add(trans);

    sut.clear();

    const result = sut.get(
      'c4c1e34f4160e1d12e402a280398be7d16bf168166b27a5d8fff0deed6f8b7fe'
    );
    expect(result).toBeUndefined();

    done();
  });

  it('add() - adds Transaction to pool', done => {
    const trans = createTransaction(
      'c4c1e34f4160e1d12e402a280398be7d16bf168166b27a5d8fff0deed6f8b7fe'
    );

    sut.add(trans);

    // check if transaction has been added
    const result = sut.get(
      'c4c1e34f4160e1d12e402a280398be7d16bf168166b27a5d8fff0deed6f8b7fe'
    );
    expect(result).toEqual(trans);

    done();
  });

  it('getUnconfirmed() - returns all transactions in pool', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');
    const trans3 = createTransaction('trans3');

    sut.add(trans1);
    sut.add(trans2);
    sut.add(trans3);

    const result = sut.getUnconfirmed();

    expect(result).toEqual([trans1, trans2, trans3]);
    done();
  });

  it('getUnconfirmed() - returns no transactions after clear()', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');

    sut.add(trans1);
    sut.add(trans2);

    sut.clear();

    const result = sut.getUnconfirmed();
    expect(result).toEqual([]);

    done();
  });

  it('getUnconfirmed() - returns one transaction less after one remove()', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');

    sut.add(trans1);
    sut.add(trans2);

    sut.remove('trans1');

    const result = sut.getUnconfirmed();
    expect(result).toEqual([trans2]);

    done();
  });

  it('getUnconfirmed() - called 2x does not clear the transactions, returns always the same transactions', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');

    sut.add(trans1);
    sut.add(trans2);

    const first = sut.getUnconfirmed();
    expect(first).toEqual([trans1, trans2]);

    const sameAsFirst = sut.getUnconfirmed();
    expect(sameAsFirst).toEqual([trans1, trans2]);

    // transactions within are the array are the same
    // but the returned array is not the same memory refernce
    expect(first).not.toBe(sameAsFirst);

    done();
  });

  it('getUnconfirmed() - returns empty object when no transaction where added', done => {
    const result = sut.getUnconfirmed();
    expect(result).toEqual([]);

    done();
  });

  it('getUnconfirmed() - returns objects in the order they where added', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');

    sut.add(trans1);
    sut.add(trans2);

    const expectedOrder = [trans1, trans2];

    const result = sut.getUnconfirmed();
    expect(result).toEqual(expectedOrder);

    done();
  });

  it('getUnconfirmed() - returns objects in order they where added also when objects where deleted', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');
    const trans3 = createTransaction('trans3');

    sut.add(trans1);
    sut.add(trans2);

    sut.remove('trans2');

    sut.add(trans3);

    const expectedOrder = [trans1, trans3];
    const result = sut.getUnconfirmed();
    expect(result).toEqual(expectedOrder);

    done();
  });

  it('has() - returns false if transaction is not pool', done => {
    const result = sut.has('trans1');
    expect(result).toEqual(false);

    done();
  });

  it('has() - returns true if transaction is in pool', done => {
    const trans1 = createTransaction('trans1');
    sut.add(trans1);

    const result = sut.has('trans1');
    expect(result).toEqual(true);

    done();
  });

  it('add() and remove() - many transactinos', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');
    const trans3 = createTransaction('trans3');
    const trans4 = createTransaction('trans4');

    sut.add(trans1);
    sut.add(trans2);

    sut.remove('trans2');

    sut.add(trans3);
    sut.add(trans4);

    sut.remove('trans4');

    const result = sut.getUnconfirmed();
    expect(result).toEqual([trans1, trans3]);

    done();
  });

  it('clear() - removes all transactions from pool', done => {
    const trans1 = createTransaction('trans1');
    const trans2 = createTransaction('trans2');
    const trans3 = createTransaction('trans3');

    sut.add(trans1);
    sut.add(trans2);
    sut.add(trans3);

    // check before clear()
    const before = sut.getUnconfirmed();
    expect(before.length).toEqual(3);

    // act
    sut.clear();

    // check after clear()
    const after = sut.getUnconfirmed();
    expect(after.length).toEqual(0);

    const getFirst = sut.get('trans1');
    expect(getFirst).toBeUndefined();
    const getSecond = sut.get('trans2');
    expect(getSecond).toBeUndefined();
    const getThird = sut.get('trans3');
    expect(getThird).toBeUndefined();

    done();
  });

  it('remove() - removes transaction from pool', done => {
    const trans1 = createTransaction('trans1');
    sut.add(trans1);

    // check before remove()
    const before = sut.get('trans1');
    expect(before).toEqual(trans1);

    // act
    sut.remove('trans1');

    // check after remove()
    const after = sut.get('trans1');
    expect(after).toBeUndefined();

    done();
  });
});
