export interface TelemetryConfig {
  enabled: boolean;
  /** Anonymize all collected data */
  anonymize: boolean;
  /** Maximum number of events to buffer before flush */
  bufferSize: number;
  /** Auto-flush interval in milliseconds */
  flushIntervalMs: number;
  /** Application identifier for multi-app deployments */
  appId?: string;
  /** SDK version for version-aware metrics */
  sdkVersion?: string;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: false,
  anonymize: true,
  bufferSize: 50,
  flushIntervalMs: 30000,
};

export interface TelemetryEvent {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, any>;
  /** Whether the event has been anonymized */
  anonymized: boolean;
}

export interface MetricCounter {
  name: string;
  value: number;
  tags: Record<string, string>;
}

export interface MetricGauge {
  name: string;
  value: number;
  tags: Record<string, string>;
}

export interface MetricHistogram {
  name: string;
  values: number[];
  tags: Record<string, string>;
  buckets: number[];
}

export interface MetricsSnapshot {
  timestamp: number;
  counters: MetricCounter[];
  gauges: MetricGauge[];
  histograms: MetricHistogram[];
}
