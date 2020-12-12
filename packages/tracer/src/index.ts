import * as jaegerClient from 'jaeger-client';
import { JaegerTracer } from 'jaeger-client';
import { ILogger } from '@gny/interfaces';
import * as opentracing from 'opentracing';

const initJaegerTracer = jaegerClient.initTracer;

export interface HeightAndId {
  height: string;
  id: string;
}
export function getSmallBlockHash(heightAndId: HeightAndId) {
  if (
    typeof heightAndId === 'object' &&
    typeof heightAndId.id === 'string' &&
    typeof heightAndId.height === 'string'
  ) {
    return `${heightAndId.height}:${heightAndId.id.substr(0, 7)}`;
  }
  return '';
}

export interface ISerializedSpanContext {
  'uber-trace-id': string;
}

export interface TracerWrapper<T> {
  spanId: ISerializedSpanContext;
  data: T;
}

export interface IKeyValuePair {
  [key: string]: any;
}

export interface ISpan {
  setTag: (key: string, value: any) => this;
  log: (obj: IKeyValuePair) => this;
  finish: () => void;
  context: () => opentracing.SpanContext;
}

export function serializedSpanContext(
  myTracer: jaegerClient.JaegerTracer,
  context: opentracing.SpanContext
) {
  const obj: ISerializedSpanContext = {} as ISerializedSpanContext;
  myTracer.inject(context, opentracing.FORMAT_TEXT_MAP, obj);
  return obj;
}

export function createSpanContextFromSerializedParentContext(
  myTracer: JaegerTracer,
  obj: ISerializedSpanContext
) {
  const parentSpanContext = myTracer.extract(opentracing.FORMAT_TEXT_MAP, obj);
  return parentSpanContext;
}

export function createReferenceFromSerializedParentContext(
  myTracer: JaegerTracer,
  obj: ISerializedSpanContext
) {
  const parentSpanContext = myTracer.extract(opentracing.FORMAT_TEXT_MAP, obj);
  if (parentSpanContext) {
    const reference = new opentracing.Reference(
      opentracing.REFERENCE_FOLLOWS_FROM,
      parentSpanContext
    );
    return reference;
  }
  throw new Error('this should not happen, where is my jaeger Reference');
}

export function initTracer(
  disable: boolean,
  serviceName: string,
  collectorEndpoint: string,
  version: string,
  magic: string,
  network: string,
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
      version,
      magic,
      network,
    },
    logger: logger,
  };

  logger.info(`[p2p] jaeger configuration: ${JSON.stringify(config, null, 2)}`);
  logger.info(`[p2p] jaeger options: ${JSON.stringify(options, null, 2)}`);

  return initJaegerTracer(config, options);
}
