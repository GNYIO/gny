import * as jaegerClient from 'jaeger-client';

const initJaegerTracer = jaegerClient.initTracer;

export function initTracer(serviceName: string) {
  const config = {
    serviceName: serviceName,
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      logSpans: true,
      collectorEndpoint: 'http://127.0.0.1:14268/api/traces',
    },
  };
  const options = {
    logger: {
      info(msg: string) {
        console.log('INFO ', msg);
      },
      error(msg: string) {
        console.log('ERROR', msg);
      },
    },
  };
  return initJaegerTracer(config, options);
}
