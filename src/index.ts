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

// Contracts
// export { VaultContract } from './contracts/VaultContract';
export { Vault } from './contracts/vault';
export { VaultABI } from './contracts/abis/VaultABI';
export type { VaultConfig, DepositParams, WithdrawParams, VaultInfo } from './contracts/vault';

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

// Transaction Lifecycle Tracking
export { TransactionLifecycleState, LifecycleStateMachine } from './lifecycle';
export type { LifecycleTransitionRecord } from './lifecycle';
export { InvalidLifecycleTransitionError, TransactionNotTrackedError } from './lifecycle';
export { LifecycleEventEmitter } from './events';
export type {
  LifecycleEvent,
  LifecycleEventType,
  LifecycleEventListener,
  LifecycleEventFilter,
} from './events';
export { TransactionLifecycleManager } from './transactions';
export type {
  TransactionLifecycleRecord,
  CreateTransactionOptions,
  TransactionStatusQuery,
} from './transactions';

// Offline Transaction Creation Workflow
export { OfflineTransactionBuilder, MAX_OPERATIONS_PER_TRANSACTION } from './transactions';
export { OFFLINE_TRANSACTION_PACKAGE_VERSION } from './transactions';
export type {
  OfflineSourceAccount,
  OfflineTransactionBuilderOptions,
  OfflineTransactionValidationResult,
  OfflineTransactionPackage,
} from './transactions';

// Contract Schema Validation Framework
export { SchemaValidationError } from './errors/axionveraError';
export type { SchemaValidationErrorOptions } from './errors/axionveraError';
export {
  ContractValidationEngine,
  defaultValidationEngine,
  validateAgainstSchema,
  withSchemaValidation,
  customRule,
  positiveBigIntSchema,
  nonNegativeBigIntSchema,
  nonEmptyStringSchema,
  stellarAccountIdSchema,
  stellarContractIdSchema,
  numberInRangeSchema,
} from './validation';
export type {
  AnyValidationSchema,
  ContractMethodSchema,
  ValidationIssue,
  ValidationKind,
} from './types/validation';
export {
  VAULT_CONTRACT_ID,
  VaultDepositParamsSchema,
  VaultWithdrawParamsSchema,
  VaultInfoResultSchema,
  VaultBalanceResultSchema,
} from './contracts/contractSchemas';

// Contract Migration Support Toolkit
export { MigrationStateValidationError, MigrationPathNotFoundError } from './errors/axionveraError';
export type { MigrationStateValidationErrorOptions } from './errors/axionveraError';
export {
  MigrationRegistry,
  defaultMigrationRegistry,
  MigrationStateValidator,
  defaultMigrationStateValidator,
  MigrationRunner,
  defaultMigrationRunner,
  summarizeMigrationReport,
  serializeMigrationReport,
  MigrationStatus,
  MigrationStepStatus,
} from './migrations';
export type {
  AnyMigrationStep,
  MigrationContext,
  MigrationPlan,
  MigrationReport,
  MigrationStepDefinition,
  MigrationStepResult,
  RunMigrationOptions,
  RunMigrationResult,
} from './migrations';
export {
  VAULT_MIGRATION_CONTRACT_ID,
  VaultStateV1Schema,
  VaultStateV2Schema,
  VaultStateV3Schema,
  vaultV1ToV2Migration,
  vaultV2ToV3Migration,
} from './contracts/contractMigrations';
export type { VaultStateV1, VaultStateV2, VaultStateV3 } from './contracts/contractMigrations';
