import * as tracer from 'tracer';
import * as fs from 'fs';
import * as path from 'path';

const levelMap =  {
    log: 0,
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
};

// Logger configuration
const stream = fs.createWriteStream('logs/debug.log', { flags: 'a', encoding: 'utf8' });
const baseDir = './';
const configFile = path.join(baseDir, 'config.json');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

export class Logger {
    logLevel: string;

    constructor() {
        this.logLevel = this.getLevel(config);
    }

    /**
     * Get logger level config
     * @param {any} config
     * @return {string}
     */
    public getLevel(config: any): string {
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