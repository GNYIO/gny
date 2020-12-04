import * as jaegerClient from 'jaeger-client';
import { JaegerTracer } from 'jaeger-client';
import { ILogger, SerializedSpanContext } from '@gny/interfaces';
import * as opentracing from 'opentracing';

const initJaegerTracer = jaegerClient.initTracer;

export function createSerializedSpanContext(
  myTracer: JaegerTracer,
  mySpan: opentracing.Span
) {
  const obj: SerializedSpanContext = {};
  myTracer.inject(mySpan.context(), opentracing.FORMAT_TEXT_MAP, obj);
  return obj;
}

export function createSpanContextFromSerializedParentContext(
  myTracer: JaegerTracer,
  obj: SerializedSpanContext
) {
  const parentSpanContext = myTracer.extract(opentracing.FORMAT_TEXT_MAP, obj);
  return parentSpanContext;
}

export function initTracer(
  disable: boolean,
  serviceName: string,
  collectorEndpoint: string,
  version: string,
  logger: ILogger
) {
  const config: jaegerClient.TracingConfig = {
    disable: disable,
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

  const options: jaegerClient.TracingOptions = {
    tags: {
      version: version,
    },
    logger: logger,
  };

  logger.info(`[p2p] jaeger configuration: ${JSON.stringify(config, null, 2)}`);
  logger.info(`[p2p] jaeger options: ${JSON.stringify(options, null, 2)}`);

  return initJaegerTracer(config, options);
}
