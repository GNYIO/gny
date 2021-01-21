import { queue } from 'async';

function tick(task: any, cb: any) {
  let isCallbacked = false;
  const done = (err, res?) => {
    if (isCallbacked) {
      return;
    }
    isCallbacked = true;
    if (task.done) {
      setImmediate(task.done, err, res);
    }
    setImmediate(cb);
  };
  let args = [done];
  if (task.args) {
    args = args.concat(task.args);
  }
  try {
    task.worker.apply(task.worker, args);
  } catch (e) {
    done(e.toString());
  }
}

export class Sequence /*implements ISequence*/ {
  private counter: number;
  private readonly name: string;
  private queue: AsyncQueue<any>;

  constructor(config: any) {
    this.counter = 1;
    this.name = config.name;

    this.queue = queue(tick, 1);
  }

  add(worker: any, args?: any, cb?: any) {
    let done;
    if (!cb && args && typeof args === 'function') {
      done = args;
    } else {
      done = cb;
    }
    if (worker && typeof worker === 'function') {
      interface ITask {
        worker: any;
        done: any;
        args?: any[];
        counter?: number;
      }
      const task: ITask = { worker, done };
      if (Array.isArray(args)) {
        task.args = args;
      }
      task.counter = this.counter++;
      this.queue.push(task);
    }
  }

  count() {
    return this.queue.length();
  }
}
