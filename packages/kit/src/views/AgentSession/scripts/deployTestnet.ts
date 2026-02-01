/**
 * Deploy Vault Contract to Testnet
 * 
 * Script to deploy and test vault contracts on Goerli/Sepolia testnets
 * 
 * Usage:
 * 1. Configure TESTNET_CONFIG below
 * 2. Ensure test account has testnet ETH
 * 3. Run: npx ts-node deployTestnet.ts
 */

import { ethers } from 'ethers';

import {
  deployVaultContract,
  fundVault,
  getVaultInfo,
  executeViaVault,
} from '../services/contract';

/**
 * Testnet Configuration
 */
const TESTNET_CONFIG = {
  // Network configuration
  network: {
    id: 'evm-5', // Goerli
    name: 'Ethereum Goerli',
    rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
  },

  // Account configuration (replace with your test account)
  account: {
    id: 'test-account-id', // OneKey account ID
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Example
  },

  // Deployment parameters
  deployment: {
    dailyLimitWei: ethers.parseEther('1').toString(), // 1 ETH daily limit
    initialFunding: ethers.parseEther('0.1').toString(), // 0.1 ETH initial funding
  },

  // Test transaction
  testTransfer: {
    recipient: '0x0000000000000000000000000000000000000000', // Replace with test address
    amount: ethers.parseEther('0.01').toString(), // 0.01 ETH
  },
};

/**
 * Step 1: Deploy Vault Contract
 */
async function step1_deployVault(): Promise<string> {
  console.log('\n📝 Step 1: Deploying Vault Contract');
  console.log('=====================================');
  console.log('Network:', TESTNET_CONFIG.network.name);
  console.log('Daily Limit:', ethers.formatEther(TESTNET_CONFIG.deployment.dailyLimitWei), 'ETH');

  try {
    const result = await deployVaultContract({
      ownerAccountId: TESTNET_CONFIG.account.id,
      networkId: TESTNET_CONFIG.network.id,
      password: '', // Will prompt user via OneKey UI
      dailyLimitWei: TESTNET_CONFIG.deployment.dailyLimitWei,
      initialFunding: '0', // Don't fund during deployment
    });

    console.log('✅ Vault Deployed Successfully!');
    console.log('Contract Address:', result.contractAddress);
    console.log('Transaction Hash:', result.txHash);
    console.log('Owner:', result.owner);

    return result.contractAddress;
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

/**
 * Step 2: Fund Vault Contract
 */
async function step2_fundVault(vaultAddress: string): Promise<void> {
  console.log('\n💰 Step 2: Funding Vault Contract');
  console.log('=====================================');
  console.log('Vault Address:', vaultAddress);
  console.log('Amount:', ethers.formatEther(TESTNET_CONFIG.deployment.initialFunding), 'ETH');

  try {
    const result = await fundVault({
      vaultAddress,
      ownerAccountId: TESTNET_CONFIG.account.id,
      amount: TESTNET_CONFIG.deployment.initialFunding,
      networkId: TESTNET_CONFIG.network.id,
      password: '',
    });

    console.log('✅ Vault Funded Successfully!');
    console.log('Transaction Hash:', result.txHash);
  } catch (error) {
    console.error('❌ Funding failed:', error);
    throw error;
  }
}

/**
 * Step 3: Verify Vault Info
 */
async function step3_verifyVault(vaultAddress: string): Promise<void> {
  console.log('\n🔍 Step 3: Verifying Vault State');
  console.log('=====================================');

  try {
    const info = await getVaultInfo({
      vaultAddress,
      networkId: TESTNET_CONFIG.network.id,
      accountId: TESTNET_CONFIG.account.id,
    });

    console.log('✅ Vault Info Retrieved:');
    console.log('Owner:', info.owner);
    console.log('Balance:', ethers.formatEther(info.balance), 'ETH');
    console.log('Daily Limit:', ethers.formatEther(info.dailyLimit), 'ETH');
    console.log('Daily Spent:', ethers.formatEther(info.dailySpent), 'ETH');
    console.log(
      'Remaining Today:',
      ethers.formatEther(
        (BigInt(info.dailyLimit) - BigInt(info.dailySpent)).toString(),
      ),
      'ETH',
    );
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Step 4: Test Transfer via Vault
 */
async function step4_testTransfer(vaultAddress: string): Promise<void> {
  console.log('\n💸 Step 4: Testing Transfer via Vault');
  console.log('=====================================');
  console.log('Recipient:', TESTNET_CONFIG.testTransfer.recipient);
  console.log('Amount:', ethers.formatEther(TESTNET_CONFIG.testTransfer.amount), 'ETH');

  try {
    const result = await executeViaVault({
      vaultAddress,
      ownerAccountId: TESTNET_CONFIG.account.id,
      targetAddress: TESTNET_CONFIG.testTransfer.recipient,
      amount: TESTNET_CONFIG.testTransfer.amount,
      networkId: TESTNET_CONFIG.network.id,
      password: '',
      data: '0x', // Simple ETH transfer
    });

    console.log('✅ Transfer Executed Successfully!');
    console.log('Transaction Hash:', result.txHash);
    console.log('Success:', result.success);
  } catch (error) {
    console.error('❌ Transfer failed:', error);
    throw error;
  }
}

/**
 * Step 5: Test Daily Limit Enforcement
 */
async function step5_testLimitEnforcement(vaultAddress: string): Promise<void> {
  console.log('\n🛡️ Step 5: Testing Daily Limit Enforcement');
  console.log('=====================================');

  // Try to spend more than daily limit
  const excessiveAmount = ethers.parseEther('2').toString(); // 2 ETH (exceeds 1 ETH limit)
  console.log('Attempting to send:', ethers.formatEther(excessiveAmount), 'ETH');
  console.log('Expected: Transaction should FAIL');

  try {
    const result = await executeViaVault({
      vaultAddress,
      ownerAccountId: TESTNET_CONFIG.account.id,
      targetAddress: TESTNET_CONFIG.testTransfer.recipient,
      amount: excessiveAmount,
      networkId: TESTNET_CONFIG.network.id,
      password: '',
    });

    if (result.success) {
      console.log('⚠️ WARNING: Limit enforcement failed - transaction succeeded!');
    } else {
      console.log('✅ Limit enforcement working - transaction rejected');
    }
  } catch (error) {
    console.log('✅ Limit enforcement working - transaction reverted');
    console.log('Error:', error.message);
  }
}

/**
 * Main Deployment Flow
 */
async function main() {
  console.log('🚀 Vault Contract Testnet Deployment');
  console.log('=====================================');
  console.log('Network:', TESTNET_CONFIG.network.name);
  console.log('Account:', TESTNET_CONFIG.account.address);
  console.log('\n⚠️ Make sure your account has testnet ETH!');
  console.log('Get testnet ETH from:');
  console.log('- Goerli: https://goerlifaucet.com');
  console.log('- Sepolia: https://sepoliafaucet.com');

  try {
    // Step 1: Deploy
    const vaultAddress = await step1_deployVault();

    // Step 2: Fund
    await step2_fundVault(vaultAddress);

    // Step 3: Verify
    await step3_verifyVault(vaultAddress);

    // Step 4: Test transfer
    await step4_testTransfer(vaultAddress);

    // Step 5: Test limit enforcement
    await step5_testLimitEnforcement(vaultAddress);

    // Final verification
    await step3_verifyVault(vaultAddress);

    // Summary
    console.log('\n✅ All Tests Completed Successfully!');
    console.log('=====================================');
    console.log('Vault Address:', vaultAddress);
    console.log('Save this address for future testing');
  } catch (error) {
    console.error('\n❌ Deployment Failed');
    console.error('=====================================');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Interactive Mode: Test existing vault
 */
async function testExistingVault(vaultAddress: string) {
  console.log('🧪 Testing Existing Vault');
  console.log('=====================================');
  console.log('Vault Address:', vaultAddress);

  try {
    await step3_verifyVault(vaultAddress);
    await step4_testTransfer(vaultAddress);
    await step3_verifyVault(vaultAddress);

    console.log('✅ Tests Completed');
  } catch (error) {
    console.error('❌ Tests Failed:', error);
  }
}

// Run script
if (require.main === module) {
  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] === '--test') {
    // Test existing vault
    const vaultAddress = args[1];
    if (!vaultAddress) {
      console.error('❌ Please provide vault address: --test <address>');
      process.exit(1);
    }
    testExistingVault(vaultAddress).catch(console.error);
  } else {
    // Full deployment
    main().catch(console.error);
  }
}

export { main, testExistingVault };
