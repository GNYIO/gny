import * as tracer from 'tracer';
import * as fs from 'fs';
import { ILogger } from '../../packages/interfaces';

export enum LogLevel {
  log = 0,
  trace = 1,
  debug = 2,
  info = 3,
  warn = 4,
  error = 5,
  fatal = 6,
}

export function createLogger(
  fileName: string,
  consoleLogLevel: LogLevel
): ILogger {
  const stream = fs.createWriteStream(fileName, {
    flags: 'a',
    encoding: 'utf8',
  });
  const logger: ILogger = tracer.colorConsole({
    dateformat: 'HH:MM:ss.l',
    transport: [
      function(data) {
        // write all messages to file
        stream.write(data.rawoutput + '\n');
      },
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
