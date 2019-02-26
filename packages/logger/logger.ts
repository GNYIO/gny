import * as tracer from 'tracer';
import * as fs from 'fs';
import { ILogger } from '../../src/interfaces';

export function createLogger(fileName: string, logLevel: number | string): ILogger {
  const stream = fs.createWriteStream(fileName, { flags: 'a', encoding: 'utf8' });
  const logger: ILogger = tracer.colorConsole({
    transport: [
      function (data) {
        stream.write(data.rawoutput + '\n');
      },
      function(data) {
        console.log(data.output);
      }
    ]
  });
  tracer.setLevel(logLevel);
  return logger;
}
