import * as jaegerClient from 'jaeger-client';

const initJaegerTracer = jaegerClient.initTracer;

export function initTracer(serviceName: string, collectorEndpoint: string) {
  const config = {
    serviceName: serviceName,
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      logSpans: true,
      collectorEndpoint: collectorEndpoint,
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
