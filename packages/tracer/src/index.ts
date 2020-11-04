import * as jaegerClient from 'jaeger-client';
import { ILogger } from '@gny/interfaces';

const initJaegerTracer = jaegerClient.initTracer;

export function initTracer(
  serviceName: string,
  collectorEndpoint: string,
  version: string,
  logger: ILogger
) {
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
    tags: {
      version: version,
    },
    logger: logger,
  };
  return initJaegerTracer(config, options);
}
