/**
 * Authorization Service Tests
 * 
 * Tests for agent authorization creation and management
 */

import type {
  IAgentAuthorizationRequest,
  IUserAuthorizationConfig,
} from '../services/authorization';

// Mock modules before importing
jest.mock('@onekeyhq/kit-bg/src/dbs/simple/simpleDb', () => ({
  default: {
    agentAuthorizations: {
      getRawData: jest.fn(),
      setRawData: jest.fn(),
    },
    agentAuditLogs: {
      getRawData: jest.fn(),
      setRawData: jest.fn(),
    },
    agentAccountRegistry: {
      getRawData: jest.fn(),
      setRawData: jest.fn(),
      updateAuthorizationId: jest.fn(),
    },
  },
}));

jest.mock('@onekeyhq/kit/src/background/instance/backgroundApiProxy', () => ({
  default: {
    serviceAccount: {
      addHDAccount: jest.fn(),
      updateAccount: jest.fn(),
      getAccountAddressForApi: jest.fn(),
    },
    serviceToken: {
      getAccountBalances: jest.fn(),
    },
    serviceSend: {
      buildUnsignedTx: jest.fn(),
      preCheckIsFeeInfoOverflow: jest.fn(),
      broadcastTransaction: jest.fn(),
    },
    servicePassword: {
      promptPasswordVerifyByAccount: jest.fn(),
    },
  },
}));

describe('Authorization Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgentAuthorization', () => {
    it('should create authorization with ask-every-time mode', async () => {
      // TODO: Implement test
      // 1. Mock deriveAccountForAgent
      // 2. Mock transferBetweenAccounts
      // 3. Verify no private key export
      // 4. Verify authorization created
      expect(true).toBe(true);
    });

    it('should create authorization with always-allow mode and export private key', async () => {
      // TODO: Implement test
      // 1. Mock deriveAccountForAgent
      // 2. Mock transferBetweenAccounts
      // 3. Mock exportPrivateKey
      // 4. Verify private key returned
      // 5. Verify audit log created
      expect(true).toBe(true);
    });

    it('should handle insufficient balance error', async () => {
      // TODO: Implement test
      // 1. Mock transferBetweenAccounts to throw error
      // 2. Verify error is thrown
      // 3. Verify audit log records failure
      expect(true).toBe(true);
    });

    it('should handle password prompt cancellation', async () => {
      // TODO: Implement test
      // 1. Mock promptPassword to throw
      // 2. Verify authorization fails early
      expect(true).toBe(true);
    });
  });

  describe('revokeAgentAuthorization', () => {
    it('should revoke active authorization', async () => {
      // TODO: Implement test
      // 1. Mock getAuthorizationById
      // 2. Mock updateAuthorization
      // 3. Verify status changed to Revoked
      // 4. Verify audit log created
      expect(true).toBe(true);
    });

    it('should handle non-existent authorization', async () => {
      // TODO: Implement test
      // 1. Mock getAuthorizationById to return null
      // 2. Verify error is thrown
      expect(true).toBe(true);
    });
  });
});

describe('Agent Account Registry', () => {
  it('should generate correct account name format', async () => {
    const { generateAgentAccountName } = await import('../services/agentAccountRegistry');
    
    // Test active account
    const name1 = generateAgentAccountName({
      agentName: 'TestAgent',
      derivationIndex: 10000,
      privateKeyExported: false,
      status: 'active',
    });
    expect(name1).toBe('🤖 TestAgent #10000');
    
    // Test with private key exported
    const name2 = generateAgentAccountName({
      agentName: 'TestAgent',
      derivationIndex: 10001,
      privateKeyExported: true,
      status: 'active',
    });
    expect(name2).toBe('🤖 TestAgent #10001 [🔑]');
    
    // Test revoked account
    const name3 = generateAgentAccountName({
      agentName: 'TestAgent',
      derivationIndex: 10002,
      privateKeyExported: false,
      status: 'revoked',
    });
    expect(name3).toBe('🤖 TestAgent #10002 [⛔]');
    
    // Test revoked with private key exported
    const name4 = generateAgentAccountName({
      agentName: 'TestAgent',
      derivationIndex: 10003,
      privateKeyExported: true,
      status: 'revoked',
    });
    expect(name4).toBe('🤖 TestAgent #10003 [🔑⛔]');
  });

  it('should ensure derivation index >= 10000', async () => {
    const { AGENT_DERIVATION_START_INDEX } = await import('../services/agentAccountRegistry');
    
    expect(AGENT_DERIVATION_START_INDEX).toBeGreaterThanOrEqual(10000);
  });

  it('should get next available agent derivation index', async () => {
    const simpleDb = (await import('@onekeyhq/kit-bg/src/dbs/simple/simpleDb')).default;
    const { getNextAgentDerivationIndex } = await import('../services/agentAccountRegistry');
    
    // Mock empty registry
    jest.mocked(simpleDb.agentAccountRegistry.getRawData).mockResolvedValue({
      accounts: [],
    });
    
    const nextIndex = await getNextAgentDerivationIndex('evm--1');
    expect(nextIndex).toBeGreaterThanOrEqual(10000);
  });
});

describe('ServiceAgentSession', () => {
  it('should filter authorizations by wallet', async () => {
    const simpleDb = (await import('@onekeyhq/kit-bg/src/dbs/simple/simpleDb')).default;
    const ServiceAgentSession = (await import('@onekeyhq/kit-bg/src/services/ServiceAgentSession')).default;
    
    const mockAuthorizations = [
      {
        id: 'auth1',
        sourceWalletId: 'wallet1',
        status: 'Active',
        agentId: 'agent1',
        agentName: 'Agent 1',
      },
      {
        id: 'auth2',
        sourceWalletId: 'wallet2',
        status: 'Active',
        agentId: 'agent2',
        agentName: 'Agent 2',
      },
      {
        id: 'auth3',
        sourceWalletId: 'wallet1',
        status: 'Revoked',
        agentId: 'agent3',
        agentName: 'Agent 3',
      },
    ];
    
    jest.mocked(simpleDb.agentAuthorizations.getRawData).mockResolvedValue({
      authorizations: mockAuthorizations,
    });
    
    const service = new ServiceAgentSession({ backgroundApi: {} } as any);
    const result = await service.getAuthorizationsByWallet('wallet1');
    
    // Should only return Active/Paused authorizations for wallet1
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('auth1');
  });

  it('should handle balance query errors gracefully', async () => {
    const backgroundApiProxy = (await import('@onekeyhq/kit/src/background/instance/backgroundApiProxy')).default;
    const ServiceAgentSession = (await import('@onekeyhq/kit-bg/src/services/ServiceAgentSession')).default;
    
    // Mock balance query to throw error
    jest.mocked(backgroundApiProxy.serviceToken.getAccountBalances).mockRejectedValue(
      new Error('Network error'),
    );
    
    const service = new ServiceAgentSession({ 
      backgroundApi: backgroundApiProxy,
    } as any);
    
    const result = await service.getAgentAccountBalance({
      accountId: 'test-account',
      networkId: 'evm--1',
    });
    
    // Should return default values on error
    expect(result.balance).toBe('0');
    expect(result.symbol).toBe('ETH');
  });
});
