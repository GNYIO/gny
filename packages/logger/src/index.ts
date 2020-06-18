import * as tracer from 'tracer';
import * as fs from 'fs';
import { ILogger } from '@gny/interfaces';

export enum LogLevel {
  log = 0,
  trace = 1,
  debug = 2,
  info = 3,
  warn = 4,
  error = 5,
  fatal = 6,
}

export function createLogger(consoleLogLevel: LogLevel): ILogger {
  const logger: ILogger = tracer.colorConsole({
    dateformat: 'HH:MM:ss.l',
    transport: [
      function(data) {
        // filter console log level
        if (data.level >= consoleLogLevel) {
          console.log(data.output);
        }
      },
    ],
  });
  return logger;
}
