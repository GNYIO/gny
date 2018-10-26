"use strict";
var program = require('commander');
var path = require('path');
var fs = require('fs');
var randomstring = require('randomstring');
var ip = require('ip');
var daemon = require('daemon');
var tracer = require('tracer');
var asch = require('./index');
var Application = asch.Application;
function main() {
    process.stdin.resume();
    var version = '1.4.2';
    program
        .version(version)
        .option('-c, --config <path>', 'Config file path')
        .option('-p, --port <port>', 'Listening port number')
        .option('-a, --address <ip>', 'Listening host name or ip')
        .option('-g, --genesisblock <path>', 'Genesisblock path')
        .option('-x, --peers [peers...]', 'Peers list')
        .option('-l, --log <level>', 'Log level')
        .option('-d, --daemon', 'Run asch node as daemon')
        .option('--app <dir>', 'App directory')
        .option('--base <dir>', 'Base directory')
        .option('--data <dir>', 'Data directory')
        .parse(process.argv);
    var baseDir = program.base || './';
    var appConfigFile = path.join(baseDir, 'config.json');
    if (program.config) {
        appConfigFile = path.resolve(process.cwd(), program.config);
    }
    var appConfig = JSON.parse(fs.readFileSync(appConfigFile, 'utf8'));
    var pidFile = appConfig.pidFile || path.join(baseDir, 'asch.pid');
    if (fs.existsSync(pidFile)) {
        console.log('Failed: asch server already started');
        return;
    }
    appConfig.version = version;
    appConfig.baseDir = baseDir;
    appConfig.dataDir = program.data || path.resolve(baseDir, 'data');
    appConfig.appDir = program.app || path.resolve(baseDir, 'src');
    appConfig.buildVersion = 'DEFAULT_BUILD_TIME';
    appConfig.netVersion = process.env.NET_VERSION || 'testnet';
    appConfig.publicDir = path.join(baseDir, 'public', 'dist');
    global.Config = appConfig;
    var genesisblockFile = path.join(baseDir, 'genesisBlock.json');
    if (program.genesisblock) {
        genesisblockFile = path.resolve(process.cwd(), program.genesisblock);
    }
    var genesisblock = JSON.parse(fs.readFileSync(genesisblockFile, 'utf8'));
    if (program.port) {
        appConfig.port = program.port;
    }
    if (!appConfig.peerPort) {
        appConfig.peerPort = appConfig.port + 1;
    }
    if (program.address) {
        appConfig.address = program.address;
    }
    if (program.peers) {
        if (typeof program.peers === 'string') {
            appConfig.peers.list = program.peers.split(',').map(function (peer) {
                var parts = peer.split(':');
                return {
                    ip: parts.shift(),
                    port: parts.shift() || appConfig.port,
                };
            });
        }
        else {
            appConfig.peers.list = [];
        }
    }
    if (appConfig.netVersion === 'mainnet') {
        var seeds = [
            757137132
        ];
        for (var i = 0; i < seeds.length; ++i) {
            appConfig.peers.list.push({ ip: ip.fromLong(seeds[i]), port: 81 });
        }
    }
    if (program.log) {
        appConfig.logLevel = program.log;
    }
    if (program.daemon) {
        console.log('Asch server started as daemon ...');
        daemon({ cwd: process.cwd() });
        fs.writeFileSync(pidFile, process.pid, 'utf8');
    }
    var logger;
    if (program.daemon) {
        logger = tracer.dailyfile({
            root: path.join(baseDir, 'logs'),
            maxLogFiles: 10,
            allLogsFileName: 'debug',
        });
    }
    else {
        logger = tracer.colorConsole();
    }
    tracer.setLevel(appConfig.logLevel);
    var options = {
        appConfig: appConfig,
        genesisblock: genesisblock,
        logger: logger,
        pidFile: pidFile,
    };
    var app = new Application(options);
    app.run();
}
main();
