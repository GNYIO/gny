import Sequence from '../../../packages/utils/sequence';

const timeout = ms => new Promise(res => setTimeout(res, ms));

describe('sequence', () => {
  let sut: Sequence;
  beforeEach(done => {
    sut = new Sequence({
      name: 'normal',
    });
    done();
  });
  afterEach(done => {
    sut = undefined;
    done();
  });

  it('add(sync) gets executed once', async done => {
    const task = res => {
      res();
    };
    const taskMock = jest.fn().mockImplementation(task);

    sut.add(taskMock);

    await timeout(300); // wait for execution

    expect(taskMock).toBeCalledTimes(1);
    expect(sut.count()).toEqual(0);
    done();
  });

  it('if task is not resolved within 15 seconds - it throws', async done => {
    const task = res => {
      // res() is not getting called
      setTimeout(() => {
        res();
      }, 16500);
    };
    const taskMock = jest.fn().mockImplementation(task);

    const callback = (err, result) => {
      expect(err).toEqual('Worker task timeout');
      expect(result).toBeUndefined();
    };
    const callbackMock = jest.fn().mockImplementation(callback);

    sut.add(taskMock, undefined, callbackMock);

    await timeout(17 * 1000); // wait for execution

    expect(taskMock).toBeCalledTimes(1);
    expect(callbackMock).toBeCalledTimes(1);
    expect(callbackMock).toBeCalledWith('Worker task timeout', undefined);
    done();
  }, 20000);

  it('add(sync) executes second callback if it throws error', async done => {
    const task = done => {
      throw new Error('test');
    };
    const errCallback = err => {
      // console.log('error callback called');
    };
    const errMock = jest.fn().mockImplementation(errCallback);

    sut.add(task, errMock);
    await timeout(300);

    expect(errMock).toBeCalledTimes(1);
    done();
  });

  it('add(2x sync) executes them in order', async done => {
    const task = done => {
      setTimeout(done, 2000);
    };
    const taskMock = jest.fn().mockImplementation(task);

    sut.add(taskMock);
    sut.add(taskMock);

    await timeout(300);

    expect(sut.count()).toEqual(1);
    expect(taskMock).toBeCalledTimes(1);
    done();
  });

  it('add(async)', async done => {
    let called = false;
    const asyncTask = async done => {
      await timeout(1000);
      called = true;
      done();
    };
    const asyncTaskMock = jest.fn().mockImplementation(asyncTask);

    sut.add(asyncTaskMock);

    await timeout(1300);

    expect(called).toEqual(true);
    done();
  });

  it('add(2x async)', async done => {
    const order: number[] = [];

    const asyncFirst = async res => {
      await timeout(1000);
      order.push(1);
      res();
    };

    const asyncSecond = async res => {
      await timeout(1000);
      order.push(2);
      res();
    };

    sut.add(asyncFirst);
    sut.add(asyncSecond);

    await timeout(3000);

    expect(order).toEqual([1, 2]);
    done();
  });

  it('pass argument to function', async done => {
    const args = [99];
    const task = (res, receivedArgs) => {
      res();
    };
    const taskMock = jest.fn().mockImplementation(task);

    sut.add(taskMock, args);

    await timeout(300);

    expect(taskMock.mock.calls[0][1]).toEqual(99);
    done();
  });

  it('add() resolve callback as 3rd parameter', async done => {
    const task = res => {
      res(undefined, 'this is the result');
    };
    const taskMock = jest.fn().mockImplementation(task);

    const callback = (err: string, result: any) => {
      expect(err).toBeUndefined();
      expect(result).toBeTruthy();
    };
    const callbackMock = jest.fn().mockImplementation(callback);

    sut.add(taskMock, undefined, callbackMock);

    await timeout(300);

    expect(taskMock).toBeCalledTimes(1);
    expect(callbackMock).toBeCalledTimes(1);
    expect(callbackMock).toBeCalledWith(undefined, 'this is the result');

    done();
  });

  it('recursive add() calls', async done => {
    const inOrder: number[] = [];

    const otherTask = () => {
      sut.add(res => {
        inOrder.push(2);
        res();
      });
    };

    const task = cb => {
      inOrder.push(1);
      otherTask();
      inOrder.push(3);
      setImmediate(cb);
    };

    sut.add(task);

    await timeout(300);
    await timeout(300);

    expect(inOrder).toEqual([1, 3, 2]);
    done();
  });

  it('return cb() should not further execute the code in the sequence', async done => {
    const result: number[] = [];
    const task = cb => {
      result.push(1);
      return cb();
      result.push(2);
    };

    const taskMock = jest.fn().mockImplementation(task);
    sut.add(taskMock);

    await timeout(300);

    expect(taskMock).toBeCalledTimes(1);
    expect(result).toEqual([1]);

    done();
  });

  it('warning: without "return cb()" will the code execute further', async done => {
    const result: number[] = [];
    const task = cb => {
      result.push(1);
      cb();
      result.push(2);
    };

    const taskMock = jest.fn().mockImplementation(task);
    sut.add(taskMock);

    await timeout(300);

    expect(taskMock).toBeCalledTimes(1);
    expect(result).toEqual([1, 2]);

    done();
  });

  it('concurrency: async ifii vs. setImidiate()', async done => {
    let result = '';
    const setResult = res => {
      result = res;
    };
    const setResultMock = jest.fn().mockImplementation(setResult);

    // dummy implementation of core/blocks.onReceiveVotes()
    const task = cb => {
      if (undefined === undefined) {
        return (async () => {
          setResultMock('async iffii');
          cb();
        })();
      }
      return setImmediate(() => {
        setResultMock('setImmediate');
        cb();
      });
    };

    sut.add(task);

    await timeout(500);

    expect(setResultMock).toBeCalledTimes(1);
    expect(setResultMock).toBeCalledWith('async iffii');
    done();
  });
});
