/* eslint-env deno */
/**
 * Prometheus-compatible metrics collection for Supabase Edge Functions
 * Supports counters, gauges, and histograms with labels
 */

export interface MetricLabels {
  [key: string]: string;
}

export interface MetricValue {
  value: number;
  labels: MetricLabels;
  timestamp?: number;
}

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface Metric {
  name: string;
  type: MetricType;
  help: string;
  values: MetricValue[];
}

export interface HistogramBucket {
  le: number; // less than or equal
  count: number;
}

export interface HistogramValue extends MetricValue {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

/**
 * Metrics registry - singleton storage for all metrics
 */
class MetricsRegistry {
  private metrics: Map<string, Metric> = new Map();

  register(name: string, type: MetricType, help: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        help,
        values: [],
      });
    }
  }

  get(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  increment(name: string, labels: MetricLabels = {}, value = 1): void {
    const metric = this.metrics.get(name);
    if (!metric) return;

    const existing = metric.values.find((v) =>
      this.labelsMatch(v.labels, labels)
    );

    if (existing) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      metric.values.push({ value, labels, timestamp: Date.now() });
    }
  }

  set(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (!metric) return;

    const existing = metric.values.find((v) =>
      this.labelsMatch(v.labels, labels)
    );

    if (existing) {
      existing.value = value;
      existing.timestamp = Date.now();
    } else {
      metric.values.push({ value, labels, timestamp: Date.now() });
    }
  }

  observe(
    name: string,
    value: number,
    labels: MetricLabels = {},
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') return;

    const existing = metric.values.find((v) =>
      this.labelsMatch(v.labels, labels)
    ) as HistogramValue | undefined;

    if (existing) {
      existing.sum += value;
      existing.count++;
      // Update buckets
      existing.buckets.forEach((bucket) => {
        if (value <= bucket.le) {
          bucket.count++;
        }
      });
    } else {
      // Create new histogram entry
      const histogramBuckets: HistogramBucket[] = buckets.map((le) => ({
        le,
        count: value <= le ? 1 : 0,
      }));
      histogramBuckets.push({ le: Infinity, count: 1 }); // +Inf bucket

      metric.values.push({
        value: 0, // not used for histograms
        labels,
        timestamp: Date.now(),
        buckets: histogramBuckets,
        sum: value,
        count: 1,
      } as HistogramValue);
    }
  }

  reset(): void {
    this.metrics.clear();
  }

  private labelsMatch(a: MetricLabels, b: MetricLabels): boolean {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();

    if (keysA.length !== keysB.length) return false;
    if (keysA.join(',') !== keysB.join(',')) return false;

    return keysA.every((key) => a[key] === b[key]);
  }

  /**
   * Export metrics in Prometheus text format
   */
  export(): string {
    const lines: string[] = [];

    this.metrics.forEach((metric) => {
      // HELP line
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      // TYPE line
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Metric values
      metric.values.forEach((value) => {
        if (metric.type === 'histogram') {
          const histValue = value as HistogramValue;
          const labelsStr = this.formatLabels(value.labels);

          // Bucket lines
          histValue.buckets.forEach((bucket) => {
            const bucketLabels = { ...value.labels, le: bucket.le === Infinity ? '+Inf' : String(bucket.le) };
            lines.push(
              `${metric.name}_bucket${this.formatLabels(bucketLabels)} ${bucket.count}`
            );
          });

          // Sum and count
          lines.push(`${metric.name}_sum${labelsStr} ${histValue.sum}`);
          lines.push(`${metric.name}_count${labelsStr} ${histValue.count}`);
        } else {
          // Counter or gauge
          const labelsStr = this.formatLabels(value.labels);
          lines.push(`${metric.name}${labelsStr} ${value.value}`);
        }
      });

      lines.push(''); // Empty line between metrics
    });

    return lines.join('\n');
  }

  private formatLabels(labels: MetricLabels): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';

    const formatted = entries
      .map(([key, value]) => `${key}="${this.escapeLabel(value)}"`)
      .join(',');

    return `{${formatted}}`;
  }

  private escapeLabel(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }
}

// Global singleton registry
const registry = new MetricsRegistry();

/**
 * Counter - monotonically increasing value
 */
export class Counter {
  constructor(
    private name: string,
    private help: string
  ) {
    registry.register(name, 'counter', help);
  }

  inc(labels: MetricLabels = {}, value = 1): void {
    registry.increment(this.name, labels, value);
  }
}

/**
 * Gauge - value that can go up or down
 */
export class Gauge {
  constructor(
    private name: string,
    private help: string
  ) {
    registry.register(name, 'gauge', help);
  }

  set(value: number, labels: MetricLabels = {}): void {
    registry.set(this.name, value, labels);
  }

  inc(labels: MetricLabels = {}, value = 1): void {
    registry.increment(this.name, labels, value);
  }

  dec(labels: MetricLabels = {}, value = 1): void {
    registry.increment(this.name, labels, -value);
  }
}

/**
 * Histogram - distribution of values with configurable buckets
 */
export class Histogram {
  constructor(
    private name: string,
    private help: string,
    private buckets?: number[]
  ) {
    registry.register(name, 'histogram', help);
  }

  observe(value: number, labels: MetricLabels = {}): void {
    registry.observe(this.name, value, labels, this.buckets);
  }
}

/**
 * Export all metrics in Prometheus text format
 */
export function exportMetrics(): string {
  return registry.export();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  registry.reset();
}

/**
 * Timer utility for measuring durations
 */
export function startTimer(): () => number {
  const start = Date.now();
  return () => (Date.now() - start) / 1000; // Return seconds
}
