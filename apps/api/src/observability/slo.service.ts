import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MonitoringService } from './monitoring.service';

export interface SLODefinition {
  name: string;
  description: string;
  target: number; // Target percentage (e.g., 99.9 for 99.9%)
  window: string; // Time window (e.g., '1h', '24h', '7d')
  metric: string; // Metric name to monitor
}

export interface SLOMeasurement {
  sloName: string;
  timestamp: Date;
  actualValue: number;
  targetValue: number;
  isMet: boolean;
  errorBudgetUsed: number; // Percentage of error budget consumed
}

@Injectable()
export class SLOService {
  private readonly sloDefinitions: SLODefinition[] = [
    {
      name: 'meeting_processing_duration',
      description: 'Meeting processing completes within 30 seconds',
      target: 95, // 95% of requests
      window: '24h',
      metric: 'meeting_processing_duration_seconds',
    },
    {
      name: 'draft_generation_duration',
      description: 'Draft generation completes within 12 seconds',
      target: 95,
      window: '24h',
      metric: 'draft_generation_duration_seconds',
    },
    {
      name: 'export_duration',
      description: 'Export generation completes within 5 seconds',
      target: 95,
      window: '24h',
      metric: 'export_duration_seconds',
    },
    {
      name: 'qa_response_time',
      description: 'QA queries respond within 3 seconds',
      target: 99,
      window: '24h',
      metric: 'qa_query_duration_seconds',
    },
    {
      name: 'system_availability',
      description: 'System is available 99.9% of the time',
      target: 99.9,
      window: '24h',
      metric: 'system_uptime',
    },
    {
      name: 'decision_accuracy',
      description: 'Decision extraction accuracy above 90%',
      target: 90,
      window: '24h',
      metric: 'decision_extraction_accuracy',
    },
  ];

  constructor(
    private monitoringService: MonitoringService,
  ) {}

  async measureSLOs(): Promise<SLOMeasurement[]> {
    const measurements: SLOMeasurement[] = [];

    for (const slo of this.sloDefinitions) {
      const measurement = await this.measureSLO(slo);
      measurements.push(measurement);
    }

    return measurements;
  }

  private async measureSLO(slo: SLODefinition): Promise<SLOMeasurement> {
    const now = new Date();
    const windowStart = this.getWindowStart(now, slo.window);

    // This would integrate with actual metrics storage
    // For now, we'll simulate measurements
    const measurement = await this.simulateSLOMeasurement(slo, windowStart, now);

    return {
      sloName: slo.name,
      timestamp: now,
      actualValue: measurement.actualValue,
      targetValue: slo.target,
      isMet: measurement.actualValue >= slo.target,
      errorBudgetUsed: Math.max(0, 100 - measurement.actualValue),
    };
  }

  private async simulateSLOMeasurement(
    slo: SLODefinition,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<{ actualValue: number }> {
    // In production, this would query actual metrics from storage
    // For now, simulate realistic values

    switch (slo.metric) {
      case 'meeting_processing_duration_seconds':
        return { actualValue: 96.2 }; // 96.2% meet 30s target

      case 'draft_generation_duration_seconds':
        return { actualValue: 94.8 }; // 94.8% meet 12s target

      case 'export_duration_seconds':
        return { actualValue: 97.5 }; // 97.5% meet 5s target

      case 'qa_query_duration_seconds':
        return { actualValue: 99.2 }; // 99.2% meet 3s target

      case 'system_uptime':
        return { actualValue: 99.95 }; // 99.95% uptime

      case 'decision_extraction_accuracy':
        return { actualValue: 92.3 }; // 92.3% accuracy

      default:
        return { actualValue: 95.0 };
    }
  }

  private getWindowStart(now: Date, window: string): Date {
    const windowStart = new Date(now);

    switch (window) {
      case '1h':
        windowStart.setHours(now.getHours() - 1);
        break;
      case '24h':
        windowStart.setHours(now.getHours() - 24);
        break;
      case '7d':
        windowStart.setDate(now.getDate() - 7);
        break;
      case '30d':
        windowStart.setDate(now.getDate() - 30);
        break;
      default:
        windowStart.setHours(now.getHours() - 24);
    }

    return windowStart;
  }

  async getSLORollup(window: string = '24h'): Promise<any> {
    const measurements = await this.measureSLOs();

    const rollup = {
      window,
      timestamp: new Date(),
      overall: {
        sloCount: measurements.length,
        metCount: measurements.filter(m => m.isMet).length,
        breachedCount: measurements.filter(m => !m.isMet).length,
        averageErrorBudgetUsed: measurements.reduce((sum, m) => sum + m.errorBudgetUsed, 0) / measurements.length,
      },
      slos: measurements,
      recommendations: this.generateRecommendations(measurements),
    };

    return rollup;
  }

  private generateRecommendations(measurements: SLOMeasurement[]): string[] {
    const recommendations: string[] = [];

    for (const measurement of measurements) {
      if (!measurement.isMet) {
        switch (measurement.sloName) {
          case 'meeting_processing_duration':
            recommendations.push(
              'Consider optimizing transcript processing pipeline',
              'Review worker autoscaling configuration',
              'Check database query performance for meeting processing'
            );
            break;

          case 'draft_generation_duration':
            recommendations.push(
              'Optimize clause retrieval algorithms',
              'Consider caching frequently used clause templates',
              'Review AI model inference performance'
            );
            break;

          case 'export_duration':
            recommendations.push(
              'Optimize document generation libraries',
              'Consider CDN for static assets',
              'Review file storage performance'
            );
            break;

          case 'qa_response_time':
            recommendations.push(
              'Optimize vector search for clause matching',
              'Consider caching QA responses',
              'Review AI model response times'
            );
            break;

          case 'system_availability':
            recommendations.push(
              'Review error rates and failure patterns',
              'Check database connection stability',
              'Review worker health checks and restarts'
            );
            break;

          case 'decision_accuracy':
            recommendations.push(
              'Review decision extraction model training data',
              'Consider human-in-the-loop validation',
              'Update model with recent examples'
            );
            break;
        }
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  async validateProductionReadiness(): Promise<{
    isReady: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const measurements = await this.measureSLOs();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check critical SLOs
    const criticalSLOs = ['meeting_processing_duration', 'draft_generation_duration', 'system_availability'];
    const criticalMeasurements = measurements.filter(m => criticalSLOs.includes(m.sloName));

    for (const measurement of criticalMeasurements) {
      if (!measurement.isMet) {
        issues.push(`${measurement.sloName} SLO not met: ${measurement.actualValue}% (target: ${measurement.targetValue}%)`);
      }
    }

    // Check for major deviations
    for (const measurement of measurements) {
      if (measurement.errorBudgetUsed > 20) { // More than 20% error budget used
        recommendations.push(`High error budget usage for ${measurement.sloName}: ${measurement.errorBudgetUsed}%`);
      }
    }

    // Additional readiness checks
    if (measurements.length < this.sloDefinitions.length) {
      issues.push('Not all SLOs are being measured');
    }

    return {
      isReady: issues.length === 0,
      issues,
      recommendations,
    };
  }

  async generateSLOReport(): Promise<any> {
    const measurements = await this.measureSLOs();
    const rollup = await this.getSLORollup();
    const readiness = await this.validateProductionReadiness();

    return {
      reportGeneratedAt: new Date(),
      period: 'Last 24 hours',
      summary: {
        totalSLOs: measurements.length,
        slosMet: measurements.filter(m => m.isMet).length,
        slosBreached: measurements.filter(m => !m.isMet).length,
        averagePerformance: measurements.reduce((sum, m) => sum + m.actualValue, 0) / measurements.length,
      },
      detailedMeasurements: measurements,
      rollup,
      readiness,
      definitions: this.sloDefinitions,
    };
  }

  // Method to record SLO violations for alerting
  async recordSLOViolation(measurement: SLOMeasurement): Promise<void> {
    // In production, this would integrate with alerting systems
    console.warn(`SLO Violation: ${measurement.sloName}`, {
      target: measurement.targetValue,
      actual: measurement.actualValue,
      errorBudgetUsed: measurement.errorBudgetUsed,
      timestamp: measurement.timestamp,
    });

    // Could send to monitoring service
    this.monitoringService.recordValidationError(
      'slo_violation',
      {
        sloName: measurement.sloName,
        targetValue: measurement.targetValue.toString(),
        actualValue: measurement.actualValue.toString(),
        errorBudgetUsed: measurement.errorBudgetUsed.toString(),
      }
    );
  }

  // Method to check if current performance meets SLO targets
  async checkSLOMeetingProcessing(duration: number): Promise<boolean> {
    return duration <= 30; // 30 seconds target
  }

  async checkSLODraftGeneration(duration: number): Promise<boolean> {
    return duration <= 12; // 12 seconds target
  }

  async checkSLOExport(duration: number): Promise<boolean> {
    return duration <= 5; // 5 seconds target
  }

  async checkSLOQAQuery(duration: number): Promise<boolean> {
    return duration <= 3; // 3 seconds target
  }
}
