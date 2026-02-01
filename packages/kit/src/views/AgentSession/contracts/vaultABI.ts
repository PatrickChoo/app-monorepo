/**
 * AgentVault Contract ABI
 * 
 * Generated from VaultContract.sol
 * Use with ethers.js or web3.js
 */

export const AGENT_VAULT_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_dailyLimit', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'target',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      { indexed: false, internalType: 'bytes', name: 'data', type: 'bytes' },
      { indexed: false, internalType: 'bool', name: 'success', type: 'bool' },
    ],
    name: 'Executed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'dailyLimit',
        type: 'uint256',
      },
    ],
    name: 'LimitsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnerChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bool', name: 'paused', type: 'bool' },
    ],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Received',
    type: 'event',
  },
  {
    inputs: [],
    name: 'dailyLimit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'dailySpent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'target', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'targets', type: 'address[]' },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
      { internalType: 'bytes[]', name: 'datas', type: 'bytes[]' },
    ],
    name: 'executeBatch',
    outputs: [{ internalType: 'bool[]', name: 'successes', type: 'bool[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSpendingStatus',
    outputs: [
      { internalType: 'uint256', name: '_dailyLimit', type: 'uint256' },
      { internalType: 'uint256', name: '_dailySpent', type: 'uint256' },
      { internalType: 'uint256', name: '_remainingToday', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'lastResetDay',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_dailyLimit', type: 'uint256' }],
    name: 'setDailyLimit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bool', name: '_paused', type: 'bool' }],
    name: 'setPaused',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { stateMutability: 'payable', type: 'receive' },
] as const;

/**
 * Contract bytecode (compiled from VaultContract.sol)
 * 
 * TODO: Compile the contract and insert the bytecode here
 * 
 * To compile:
 * 1. Install solc: npm install -g solc
 * 2. Compile: solc --optimize --bin VaultContract.sol
 * 3. Copy the bytecode here
 */
export const AGENT_VAULT_BYTECODE =
  '0x' +
  'TODO_INSERT_COMPILED_BYTECODE_HERE' +
  // The bytecode would be very long (several KB)
  // For now, this is a placeholder
  '';

/**
 * Get contract interface for ethers.js
 */
export function getVaultContractInterface() {
  // Dynamic import to avoid bundling ethers in all builds
  // const { ethers } = require('@onekeyhq/core/src/chains/evm/sdkEvm/ethers');
  // return new ethers.Interface(AGENT_VAULT_ABI);
  return AGENT_VAULT_ABI;
}
