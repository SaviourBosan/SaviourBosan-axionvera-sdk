import { CloudWatchConfig, LogEntry } from './types';

/** AWS SDK CloudWatch Logs client interface */
interface CloudWatchLogsClientType {
  send<T = any>(command: unknown): Promise<T>;
}

/** AWS SDK client configuration for CloudWatch */
interface AwsClientConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/** CloudWatch PutLogEvents parameters */
interface PutLogEventsParams {
  logGroupName: string;
  logStreamName: string;
  logEvents: Array<{
    timestamp: number;
    message: string;
  }>;
  sequenceToken?: string;
}

/** CloudWatch PutLogEvents result */
interface PutLogEventsResult {
  nextSequenceToken?: string;
}

type ResolvedCloudWatchConfig = CloudWatchConfig & {
  logStreamName: string;
  region: string;
  batchSize: number;
  flushIntervalMs: number;
  maxRetries: number;
};

export class CloudWatchLogger {
  private client: CloudWatchLogsClientType | null = null;
  private logQueue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sequenceToken: string | null = null;
  private isInitialized = false;
  private isDestroyed = false;

  private readonly config: ResolvedCloudWatchConfig;

  constructor(config: CloudWatchConfig) {
    this.config = {
      logGroupName: config.logGroupName,
      logStreamName: config.logStreamName || `axionvera-sdk-${Date.now()}`,
      region: config.region || 'us-east-1',
      accessKeyId: config.accessKeyId || '',
      secretAccessKey: config.secretAccessKey || '',
      batchSize: config.batchSize || 100,
      flushIntervalMs: config.flushIntervalMs || 5000,
      maxRetries: config.maxRetries || 3,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isDestroyed) return;

    try {
      // Lazy load CloudWatch client
      const { CloudWatchLogsClient } = await import('@aws-sdk/client-cloudwatch-logs');
      
      const clientConfig: AwsClientConfig = {
        region: this.config.region,
      };

      if (this.config.accessKeyId && this.config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        };
      }

      this.client = new CloudWatchLogsClient(clientConfig as any) as CloudWatchLogsClientType;

      // Ensure log group exists
      await this.ensureLogGroup();

      // Ensure log stream exists
      await this.ensureLogStream();

      // Start flush timer
      this.startFlushTimer();

      this.isInitialized = true;
    } catch (error: unknown) {
      console.error('Failed to initialize CloudWatch logger:', error);
      throw error;
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.logQueue.push(entry);

    // Flush immediately if queue is full
    if (this.logQueue.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.client || this.logQueue.length === 0) {
      return;
    }

    const batch = this.logQueue.splice(0, this.config.batchSize);
    
    try {
      const logEvents = batch.map(entry => ({
        timestamp: entry.timestamp,
        message: JSON.stringify({
          level: entry.level,
          message: entry.message,
          metadata: entry.metadata,
        }),
      }));

      const params: PutLogEventsParams = {
        logGroupName: this.config.logGroupName,
        logStreamName: this.config.logStreamName,
        logEvents,
      };

      if (this.sequenceToken) {
        params.sequenceToken = this.sequenceToken;
      }

      const result = await this.putLogEventsWithRetry(params);
      
      if (result.nextSequenceToken) {
        this.sequenceToken = result.nextSequenceToken;
      }

    } catch (error: unknown) {
      console.error('Failed to flush logs to CloudWatch:', error);
      // Re-add failed logs to the front of the queue for retry
      this.logQueue.unshift(...batch);
    }
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining logs
    await this.flush();
    
    this.client = null;
  }

  private async ensureLogGroup(): Promise<void> {
    try {
      const { CreateLogGroupCommand } = await import('@aws-sdk/client-cloudwatch-logs');
      await this.client!.send(new CreateLogGroupCommand({
        logGroupName: this.config.logGroupName,
      }));
    } catch (error: unknown) {
      // Log group already exists - check for specific error type
      const err = error as Record<string, unknown> | null;
      if (err && typeof err === 'object' && err.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }

  private async ensureLogStream(): Promise<void> {
    try {
      const { CreateLogStreamCommand } = await import('@aws-sdk/client-cloudwatch-logs');
      await this.client!.send(new CreateLogStreamCommand({
        logGroupName: this.config.logGroupName,
        logStreamName: this.config.logStreamName,
      }));
    } catch (error: unknown) {
      // Log stream already exists
      const err = error as Record<string, unknown> | null;
      if (err && typeof err === 'object' && err.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }

  private async putLogEventsWithRetry(
    params: PutLogEventsParams,
    attempt = 1
  ): Promise<PutLogEventsResult> {
    try {
      const { PutLogEventsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
      const result = await this.client!.send(new PutLogEventsCommand(params as any));
      return result as PutLogEventsResult;
    } catch (error: unknown) {
      if (attempt >= this.config.maxRetries) {
        throw error;
      }

      const err = error as Record<string, unknown> | null;
      
      // Handle invalid sequence token by fetching the latest
      if (err && typeof err === 'object' && err.name === 'InvalidSequenceTokenException') {
        const { DescribeLogStreamsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
        const command = new DescribeLogStreamsCommand({
          logGroupName: this.config.logGroupName,
          logStreamNamePrefix: this.config.logStreamName,
        });
        
        const response = await this.client!.send(command);
        const logStreams = response.logStreams as Array<Record<string, unknown> | undefined> | undefined;
        const stream = logStreams?.find(
          (s?: Record<string, unknown>) => s?.logStreamName === this.config.logStreamName
        );
        
        if (stream && stream.uploadSequenceToken && typeof stream.uploadSequenceToken === 'string') {
          params.sequenceToken = stream.uploadSequenceToken;
        }
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.putLogEventsWithRetry(params, attempt + 1);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Error in scheduled flush:', error);
      });
    }, this.config.flushIntervalMs);
  }

  getQueueSize(): number {
    return this.logQueue.length;
  }

  isReady(): boolean {
    return this.isInitialized && !this.isDestroyed;
  }
}
