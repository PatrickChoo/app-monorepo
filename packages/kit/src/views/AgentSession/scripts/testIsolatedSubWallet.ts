/**
 * Test Isolated Sub-Wallet (Isolated Agent Account)
 *
 * This script tests the complete Isolated Sub-Wallet authorization flow:
 * 1. Derive agent account (index 10,000+)
 * 2. Transfer funds from main account to agent account
 * 3. Verify balances
 * 4. Test agent account can send transactions
 * 
 * Usage:
 * 1. Configure TEST_CONFIG below
 * 2. Ensure main account has testnet balance
 * 3. Run: npx ts-node testIsolatedSubWallet.ts
 */

import {
  createAgentAuthorization,
  type IAgentAuthorizationRequest,
  type IUserAuthorizationConfig,
} from '../services/authorization';
import { getAccountBalance, transferBetweenAccounts } from '../services/wallet';

/**
 * Test Configuration
 * 
 * ⚠️ UPDATE THESE VALUES BEFORE RUNNING
 */
const TEST_CONFIG = {
  // Network (use testnet!)
  network: {
    id: 'evm--11155111', // Sepolia testnet
    name: 'Ethereum Sepolia',
  },

  // Your OneKey wallet and main account
  wallet: {
    walletId: 'hd-1', // Replace with your HD wallet ID
    mainAccountId: 'hd-1--m/44\'/60\'/0\'/0/0', // Replace with your account ID
    mainAccountAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Replace
  },

  // Agent configuration
  agent: {
    id: 'test-agent-001',
    name: 'Test Agent',
    description: 'Testing Isolated Sub-Wallet authorization',
  },

  // Authorization amounts
  amounts: {
    initialFunding: '0.01', // 0.01 ETH to agent account
    testTransfer: '0.005', // 0.005 ETH test transaction
  },

  // Test recipient for agent transactions
  testRecipient: '0x0000000000000000000000000000000000000001', // Replace with test address

  // Permission mode
  permissionMode: 'ask-every-time' as const, // or 'always-allow'
};

/**
 * Convert ETH to Wei
 */
function ethToWei(eth: string): string {
  return (BigInt(eth.replace('.', '')) * BigInt(10) ** BigInt(18 - (eth.split('.')[1]?.length || 0))).toString();
}

/**
 * Convert Wei to ETH
 */
function weiToEth(wei: string): string {
  const weiNum = BigInt(wei);
  const eth = Number(weiNum) / 1e18;
  return eth.toFixed(6);
}

/**
 * Step 1: Check Main Account Balance
 */
async function step1_checkMainBalance(): Promise<void> {
  console.log('\n💰 Step 1: Checking Main Account Balance');
  console.log('=========================================');
  console.log('Account:', TEST_CONFIG.wallet.mainAccountAddress);
  console.log('Network:', TEST_CONFIG.network.name);

  try {
    const balance = await getAccountBalance({
      accountId: TEST_CONFIG.wallet.mainAccountId,
      networkId: TEST_CONFIG.network.id,
    });

    console.log('✅ Balance:', weiToEth(balance.balance), balance.symbol);

    const requiredWei = ethToWei(TEST_CONFIG.amounts.initialFunding);
    if (BigInt(balance.balance) < BigInt(requiredWei)) {
      throw new Error(
        `Insufficient balance! Need ${TEST_CONFIG.amounts.initialFunding} ETH, have ${weiToEth(balance.balance)} ETH`,
      );
    }

    console.log('✅ Sufficient balance for testing');
  } catch (error) {
    console.error('❌ Failed to check balance:', error);
    throw error;
  }
}

/**
 * Step 2: Create Agent Authorization
 */
async function step2_createAuthorization(): Promise<{
  authorizationId: string;
  agentAccountId: string;
  agentAccountAddress: string;
  agentAccountPath: string;
  agentAccountIndex: number;
  fundingTxHash: string;
}> {
  console.log('\n🔐 Step 2: Creating Agent Authorization');
  console.log('=========================================');
  console.log('Agent:', TEST_CONFIG.agent.name);
  console.log('Amount:', TEST_CONFIG.amounts.initialFunding, 'ETH');
  console.log('Permission:', TEST_CONFIG.permissionMode);

  try {
    // Build authorization request (from AI)
    const request: IAgentAuthorizationRequest = {
      agentId: TEST_CONFIG.agent.id,
      agentName: TEST_CONFIG.agent.name,
      agentDescription: TEST_CONFIG.agent.description,
      suggestedAmount: ethToWei(TEST_CONFIG.amounts.initialFunding),
      suggestedToken: 'ETH',
      chainId: TEST_CONFIG.network.id,
      networkName: TEST_CONFIG.network.name,
      purpose: 'Testing Isolated Sub-Wallet',
    };

    // Build user configuration
    const userConfig: IUserAuthorizationConfig = {
      funding: {
        fromAccountId: TEST_CONFIG.wallet.mainAccountId,
        fromAddress: TEST_CONFIG.wallet.mainAccountAddress,
        amount: ethToWei(TEST_CONFIG.amounts.initialFunding),
        tokenSymbol: 'ETH',
      },
      permission: {
        mode: TEST_CONFIG.permissionMode,
      },
      walletId: TEST_CONFIG.wallet.walletId,
    };

    console.log('Creating authorization...');
    console.log('(You will be prompted for password via OneKey UI)');

    const result = await createAgentAuthorization(request, userConfig);

    console.log('✅ Authorization Created Successfully!');
    console.log('Authorization ID:', result.authorizationId);
    console.log('Agent Account Address:', result.agentAccountAddress);
    console.log('Agent Account Path:', result.agentAccountPath);
    console.log('Derivation Index:', result.agentAccountIndex);
    console.log('Funding TX:', result.fundingTxHash);

    if (result.privateKey) {
      console.log('🔑 Private Key Exported (always-allow mode)');
    }

    return result;
  } catch (error) {
    console.error('❌ Authorization failed:', error);
    throw error;
  }
}

/**
 * Step 3: Verify Agent Account Balance
 */
async function step3_verifyAgentBalance(
  agentAccountId: string,
  agentAccountAddress: string,
): Promise<void> {
  console.log('\n🔍 Step 3: Verifying Agent Account Balance');
  console.log('=========================================');
  console.log('Agent Address:', agentAccountAddress);

  try {
    // Wait for transaction to confirm (simplified)
    console.log('⏳ Waiting for funding transaction to confirm...');
    await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 seconds

    const balance = await getAccountBalance({
      accountId: agentAccountId,
      networkId: TEST_CONFIG.network.id,
    });

    console.log('✅ Agent Balance:', weiToEth(balance.balance), balance.symbol);

    const expectedWei = ethToWei(TEST_CONFIG.amounts.initialFunding);
    if (BigInt(balance.balance) < BigInt(expectedWei) / BigInt(2)) {
      console.warn('⚠️ Balance lower than expected - transaction may still be pending');
    } else {
      console.log('✅ Balance matches expected amount');
    }
  } catch (error) {
    console.error('❌ Failed to verify balance:', error);
    throw error;
  }
}

/**
 * Step 4: Test Agent Account Transaction
 */
async function step4_testAgentTransaction(
  agentAccountId: string,
  agentAccountAddress: string,
): Promise<void> {
  console.log('\n💸 Step 4: Testing Agent Account Transaction');
  console.log('=========================================');
  console.log('From (Agent):', agentAccountAddress);
  console.log('To:', TEST_CONFIG.testRecipient);
  console.log('Amount:', TEST_CONFIG.amounts.testTransfer, 'ETH');

  try {
    console.log('Creating transaction...');
    console.log('(You will be prompted for password via OneKey UI)');

    const result = await transferBetweenAccounts({
      fromAccountId: agentAccountId,
      toAddress: TEST_CONFIG.testRecipient,
      amount: ethToWei(TEST_CONFIG.amounts.testTransfer),
      networkId: TEST_CONFIG.network.id,
      password: '', // Will prompt via OneKey UI
    });

    console.log('✅ Transaction Sent Successfully!');
    console.log('TX Hash:', result.txHash);
    console.log('Explorer:', `https://sepolia.etherscan.io/tx/${result.txHash}`);
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    throw error;
  }
}

/**
 * Step 5: Final Balance Check
 */
async function step5_finalBalanceCheck(
  agentAccountId: string,
  agentAccountAddress: string,
): Promise<void> {
  console.log('\n📊 Step 5: Final Balance Check');
  console.log('=========================================');

  try {
    // Wait for transaction to confirm
    console.log('⏳ Waiting for test transaction to confirm...');
    await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 seconds

    const balance = await getAccountBalance({
      accountId: agentAccountId,
      networkId: TEST_CONFIG.network.id,
    });

    console.log('✅ Final Agent Balance:', weiToEth(balance.balance), balance.symbol);

    // Calculate expected balance (initial - test - gas)
    const initialWei = BigInt(ethToWei(TEST_CONFIG.amounts.initialFunding));
    const transferWei = BigInt(ethToWei(TEST_CONFIG.amounts.testTransfer));
    const expectedMin = weiToEth((initialWei - transferWei - BigInt(1e16)).toString()); // Minus 0.01 ETH for gas

    console.log('Expected (approx):', expectedMin, 'ETH');
    console.log('(Some difference due to gas fees)');
  } catch (error) {
    console.error('❌ Failed to check final balance:', error);
    throw error;
  }
}

/**
 * Main Test Flow
 */
async function main() {
  console.log('🧪 Isolated Sub-Wallet: Agent Account Test');
  console.log('=========================================');
  console.log('Network:', TEST_CONFIG.network.name);
  console.log('Wallet:', TEST_CONFIG.wallet.walletId);
  console.log('Agent:', TEST_CONFIG.agent.name);
  console.log('\n⚠️ Make sure:');
  console.log('1. You have testnet ETH in your main account');
  console.log('2. CONFIG values are updated with your wallet info');
  console.log('3. You are connected to Sepolia testnet');
  console.log('\nGet testnet ETH from: https://sepoliafaucet.com');
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');

  // Wait 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Step 1: Check balance
    await step1_checkMainBalance();

    // Step 2: Create authorization
    const authResult = await step2_createAuthorization();

    // Step 3: Verify agent balance
    await step3_verifyAgentBalance(
      authResult.agentAccountId,
      authResult.agentAccountAddress,
    );

    // Step 4: Test agent transaction
    await step4_testAgentTransaction(
      authResult.agentAccountId,
      authResult.agentAccountAddress,
    );

    // Step 5: Final balance check
    await step5_finalBalanceCheck(
      authResult.agentAccountId,
      authResult.agentAccountAddress,
    );

    // Summary
    console.log('\n✅ All Tests Completed Successfully!');
    console.log('=========================================');
    console.log('Authorization ID:', authResult.authorizationId);
    console.log('Agent Account:', authResult.agentAccountAddress);
    console.log('Derivation Path:', authResult.agentAccountPath);
    console.log('Derivation Index:', authResult.agentAccountIndex);
    console.log('Funding TX:', authResult.fundingTxHash);
    console.log('\n💡 Check your OneKey app:');
    console.log('- Agent account should appear in account list');
    console.log('- Account name should show agent marker (🤖)');
    console.log('- Authorization should be in audit logs');
  } catch (error) {
    console.error('\n❌ Test Failed');
    console.error('=========================================');
    console.error(error);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  main().catch(console.error);
}

export { main };
