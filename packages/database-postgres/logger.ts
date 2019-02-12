import * as tracer from 'tracer';
import * as fs from 'fs';

// Logger configuration
const levelMap =  {
    trace: 64,
    debug: 32,
    log: 16,
    info: 8,
    warn: 4,
    error: 2,
    fatal: 1,
};

const stream = fs.createWriteStream('logs/debug.log', { flags: 'a', encoding: 'utf8' });
const config = '';



export class Logger {
  static createlogger: () => tracer.Tracer.Logger;

    constructor() {
        const logLevel = this.getLevel(config);
    }


    /*
    * TODO
    */
    public getLevel(config) {
        return levelMap[config];
    }

    public createlogger = () => {
        console.log('Not be changed to global.app.logger');
        const logger = tracer.colorConsole({
            transport: [
                function (data) {
                    stream.write(data.rawoutput + '\n');
                },
                function(data) {
                    console.log(data.output);
                }
            ]
        });
        //   tracer.setLevel(logLevel);
        return logger;
    }

}