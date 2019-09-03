import { MessageBus } from '../../../src/utils/messageBus';
import { Modules, CoreApi } from '../../../packages/interfaces';

describe('messageBus', () => {
  it('message() - event gets executed in all Modules and all registered CoreApi instances', done => {
    const EVENT_NAME = 'onLoaded';

    // to satisfy the Typescript type checker we first need to cast to "unknown"
    const modulesMock = jest.fn().mockImplementation(first => {});
    const modules = ({
      blocks: {
        onLoaded: modulesMock,
      },
    } as unknown) as Modules;

    // to satisfy the Typescript type checker we first need to cast to "unknown"
    const coreApiMock = jest.fn().mockImplementation(first => {});
    const coreApi = ({
      blocksApi: {
        onLoaded: coreApiMock,
      },
    } as unknown) as CoreApi;

    const bus = new MessageBus(modules, coreApi);

    // act
    bus.message(EVENT_NAME);

    // assert
    expect(modulesMock).toBeCalledTimes(1);
    expect(modulesMock).toBeCalledWith();

    expect(coreApiMock).toBeCalledTimes(1);
    expect(coreApiMock).toBeCalledWith();

    done();
  });
  it('message() - pass arbitrary arguments to event target', done => {
    const EVENT_NAME = 'onLoaded';

    // to satisfy the Typescript type checker we first need to cast to "unknown"
    const modulesMock = jest.fn().mockImplementation((first, second, third) => {
      expect(first).toEqual(1);
      expect(second).toEqual('hello');
      expect(third).toEqual({ liang: 'peili' });
    });
    const modules = ({
      blocks: {
        onLoaded: modulesMock,
      },
    } as unknown) as Modules;

    // to satisfy the Typescript type checker we first need to cast to "unknown"
    const coreApiMock = jest.fn().mockImplementation((first, second, third) => {
      expect(first).toEqual(1);
      expect(second).toEqual('hello');
      expect(third).toEqual({ liang: 'peili' });
    });
    const coreApi = ({
      blocksApi: {
        onLoaded: coreApiMock,
      },
    } as unknown) as CoreApi;

    const bus = new MessageBus(modules, coreApi);

    // act
    bus.message(EVENT_NAME, 1, 'hello', { liang: 'peili' });

    // assert
    expect(modulesMock).toBeCalledTimes(1);
    expect(modulesMock).toBeCalledWith(1, 'hello', { liang: 'peili' });

    expect(coreApiMock).toBeCalledTimes(1);
    expect(coreApiMock).toBeCalledWith(1, 'hello', { liang: 'peili' });

    done();
  });

  it('message() - emits also native event', done => {
    // preparation
    const modules = {} as Modules;
    const coreApi = {} as CoreApi;

    const bus = new MessageBus(modules, coreApi);

    const onNativeEventMock = jest.fn().mockImplementation(first => {
      expect(first).toEqual('hello world');
    });

    // subscribe to "native" EventEmitter evnet
    bus.on('onLoaded', onNativeEventMock);

    // fire message()
    bus.message('onLoaded', 'hello world');

    // assert
    expect(onNativeEventMock).toBeCalledTimes(1);
    expect(onNativeEventMock).toBeCalledWith('hello world');

    done();
  });

  it.skip('message() - handles error in Modules function or CoreApi function', done => {
    done();
  });
});
