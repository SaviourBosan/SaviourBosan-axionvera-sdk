/** Supported smart contract capability identifiers. */
export type ContractCapability =
  | 'balance:read'
  | 'assets:read'
  | 'shares:convert'
  | 'assets:deposit'
  | 'assets:withdraw'
  | 'rewards:claim'
  | 'rewards:read';

/** A single callable contract method exposed through discovery metadata. */
export interface ContractMethodDescriptor {
  name: string;
  capability: ContractCapability;
  mutability: 'view' | 'payable' | 'nonpayable';
  description: string;
}

/** Discovery metadata for a supported smart contract type. */
export interface ContractDescriptor {
  type: string;
  displayName: string;
  version: string;
  contractId?: string;
  capabilities: ContractCapability[];
  methods: ContractMethodDescriptor[];
  metadata?: Record<string, unknown>;
}

export interface DiscoveryValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ContractDiscoveryService {
  discoverContracts(): ContractDescriptor[];
  lookupContract(typeOrId: string): ContractDescriptor | undefined;
  getCapabilities(typeOrId: string): ContractCapability[];
  supportsCapability(typeOrId: string, capability: ContractCapability): boolean;
  validateContract(descriptor: ContractDescriptor): DiscoveryValidationResult;
}
