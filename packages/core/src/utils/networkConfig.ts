import { Networks } from "@stellar/stellar-sdk";

/**
 * Supported Axionvera networks.
 */
export type AxionveraNetwork = "testnet" | "mainnet" | "futurenet";

/**
 * Configuration for network connections.
 */
export type NetworkConfig = {
  /** The network identifier */
  network: AxionveraNetwork;
  /** The RPC URL(s) for the network (can be single or multiple for failover) */
  rpcUrls: string[];
  /** The network passphrase for transaction signing */
  networkPassphrase: string;
};

const DEFAULT_RPC_URLS: Record<AxionveraNetwork, string[]> = {
  testnet: ["https://soroban-testnet.stellar.org"],
  mainnet: ["https://soroban-mainnet.stellar.org"],
  futurenet: ["https://rpc-futurenet.stellar.org"]
};

/**
 * Gets the network passphrase for a given network.
 * @param network - The network identifier
 * @returns The network passphrase
 */
export function getNetworkPassphrase(network: AxionveraNetwork): string {
  switch (network) {
    case "testnet":
      return Networks.TESTNET;
    case "mainnet":
      return Networks.PUBLIC;
    case "futurenet":
      return Networks.FUTURENET;
  }
}

/**
 * Gets the default RPC URLs for a given network.
 * @param network - The network identifier
 * @returns The default RPC URLs array
 */
export function getDefaultRpcUrls(network: AxionveraNetwork): string[] {
  return DEFAULT_RPC_URLS[network];
}

/**
 * @deprecated Use getDefaultRpcUrls instead
 */
export function getDefaultRpcUrl(network: AxionveraNetwork): string {
  return DEFAULT_RPC_URLS[network][0];
}

/**
 * Resolves network configuration from input options.
 * Fills in defaults for any missing values.
 * @param input - Optional network configuration overrides
 * @returns The resolved network configuration
 */
export function resolveNetworkConfig(input?: {
  network?: AxionveraNetwork;
  rpcUrl?: string;
  rpcUrls?: string[];
  networkPassphrase?: string;
}): NetworkConfig {
  const network = input?.network ?? "testnet";
  const networkPassphrase =
    input?.networkPassphrase ?? getNetworkPassphrase(network);
  
  let rpcUrls: string[];
  if (input?.rpcUrls && input.rpcUrls.length > 0) {
    rpcUrls = input.rpcUrls;
  } else if (input?.rpcUrl) {
    rpcUrls = [input.rpcUrl];
  } else {
    rpcUrls = getDefaultRpcUrls(network);
  }

  return { network, rpcUrls, networkPassphrase };
}
