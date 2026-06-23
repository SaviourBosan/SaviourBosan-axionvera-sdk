export type ProfilingLevel = 'off' | 'basic' | 'detailed';

export interface ProfilingConfig {
  enabled?: boolean;
  level?: ProfilingLevel;
  now?: () => number;
}

export interface ProfiledCallMetric {
  id: string;
  name: string;
  type: 'contract' | 'rpc' | 'custom';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  success: boolean;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  memoryDeltaBytes?: number;
}

export interface ProfilingReport {
  generatedAt: string;
  enabled: boolean;
  level: ProfilingLevel;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDurationMs: number;
  p95DurationMs: number;
  slowestCall?: ProfiledCallMetric;
  byType: Record<string, {
    count: number;
    averageDurationMs: number;
    maxDurationMs: number;
  }>;
  calls: ProfiledCallMetric[];
}

export interface ProfileOptions {
  type?: ProfiledCallMetric['type'];
  metadata?: Record<string, unknown>;
}

const defaultNow = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const getMemoryUsage = (): number | undefined => {
  if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
    return process.memoryUsage().heapUsed;
  }
  return undefined;
};

export class ProfilingService {
  private enabled: boolean;
  private level: ProfilingLevel;
  private readonly now: () => number;
  private metrics: ProfiledCallMetric[] = [];
  private nextId = 1;

  constructor(config: ProfilingConfig = {}) {
    this.enabled = config.enabled ?? false;
    this.level = config.level ?? (this.enabled ? 'basic' : 'off');
    this.now = config.now ?? defaultNow;
  }

  enable(level: Exclude<ProfilingLevel, 'off'> = 'basic'): void {
    this.enabled = true;
    this.level = level;
  }

  disable(): void {
    this.enabled = false;
    this.level = 'off';
  }

  isEnabled(): boolean {
    return this.enabled && this.level !== 'off';
  }

  clear(): void {
    this.metrics = [];
  }

  getMetrics(): ProfiledCallMetric[] {
    return [...this.metrics];
  }

  async profile<T>(name: string, operation: () => Promise<T>, options: ProfileOptions = {}): Promise<T> {
    if (!this.isEnabled()) {
      return operation();
    }

    const startedAtWall = new Date();
    const start = this.now();
    const memoryStart = this.level === 'detailed' ? getMemoryUsage() : undefined;

    try {
      const result = await operation();
      this.record(name, options, startedAtWall, start, true, undefined, memoryStart);
      return result;
    } catch (error) {
      this.record(
        name,
        options,
        startedAtWall,
        start,
        false,
        error instanceof Error ? error.message : String(error),
        memoryStart
      );
      throw error;
    }
  }

  profileContractCall<T>(contract: string, method: string, operation: () => Promise<T>, metadata: Record<string, unknown> = {}): Promise<T> {
    return this.profile(`${contract}.${method}`, operation, {
      type: 'contract',
      metadata: { contract, method, ...metadata },
    });
  }

  profileRpcCall<T>(method: string, operation: () => Promise<T>, metadata: Record<string, unknown> = {}): Promise<T> {
    return this.profile(method, operation, {
      type: 'rpc',
      metadata: { method, ...metadata },
    });
  }

  generateReport(): ProfilingReport {
    const calls = this.getMetrics();
    const durations = calls.map((call) => call.durationMs).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const p95Index = durations.length === 0 ? -1 : Math.ceil(durations.length * 0.95) - 1;
    const byType: ProfilingReport['byType'] = {};

    for (const call of calls) {
      const bucket = byType[call.type] ?? { count: 0, averageDurationMs: 0, maxDurationMs: 0 };
      bucket.count += 1;
      bucket.averageDurationMs += call.durationMs;
      bucket.maxDurationMs = Math.max(bucket.maxDurationMs, call.durationMs);
      byType[call.type] = bucket;
    }

    for (const bucket of Object.values(byType)) {
      bucket.averageDurationMs = bucket.count === 0 ? 0 : bucket.averageDurationMs / bucket.count;
    }

    return {
      generatedAt: new Date().toISOString(),
      enabled: this.isEnabled(),
      level: this.level,
      totalCalls: calls.length,
      successfulCalls: calls.filter((call) => call.success).length,
      failedCalls: calls.filter((call) => !call.success).length,
      averageDurationMs: calls.length === 0 ? 0 : totalDuration / calls.length,
      p95DurationMs: p95Index < 0 ? 0 : durations[p95Index],
      slowestCall: calls.reduce<ProfiledCallMetric | undefined>(
        (slowest, call) => !slowest || call.durationMs > slowest.durationMs ? call : slowest,
        undefined
      ),
      byType,
      calls,
    };
  }

  private record(
    name: string,
    options: ProfileOptions,
    startedAtWall: Date,
    start: number,
    success: boolean,
    errorMessage?: string,
    memoryStart?: number
  ): void {
    const endedAtWall = new Date();
    const memoryEnd = this.level === 'detailed' ? getMemoryUsage() : undefined;
    const memoryDeltaBytes = memoryStart !== undefined && memoryEnd !== undefined ? memoryEnd - memoryStart : undefined;

    this.metrics.push({
      id: `profile-${this.nextId++}`,
      name,
      type: options.type ?? 'custom',
      startedAt: startedAtWall.toISOString(),
      endedAt: endedAtWall.toISOString(),
      durationMs: Math.max(0, this.now() - start),
      success,
      metadata: options.metadata,
      errorMessage,
      memoryDeltaBytes,
    });
  }
}

export const profilingService = new ProfilingService();
