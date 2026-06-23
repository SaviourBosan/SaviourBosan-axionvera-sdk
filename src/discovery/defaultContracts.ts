import type { ContractDescriptor } from './types';

export const VaultContractDescriptor: ContractDescriptor = {
  type: 'vault',
  displayName: 'Axionvera Vault',
  version: '1.0.0',
  capabilities: [
    'balance:read',
    'assets:read',
    'shares:convert',
    'assets:deposit',
    'assets:withdraw',
    'rewards:read',
    'rewards:claim',
  ],
  methods: [
    {
      name: 'getBalance',
      capability: 'balance:read',
      mutability: 'view',
      description: 'Read vault share balance for an account.',
    },
    {
      name: 'getAssetsBalance',
      capability: 'assets:read',
      mutability: 'view',
      description: 'Read the asset-denominated vault balance.',
    },
    {
      name: 'convertToAssets',
      capability: 'shares:convert',
      mutability: 'view',
      description: 'Convert vault shares to assets.',
    },
    {
      name: 'convertToShares',
      capability: 'shares:convert',
      mutability: 'view',
      description: 'Convert assets to vault shares.',
    },
    {
      name: 'deposit',
      capability: 'assets:deposit',
      mutability: 'payable',
      description: 'Deposit assets into the vault.',
    },
    {
      name: 'withdraw',
      capability: 'assets:withdraw',
      mutability: 'nonpayable',
      description: 'Withdraw assets from the vault.',
    },
    {
      name: 'pendingRewards',
      capability: 'rewards:read',
      mutability: 'view',
      description: 'Read pending rewards for an account.',
    },
    {
      name: 'claimRewards',
      capability: 'rewards:claim',
      mutability: 'nonpayable',
      description: 'Claim accrued vault rewards.',
    },
  ],
  metadata: {
    abi: 'VaultABI',
  },
};

export const DefaultContractDescriptors: ContractDescriptor[] = [VaultContractDescriptor];
