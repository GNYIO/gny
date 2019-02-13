import * as tracer from 'tracer';
import * as fs from 'fs';
import * as path from 'path';

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
const baseDir = './';
const configFile = path.join(baseDir, 'config.json');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

export class Logger {
    static createlogger: () => tracer.Tracer.Logger;
    logLevel: string;

    constructor() {
        this.logLevel = this.getLevel(config);
    }

    /*
    * TODO
    */
    public getLevel(config) {
        return levelMap[config.logLevel];
    }

    /*
    * Create a logger
    */
    public createlogger = () => {
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
        tracer.setLevel(this.logLevel);

        return logger;
    }

}