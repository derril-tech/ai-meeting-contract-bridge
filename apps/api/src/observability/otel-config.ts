import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

// Configure OpenTelemetry SDK
export function setupOpenTelemetry() {
    const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'ai-meeting-contract-bridge-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'ai-meeting-contract-bridge',
    });

    // Configure tracing
    const jaegerExporter = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    const spanProcessor = new BatchSpanProcessor(jaegerExporter);

    // Configure metrics
    const prometheusExporter = new PrometheusExporter({
        port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
    });

    const metricReader = new PeriodicExportingMetricReader({
        exporter: prometheusExporter,
        exportIntervalMillis: 30000, // Export every 30 seconds
    });

    const meterProvider = new MeterProvider({
        resource,
        readers: [metricReader],
    });

    // Initialize SDK
    const sdk = new NodeSDK({
        resource,
        spanProcessor,
        instrumentations: [getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {
                enabled: true,
            },
            '@opentelemetry/instrumentation-express': {
                enabled: true,
            },
            '@opentelemetry/instrumentation-typeorm': {
                enabled: true,
            },
            '@opentelemetry/instrumentation-nestjs-core': {
                enabled: true,
            },
        })],
    });

    // Set global meter provider
    globalThis.meterProvider = meterProvider;

    return sdk;
}
