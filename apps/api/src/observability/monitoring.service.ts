import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Meter } from '@opentelemetry/api-metrics';
import { trace, Span, Tracer } from '@opentelemetry/api';

@Injectable()
export class MonitoringService {
    private meter: Meter;
    private tracer: Tracer;

    // Counters
    private meetingUploadCounter: Counter;
    private decisionExtractionCounter: Counter;
    private draftGenerationCounter: Counter;
    private exportCounter: Counter;
    private qaQueryCounter: Counter;

    // Histograms for latency tracking
    private meetingProcessingDuration: Histogram;
    private decisionExtractionDuration: Histogram;
    private draftGenerationDuration: Histogram;
    private exportDuration: Histogram;
    private qaQueryDuration: Histogram;

    // Error counters
    private processingErrorsCounter: Counter;
    private validationErrorsCounter: Counter;

    constructor() {
        this.meter = globalThis.meterProvider?.getMeter('ai-meeting-contract-bridge') || trace.getTracer('ai-meeting-contract-bridge');
        this.tracer = trace.getTracer('ai-meeting-contract-bridge');

        this.initializeMetrics();
    }

    private initializeMetrics() {
        // Counters
        this.meetingUploadCounter = this.meter.createCounter('meetings_uploaded_total', {
            description: 'Total number of meetings uploaded',
        });

        this.decisionExtractionCounter = this.meter.createCounter('decisions_extracted_total', {
            description: 'Total number of decisions extracted',
        });

        this.draftGenerationCounter = this.meter.createCounter('drafts_generated_total', {
            description: 'Total number of drafts generated',
        });

        this.exportCounter = this.meter.createCounter('exports_completed_total', {
            description: 'Total number of exports completed',
        });

        this.qaQueryCounter = this.meter.createCounter('qa_queries_total', {
            description: 'Total number of QA queries',
        });

        // Histograms
        this.meetingProcessingDuration = this.meter.createHistogram('meeting_processing_duration_seconds', {
            description: 'Time taken to process meetings',
        });

        this.decisionExtractionDuration = this.meter.createHistogram('decision_extraction_duration_seconds', {
            description: 'Time taken to extract decisions',
        });

        this.draftGenerationDuration = this.meter.createHistogram('draft_generation_duration_seconds', {
            description: 'Time taken to generate drafts',
        });

        this.exportDuration = this.meter.createHistogram('export_duration_seconds', {
            description: 'Time taken to export documents',
        });

        this.qaQueryDuration = this.meter.createHistogram('qa_query_duration_seconds', {
            description: 'Time taken to answer QA queries',
        });

        // Error counters
        this.processingErrorsCounter = this.meter.createCounter('processing_errors_total', {
            description: 'Total number of processing errors',
        });

        this.validationErrorsCounter = this.meter.createCounter('validation_errors_total', {
            description: 'Total number of validation errors',
        });
    }

    // Tracing methods
    startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
        return this.tracer.startSpan(name, { attributes });
    }

    // Metric recording methods
    recordMeetingUpload(attributes?: Record<string, string | number | boolean>) {
        this.meetingUploadCounter.add(1, attributes);
    }

    recordDecisionExtraction(count: number, attributes?: Record<string, string | number | boolean>) {
        this.decisionExtractionCounter.add(count, attributes);
    }

    recordDraftGeneration(attributes?: Record<string, string | number | boolean>) {
        this.draftGenerationCounter.add(1, attributes);
    }

    recordExport(format: string, attributes?: Record<string, string | number | boolean>) {
        this.exportCounter.add(1, { format, ...attributes });
    }

    recordQAQuery(attributes?: Record<string, string | number | boolean>) {
        this.qaQueryCounter.add(1, attributes);
    }

    recordMeetingProcessingDuration(duration: number, attributes?: Record<string, string | number | boolean>) {
        this.meetingProcessingDuration.record(duration, attributes);
    }

    recordDecisionExtractionDuration(duration: number, attributes?: Record<string, string | number | boolean>) {
        this.decisionExtractionDuration.record(duration, attributes);
    }

    recordDraftGenerationDuration(duration: number, attributes?: Record<string, string | number | boolean>) {
        this.draftGenerationDuration.record(duration, attributes);
    }

    recordExportDuration(duration: number, format: string, attributes?: Record<string, string | number | boolean>) {
        this.exportDuration.record(duration, { format, ...attributes });
    }

    recordQAQueryDuration(duration: number, attributes?: Record<string, string | number | boolean>) {
        this.qaQueryDuration.record(duration, attributes);
    }

    recordProcessingError(errorType: string, attributes?: Record<string, string | number | boolean>) {
        this.processingErrorsCounter.add(1, { error_type: errorType, ...attributes });
    }

    recordValidationError(errorType: string, attributes?: Record<string, string | number | boolean>) {
        this.validationErrorsCounter.add(1, { error_type: errorType, ...attributes });
    }

    // SLO tracking methods
    checkSLOMeetingProcessing(duration: number): boolean {
        const sloThreshold = 30; // 30 seconds
        return duration <= sloThreshold;
    }

    checkSLODraftGeneration(duration: number): boolean {
        const sloThreshold = 12; // 12 seconds
        return duration <= sloThreshold;
    }

    checkSLOExport(duration: number): boolean {
        const sloThreshold = 5; // 5 seconds
        return duration <= sloThreshold;
    }

    // Health check metrics
    recordHealthCheck(service: string, status: 'healthy' | 'unhealthy') {
        const healthCounter = this.meter.createCounter(`health_check_${status}_total`, {
            description: `Number of ${status} health checks`,
        });
        healthCounter.add(1, { service });
    }

    // Performance monitoring
    recordDatabaseQueryDuration(duration: number, operation: string) {
        const dbQueryDuration = this.meter.createHistogram('database_query_duration_seconds', {
            description: 'Time taken for database queries',
        });
        dbQueryDuration.record(duration, { operation });
    }

    recordExternalAPICallDuration(duration: number, service: string, endpoint: string) {
        const apiCallDuration = this.meter.createHistogram('external_api_call_duration_seconds', {
            description: 'Time taken for external API calls',
        });
        apiCallDuration.record(duration, { service, endpoint });
    }
}
