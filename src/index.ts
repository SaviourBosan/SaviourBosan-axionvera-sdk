// Errors
export {
  AxionveraError,
  NetworkError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  TransactionError,
  RpcError,
  ContractError,
  TimeoutError,
  TransactionTimeoutError,
  InsufficientFundsError,
  InvalidSignatureError,
  InvalidXDRError,
  SimulationError,
  WalletNotInstalledError,
  FaucetRateLimitError,
  InsecureNetworkError,
  NetworkMismatchError,
  AxionveraRPCError,
  SimulationFailedError,
  SlippageToleranceExceededError,
  WalletConnectionError,
  toAxionveraError,
  normalizeRpcError,
  normalizeTransactionError,
  normalizeContractError,
  normalizeSimulationError,
} from './errors/axionveraError';

// Dependency Injection
export {
  ServiceContainer,
  createServiceContainer,
  defaultRpcClientFactory,
  defaultHttpClientFactory,
  defaultLoggerFactory,
  defaultWebSocketManagerFactory,
} from './core/serviceContainer';
export type {
  CoreServices,
  ServiceOverrides,
  RpcClientFactory,
  HttpClientFactory,
  LoggerFactory,
  WebSocketManagerFactory,
  RpcClientFactoryOptions,
  HttpClientFactoryOptions,
  WebSocketManagerFactoryOptions,
  RpcServer,
  HttpClient,
  LoggerService,
  WebSocketManagerService,
} from './core/serviceInterfaces';

// Client
export { StellarClient, HYDRATION_STATE_VERSION } from './client/stellarClient';
export { FaucetClient } from './client/faucetClient';
export type {
  StellarClientOptions,
  GetContractEventsOptions,
  GetContractEventsResult,
  ContractEventResult,
} from './client/stellarClient';
export type { StellarClientOptions } from './client/stellarClient';
export type { LogLevel, CustomLogger } from './utils/logger';
export { MiddlewarePipeline } from './middleware';
export type { Middleware, MiddlewareContext, MiddlewareRegistration, MiddlewareWorkflow, MiddlewareStage, MiddlewarePipelineOptions } from './middleware';
export type {
  StellarClientOptions,
  PendingTransaction,
  TrackedTransaction,
  SerializedPendingTransaction,
  ExportedState,
  TrackTransactionOptions,
  SimulationContext,
  SerializableValue,
} from './client/stellarClient';

// Registry
export { ContractMetadataRegistry, contractMetadataRegistry } from './registry';
export type {
  ContractCapability,
  ContractDeploymentMetadata,
  ContractEnvironment,
  ContractFeature,
  ContractLookupOptions,
  ContractMetadata,
  ContractValidationResult,
} from './registry';

// Contracts
// export { VaultContract } from './contracts/VaultContract';
export { Vault } from './contracts/vault';
export { VaultABI } from './contracts/abis/VaultABI';
export type { VaultConfig, DepositParams, WithdrawParams, VaultInfo } from './contracts/vault';


// Discovery
export { DefaultContractDiscoveryService, contractDiscovery, DefaultContractDescriptors, VaultContractDescriptor } from './discovery';
export { CapabilityRegistry } from './registry';
export type { ContractCapability, ContractDescriptor, ContractDiscoveryService, ContractMethodDescriptor, DiscoveryValidationResult } from './discovery';

// Wallet
export { LocalKeypairWalletConnector } from './wallet/walletConnector';
export { LocalKeypairWalletConnector, MockWalletConnector } from './wallet/walletConnector';
export { BrowserWalletConnector } from './wallet/browserWalletConnector';
export { MockWalletConnector } from './wallet/mockWalletConnector';
export type { WalletConnector } from './wallet/walletConnector';

// Utils
export { ConcurrencyQueue, createConcurrencyControlledClient } from './utils/concurrencyQueue';
export { retry, createHttpClientWithRetry } from './utils/httpInterceptor';
export {
  buildContractCallOperation,
  buildContractCallTransaction,
  buildBaseTransaction,
  toScVal,
  ContractCallBuilder,
} from './utils/transactionBuilder';
export type {
  BuildBaseTransactionParams,
  BuildContractCallParams,
  ContractCallArg,
} from './utils/transactionBuilder';
export {
  buildContractCallOperation,
  buildContractCallTransaction,
  buildBaseTransaction,
  bumpTransactionFee,
  toScVal,
} from './utils/transactionBuilder';
export type {
  BuildBaseTransactionParams,
  BumpTransactionFeeOptions,
} from './utils/transactionBuilder';
export {
  getDefaultRpcUrl,
  getNetworkPassphrase,
  resolveNetworkConfig,
} from './utils/networkConfig';
export { generateTransactionURI, generatePayURI } from './utils/sep7';
export { getRequiredSigners } from './utils/getRequiredSigners';
export { verifyWebhookSignature } from './utils/webhooks';
export { parseEvents, decodeSorobanSymbol } from './utils/soroban';
export type { ParsedEvent, ParseEventsOptions, DecodedTopic } from './utils/soroban';
export { isValidXDR, assertValidXDR, MAX_XDR_STRING_LENGTH } from './utils/xdrValidator';


// Profiling
export { ProfilingService, profilingService } from './profiling';
export type { ProfileOptions, ProfiledCallMetric, ProfilingConfig, ProfilingLevel, ProfilingReport } from './profiling';

// Testing & MSW
// export * from './test/msw/setup';
// export * from './test/msw/handlers';
// export { server } from './test/msw/server';
export * from './test/msw/setup';
export * from './test/msw/handlers';
export { server } from './test/msw/server';

// Replay Framework
export { InteractionRecorder, ReplayEngine, ReplayValidator } from './replay';
export type {
  ContractHandlers,
  RecordedInteraction,
  RecordingMetadata,
  ReplaySession,
  ReplayResult,
  ValidationResult,
  ReplayValidationReport,
  ReplayOptions,
} from './replay';
