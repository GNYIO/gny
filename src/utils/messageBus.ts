import { EventEmitter } from 'events';
import {
  IMessageEmitter,
  Modules,
  CoreApi,
  MethodActions,
} from '../../packages/interfaces';

export class MessageBus extends EventEmitter implements IMessageEmitter {
  private modules: Modules;
  private coreApi: CoreApi;
  constructor(modules: Modules, coreApi: CoreApi) {
    super();
    this.modules = modules;
    this.coreApi = coreApi;
  }

  message(topic: MethodActions, ...restArgs) {
    Object.keys(this.modules).forEach(moduleName => {
      const module = this.modules[moduleName];
      if (typeof module[topic] === 'function') {
        module[topic].apply(module[topic], [...restArgs]);
      }
    });

    Object.keys(this.coreApi).forEach(apiName => {
      const oneApi = this.coreApi[apiName];
      if (typeof oneApi[topic] === 'function') {
        oneApi[topic].apply(oneApi[topic], [...restArgs]);
      }
    });
    this.emit(topic, ...restArgs);
  }
}
