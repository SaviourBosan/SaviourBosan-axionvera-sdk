import {
    Account,
Address,
Contract,
FeeBumpTransaction,
Keypair,
nativeToScVal,
scValToNative,
rpc,
SorobanDataBuilder,
Transaction,
TransactionBuilder,
xdr
} from "@stellar/stellar-sdk";

import {
AxionveraNetwork,
getNetworkPassphrase,
resolveNetworkConfig
} from "../utils/networkConfig";
import { ConcurrencyConfig, DEFAULT_CONCURRENCY_CONFIG, createConcurrencyControlledClient } from "../utils/concurrencyQueue";
import { RetryConfig, createHttpClientWithRetry, retry } from "../utils/httpInterceptor";
import {
NetworkError,
toAxionveraError,
InsecureNetworkError,
AxionveraError,
TransactionTimeoutError,
ValidationError
} from "../errors/axionveraError";
import { LogLevel, Logger } from "../utils/logger";
import { WebSocketManager, EventFilter, SorobanEvent, WebSocketConfig } from "./websocket";
import { CloudWatchConfig } from "../utils/logging/cloudwatch";
import {
validateRpcResponse,
GetHealthResponseSchema,
SimulateTransactionResponseSchema,
GetTransactionResponseSchema,
ValidatedGetHealthResponse,
ValidatedGetTransactionResponse,
} from "../utils/rpcSchemas";
import {
FetchTransactionHistoryOptions,
TransactionHistoryResult,
parseTransaction,
sortByTimestamp,
filterByActionType
} from "../utils/transactionHistory";
import { parseSorobanEvent, ParsedSorobanEvent } from "../utils/sorobanEventParser";

const DEFAULT_FEE_BUFFER_MULTIPLIER = 1.15;

/**
* Checks if a URL points to a localhost address.
*/
function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname === '::1';
  } catch {
    return false;
  }
}

export type StellarClientOptions = {
  network?: AxionveraNetwork;
  rpcUrl?: string;
  networkPassphrase?: string;
  rpcClient?: rpc.Server;
  concurrencyConfig?: Partial<ConcurrencyConfig>;
  retryConfig?: Partial<RetryConfig>;
  logLevel?: LogLevel;
  webSocketConfig?: WebSocketConfig;
  cloudWatchConfig?: CloudWatchConfig;
  customHeaders?: Record<string, string>;
  feeBufferMultiplier?: number;
  maxFeeLimit?: number;
  allowHttp?: boolean;
  accountFetchTimeoutMs?: number;
  cacheTtlMs?: number;
};

export type TransactionSendResult = {
  hash: string;
  status: string;
  raw: unknown;
};

export type GetContractEventsOptions = {
  startLedger?: number;
  endLedger?: number;
  limit?: number;
  cursor?: string;
  fetchAll?: boolean;
  startTime?: Date | string | number | "last24Hours";
};

export type GetContractEventsResult = {
  events: ParsedSorobanEvent[];
  pagingToken?: string;
};

/** Snapshot version for forward-compatibility of (de)serialized state. */
export const HYDRATION_STATE_VERSION = 1 as const;

export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | Date
  | SerializableValue[]
  | { [key: string]: SerializableValue };

export type SimulationContext = { [key: string]: SerializableValue };

export interface PendingTransaction {
  hash: string;
  simulationContext?: SimulationContext;
  submittedAt: Date;
  intervalMs: number;
  deadline: Date;
  label?: string;
}

export interface TrackedTransaction extends PendingTransaction {
  promise: Promise<unknown>;
  cancel: () => void;
}

export interface SerializedPendingTransaction {
  hash: string;
  simulationContext?: SimulationContext;
  submittedAt: string;
  intervalMs: number;
  deadline: string;
  label?: string;
}

export interface ExportedState {
  version: typeof HYDRATION_STATE_VERSION;
  exportedAt: string;
  pending: SerializedPendingTransaction[];
}

export interface TrackTransactionOptions {
  hash: string;
  simulationContext?: SimulationContext;
  intervalMs?: number;
  timeoutMs?: number;
  deadline?: Date;
  label?: string;
}

const DATE_MARKER = "__date" as const;

function freezeDates(value: SerializableValue): SerializableValue {
  if (value instanceof Date) return { [DATE_MARKER]: value.toISOString() };
  if (Array.isArray(value)) return value.map((item) => freezeDates(item));
  if (value !== null && typeof value === "object") {
    const out: { [key: string]: SerializableValue } = {};
    for (const key of Object.keys(value)) {
      out[key] = freezeDates((value as { [key: string]: SerializableValue })[key] as SerializableValue);
    }
    return out;
  }
  return value;
}

function thawDates(value: SerializableValue): SerializableValue {
  if (Array.isArray(value)) return value.map((item) => thawDates(item));
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const obj = value as { [key: string]: SerializableValue };
    const marker = obj[DATE_MARKER];
    if (typeof marker === "string" && Object.keys(obj).length === 1) {
      const parsed = new Date(marker);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const out: { [key: string]: SerializableValue } = {};
    for (const key of Object.keys(obj)) {
      out[key] = thawDates(obj[key] as SerializableValue);
    }
    return out;
  }
  return value;
}

function freezeContext(ctx: SimulationContext | undefined): SimulationContext | undefined {
  if (!ctx) return undefined;
  return freezeDates(ctx) as SimulationContext;
}

function thawContext(ctx: SimulationContext | undefined): SimulationContext | undefined {
  if (!ctx) return undefined;
  return thawDates(ctx) as SimulationContext;
}

type TransactionResponseRecord = Record<string, unknown>;

export type TransactionPollResult = TransactionResponseRecord & {
  status: string;
  ledger: number | null;
};

export abstract class BaseStellarRpcClient {
  abstract executeWithErrorHandling<T>(action: () => Promise<T>, message: string): Promise<T>;
}

export class StellarClient extends BaseStellarRpcClient {
  readonly network: AxionveraNetwork;
  readonly rpcUrl: string;
  readonly networkPassphrase: string;
  readonly rpc: rpc.Server;
  readonly httpClient;
  readonly retryConfig: Partial<RetryConfig>;
  private readonly concurrencyConfig: ConcurrencyConfig;
  private readonly concurrencyEnabled: boolean;
  private readonly logger: Logger;
  private webSocketManager: WebSocketManager | null = null;
  private readonly pendingTransactions = new Map<string, TrackedTransaction>();
  readonly accountFetchTimeoutMs: number;
  readonly cacheTtlMs: number;
  private accountSequenceCache: Map<string, { sequence: bigint; timestamp: number }>;
  private readonly feeBufferMultiplier: number;
  private readonly maxFeeLimit?: bigint;

  constructor(options?: StellarClientOptions) {
    const config = resolveNetworkConfig(options);
    const rpcUrl = config.rpcUrl;
    const network = config.network;
    const networkPassphrase = config.networkPassphrase;

    if (!rpcUrl.startsWith('http://') && !rpcUrl.startsWith('https://')) {
      throw new AxionveraError('RPC URL must include a protocol (http:// or https://)');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const isHttp = rpcUrl.startsWith('http://');
    const isLocalhost = isLocalhostUrl(rpcUrl);
    const allowHttp = options?.allowHttp ?? false;

    if (isProduction && isHttp && !isLocalhost && !allowHttp) {
      throw new InsecureNetworkError(
        'Insecure RPC connection in production: HTTP endpoint detected. ' +
        'Use HTTPS for production or set allowHttp: true to override.'
      );
    }

    super();

    this.network = network;
    this.rpcUrl = rpcUrl;
    this.networkPassphrase = networkPassphrase;
    this.concurrencyConfig = { ...DEFAULT_CONCURRENCY_CONFIG, ...options?.concurrencyConfig };
    this.concurrencyEnabled = !!options?.concurrencyConfig;
    this.retryConfig = options?.retryConfig ?? {};
    this.httpClient = createHttpClientWithRetry(this.retryConfig);
    this.logger = new Logger(options?.logLevel ?? 'none', options?.cloudWatchConfig);
    this.accountFetchTimeoutMs = options?.accountFetchTimeoutMs ?? 2000;
    this.cacheTtlMs = options?.cacheTtlMs ?? 5000;
    this.accountSequenceCache = new Map();
    this.feeBufferMultiplier = options?.feeBufferMultiplier ?? DEFAULT_FEE_BUFFER_MULTIPLIER;

    if (!Number.isFinite(this.feeBufferMultiplier) || this.feeBufferMultiplier < 1) {
      throw new ValidationError("feeBufferMultiplier must be a finite number greater than or equal to 1");
    }

    if (options?.maxFeeLimit !== undefined) {
      if (!Number.isInteger(options.maxFeeLimit) || options.maxFeeLimit <= 0) {
        throw new ValidationError("maxFeeLimit must be a positive integer");
      }
      this.maxFeeLimit = BigInt(options.maxFeeLimit);
    }

    this.logger.info(`Initializing StellarClient for ${this.network} at ${this.rpcUrl}`);

    if (options?.webSocketConfig) {
      this.webSocketManager = new WebSocketManager(this.rpcUrl, options.webSocketConfig, {
          onEvent: (event) => this.logger.debug('WebSocket event received:', event),
          onConnectionChange: (connected) => this.logger.debug(`WebSocket connection changed: ${connected}`),
          logger: this.logger,
      });
    }

    if (options?.rpcClient) {
      this.rpc = options.rpcClient;
    } else {
      const allowHttp = this.rpcUrl.startsWith("http://");
      const baseRpc = new rpc.Server(this.rpcUrl, { allowHttp });
      this.rpc = this.concurrencyEnabled ? createConcurrencyControlledClient(baseRpc, this.concurrencyConfig) : baseRpc;
    }
  }

  async getHealth(): Promise<ValidatedGetHealthResponse> {
    this.logger.debug("Fetching network health");
    return this.executeWithErrorHandling(async () => {
      const response = await retry(() => this.rpc.getHealth(), this.retryConfig);
      return validateRpcResponse(GetHealthResponseSchema, response, 'getHealth');
    }, "Failed to fetch network health");
  }

  async getNetwork(): Promise<unknown> {
    this.logger.debug("Fetching network configuration");
    return this.executeWithErrorHandling(
      () => retry(() => this.rpc.getNetwork(), this.retryConfig),
      "Failed to fetch network configuration"
    );
  }

  async getLatestLedger(): Promise<unknown> {
    this.logger.debug("Fetching latest ledger");
    return this.executeWithErrorHandling(
      () => retry(() => this.rpc.getLatestLedger(), this.retryConfig),
      "Failed to fetch latest ledger"
    );
  }

  async getContractEvents(
    contractId: string,
    topicFilters?: string[][],
    options: GetContractEventsOptions = {}
  ): Promise<GetContractEventsResult> {
    this.logger.debug(`Fetching contract events for ${contractId}`);
    return this.executeWithErrorHandling(async () => {
      const endLedger = await this.resolveEndLedger(options.endLedger);
      const startLedger = this.resolveStartLedger(options, endLedger);
      const normalizedStartLedger = Math.min(startLedger, endLedger);
      const normalizedEndLedger = Math.max(startLedger, endLedger);

      const result = await this.fetchContractEventsRange({
        contractId,
        topicFilters,
        startLedger: normalizedStartLedger,
        endLedger: normalizedEndLedger,
        limit: options.limit,
        cursor: options.cursor,
        fetchAll: options.fetchAll ?? false
      });

      return {
        ...result,
        events: result.events.map((e) => parseSorobanEvent(e))
      };
    }, `Failed to fetch contract events for ${contractId}`);
  }

  async getAccount(publicKey: string): Promise<Account> {
    this.logger.debug(`Fetching account ${publicKey}`);
    return this.executeWithErrorHandling(
      () => retry(() => this.rpc.getAccount(publicKey), this.retryConfig),
      `Failed to fetch account ${publicKey}`
    );
  }

  async getAccountWithCache(publicKey: string): Promise<Account> {
    try {
      const account = await this.getAccountWithTimeout(publicKey, this.accountFetchTimeoutMs);
      this.updateCache(publicKey, account.sequenceNumber().toString());
      return account;
    } catch (error) {
      const cached = this.getCachedSequence(publicKey);
      if (cached) {
        this.logger.debug(`Using cached sequence for ${publicKey}: ${cached.sequence}`);
        const newSequence = cached.sequence + 1n;
        this.updateCache(publicKey, newSequence.toString());
        return new Account(publicKey, newSequence.toString());
      }
      throw new AxionveraError(`Failed to fetch account and no valid cache available for ${publicKey}`, { originalError: error });
    }
  }

  private async getAccountWithTimeout(publicKey: string, timeoutMs: number): Promise<Account> {
    return Promise.race([
      this.getAccount(publicKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Account fetch timeout after ${timeoutMs}ms`)), timeoutMs)
)
]);
}

private updateCache(publicKey: string, sequence: string): void {
    this.accountSequenceCache.set(publicKey, {
      sequence: BigInt(sequence),
      timestamp: Date.now()
    });
  }

  private getCachedSequence(publicKey: string): { sequence: bigint; timestamp: number } | undefined {
    const cached = this.accountSequenceCache.get(publicKey);
    if (!cached) return undefined;
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTtlMs) {
      this.accountSequenceCache.delete(publicKey);
      return undefined;
    }
    return cached;
  }

  clearCache(publicKey?: string): void {
    if (publicKey) this.accountSequenceCache.delete(publicKey);
    else this.accountSequenceCache.clear();
  }

  handleSubmissionError(error: unknown, publicKey?: string): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sequenceErrorPatterns = ['tx_bad_seq', 'bad sequence', 'sequence number', 'sequence mismatch'];
    const isSequenceError = sequenceErrorPatterns.some(pattern => errorMessage.toLowerCase().includes(pattern));

    if (isSequenceError) {
      this.logger.warn(`Sequence error detected, clearing cache for ${publicKey || 'all accounts'}`);
      this.clearCache(publicKey);
      return true;
    }
    return false;
  }

  cleanupExpiredCache(): number {
    let removed = 0;
    const now = Date.now();
    for (const [publicKey, cached] of this.accountSequenceCache.entries()) {
      if (now - cached.timestamp > this.cacheTtlMs) {
        this.accountSequenceCache.delete(publicKey);
        removed++;
      }
    }
    if (removed > 0) this.logger.debug(`Cleaned up ${removed} expired cache entries`);
    return removed;
  }

  async submitTransactionsSequentially(
    transactions: (Transaction | FeeBumpTransaction)[],
    options?: { onProgress?: (index: number, result: TransactionSendResult) => void; sourcePublicKey?: string; }
  ): Promise<TransactionSendResult[]> {
    const results: TransactionSendResult[] = [];
    for (let i = 0; i < transactions.length; i++) {
      try {
        const result = await this.sendTransaction(transactions[i]);
        results.push(result);
        if (options?.onProgress) options.onProgress(i, result);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        const wasSequenceError = this.handleSubmissionError(error, options?.sourcePublicKey);
        throw new Error(`Transaction ${i + 1}/${transactions.length} failed${wasSequenceError ? ' (cache cleared due to sequence error)' : ''}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return results;
  }

  async validateFee(
    transaction: Transaction,
    options?: { minFee?: number; maxFee?: number; simulate?: boolean; }
  ): Promise<number> {
    const simulate = options?.simulate ?? true;
    const minFee = options?.minFee ?? 100_000;
    const maxFee = options?.maxFee ?? 1_000_000;
    const currentFee = parseInt(transaction.fee);

    if (currentFee < minFee) throw new Error(`Transaction fee ${currentFee} is below minimum ${minFee}`);
    if (currentFee > maxFee) throw new Error(`Transaction fee ${currentFee} exceeds maximum ${maxFee}`);

    if (simulate) {
      try {
        const simulation = await this.simulateTransaction(transaction);
        if (rpc.Api.isSimulationSuccess(simulation)) {
          const minResourceFee = simulation.minResourceFee ?? 100_000;
          const recommendedFee = parseInt(minResourceFee.toString());
          if (recommendedFee > currentFee * 1.2) {
            this.logger.info(`Recommended fee ${recommendedFee} is significantly higher than current ${currentFee}`);
            return recommendedFee;
          }
        }
      } catch (error) {
        this.logger.warn(`Fee simulation failed, using original fee: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return currentFee;
  }

  async simulateTransaction(tx: Transaction | FeeBumpTransaction): Promise<rpc.Api.SimulateTransactionResponse> {
    this.logger.debug("Simulating transaction");
    return this.executeWithErrorHandling(async () => {
      const response = await this.rpc.simulateTransaction(tx);
      validateRpcResponse(SimulateTransactionResponseSchema, response, 'simulateTransaction');
      return response;
    }, "Failed to simulate transaction");
  }

  async simulateBatch(params: {
    operations: xdr.Operation[];
    sourceAccount: Account;
    fee?: number;
    timeoutInSeconds?: number;
  }): Promise<rpc.Api.SimulateTransactionResponse['result']> {
    this.logger.debug(`Simulating batch of ${params.operations.length} operations`);
    return this.executeWithErrorHandling(async () => {
      if (!params.operations || params.operations.length === 0) throw new AxionveraError('At least one operation is required for batch simulation');
      const operationCount = params.operations.length;
      const feePerOperation = params.fee ?? 100_000;
      const totalFee = (feePerOperation * operationCount).toString();
      const timeoutInSeconds = params.timeoutInSeconds ?? 60;
      const builder = new TransactionBuilder(params.sourceAccount, { fee: totalFee, networkPassphrase: this.networkPassphrase });
      for (const operation of params.operations) builder.addOperation(operation);
      const tx = builder.setTimeout(timeoutInSeconds).build();
      const result = await retry(() => this.rpc.simulateTransaction(tx), this.retryConfig);
      if (!result.result) throw new NetworkError('No results returned from batch simulation');
      return result.result;
    }, `Failed to simulate batch of ${params.operations.length} operations`);
  }

  async simulateRead(contractId: string, method: string, args?: any[]): Promise<xdr.ScVal> {
    this.logger.debug(`Simulating read-only call to ${contractId}.${method}`);
    return this.executeWithErrorHandling(async () => {
      const dummyAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH", "0");
      const scVals = args ? args.map(arg => {
        if (typeof arg === 'string') {
          try { return Address.fromString(arg).toScVal(); }
          catch { return nativeToScVal(arg); }
        } else if (typeof arg === 'number' || typeof arg === 'bigint') return nativeToScVal(arg);
        else if (typeof arg === 'boolean') return nativeToScVal(arg);
        else if (arg === null || arg === undefined) return xdr.ScVal.scvVoid();
        else return nativeToScVal(arg);
      }) : [];

      const contract = new Contract(contractId);
      const operation = contract.call(method, ...scVals);
      const tx = new TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: this.networkPassphrase })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulationResult = await this.rpc.simulateTransaction(tx);
      if (simulationResult.error) throw new NetworkError(`Simulation failed: ${simulationResult.error}`);
      if (!simulationResult.result) throw new NetworkError('No result returned from simulation');

      return simulationResult.result.retval;
    }, `Failed read-only simulation for ${contractId}.${method}`);
  }
}