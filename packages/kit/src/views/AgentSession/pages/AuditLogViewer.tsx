/**
 * Audit Log Viewer
 * 
 * Displays detailed audit logs for an authorization:
 * - Account derivation
 * - Funding transactions
 * - Private key exports
 * - All agent operations
 */

import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';

import type { IAuditLog } from '../services/storage';
import { getAuditLogsByAuthorization, getAuditLogsByAgent } from '../services/storage';

interface AuditLogViewerProps {
  authorizationId?: string;
  agentId?: string;
}

export function AuditLogViewer({ authorizationId, agentId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [authorizationId, agentId]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      let auditLogs: IAuditLog[];
      
      if (authorizationId) {
        auditLogs = await getAuditLogsByAuthorization(authorizationId);
      } else if (agentId) {
        auditLogs = await getAuditLogsByAgent(agentId);
      } else {
        auditLogs = [];
      }
      
      // Sort by timestamp (newest first)
      auditLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(auditLogs);
    } catch (error) {
      console.error('[AuditLog] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [authorizationId, agentId]);

  const renderItem = ({ item }: { item: IAuditLog }) => (
    <AuditLogItem log={item} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audit Logs</Text>
        <Text style={styles.subtitle}>{logs.length} entries</Text>
      </View>
      
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadLogs}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No audit logs</Text>
          </View>
        }
      />
    </View>
  );
}

/**
 * Audit Log Item Component
 */
function AuditLogItem({ log }: { log: IAuditLog }) {
  const actionInfo = getActionInfo(log.action);
  
  return (
    <View style={styles.logItem}>
      {/* Icon and action */}
      <View style={styles.logHeader}>
        <View style={[styles.iconContainer, { backgroundColor: actionInfo.color }]}>
          <Text style={styles.iconText}>{actionInfo.icon}</Text>
        </View>
        <View style={styles.logHeaderText}>
          <Text style={styles.logAction}>{actionInfo.label}</Text>
          <Text style={styles.logTime}>{formatTimestamp(log.timestamp)}</Text>
        </View>
      </View>
      
      {/* Details */}
      <View style={styles.logDetails}>
        {renderDetails(log.action, log.details)}
      </View>
    </View>
  );
}

/**
 * Get action display info
 */
function getActionInfo(action: IAuditLog['action']): {
  icon: string;
  label: string;
  color: string;
} {
  switch (action) {
    case 'derive-account':
      return {
        icon: '🔑',
        label: 'Account Derived',
        color: '#4CAF50',
      };
    case 'fund-account':
      return {
        icon: '💰',
        label: 'Funds Transferred',
        color: '#2196F3',
      };
    case 'export-private-key':
      return {
        icon: '⚠️',
        label: 'Private Key Exported',
        color: '#FFC107',
      };
    case 'create-authorization':
      return {
        icon: '✅',
        label: 'Authorization Created',
        color: '#4CAF50',
      };
    case 'revoke-authorization':
      return {
        icon: '🚫',
        label: 'Authorization Revoked',
        color: '#f44336',
      };
    case 'authorization-failed':
      return {
        icon: '❌',
        label: 'Authorization Failed',
        color: '#f44336',
      };
    case 'transaction':
      return {
        icon: '📤',
        label: 'Transaction',
        color: '#9C27B0',
      };
    case 'query-balance':
      return {
        icon: '👁️',
        label: 'Balance Query',
        color: '#607D8B',
      };
    default:
      return {
        icon: '📝',
        label: action,
        color: '#999',
      };
  }
}

/**
 * Render details based on action type
 */
function renderDetails(action: IAuditLog['action'], details: Record<string, any>) {
  const items: Array<{ label: string; value: string }> = [];
  
  switch (action) {
    case 'derive-account':
      if (details.address) items.push({ label: 'Address', value: details.address });
      if (details.path) items.push({ label: 'Path', value: details.path });
      if (details.derivationIndex !== undefined) {
        items.push({ label: 'Index', value: String(details.derivationIndex) });
      }
      if (details.isNewAccount !== undefined) {
        items.push({
          label: 'Status',
          value: details.isNewAccount ? 'New Account' : 'Reused Existing',
        });
      }
      break;
      
    case 'fund-account':
      if (details.fromAccount) items.push({ label: 'From', value: details.fromAccount });
      if (details.toAddress) items.push({ label: 'To', value: details.toAddress });
      if (details.amount && details.tokenSymbol) {
        items.push({ label: 'Amount', value: `${details.amount} ${details.tokenSymbol}` });
      }
      if (details.txHash) items.push({ label: 'Tx Hash', value: details.txHash });
      break;
      
    case 'export-private-key':
      if (details.address) items.push({ label: 'Address', value: details.address });
      if (details.warning) {
        items.push({ label: 'Warning', value: details.warning });
      }
      break;
      
    case 'create-authorization':
      if (details.mode) items.push({ label: 'Mode', value: details.mode });
      if (details.permissionMode) items.push({ label: 'Permission', value: details.permissionMode });
      if (details.allocatedAmount) items.push({ label: 'Allocated', value: details.allocatedAmount });
      if (details.duration) items.push({ label: 'Duration', value: details.duration });
      break;
      
    case 'revoke-authorization':
      if (details.revokedBy) items.push({ label: 'Revoked By', value: details.revokedBy });
      break;
      
    case 'authorization-failed':
      if (details.error) items.push({ label: 'Error', value: details.error });
      break;
      
    default:
      // Generic details
      Object.entries(details).forEach(([key, value]) => {
        items.push({ label: key, value: String(value) });
      });
  }
  
  return items.map((item, index) => (
    <View key={index} style={styles.detailRow}>
      <Text style={styles.detailLabel}>{item.label}:</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {item.value}
      </Text>
    </View>
  ));
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleString();
  }
}

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  logHeaderText: {
    flex: 1,
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  logTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logDetails: {
    paddingLeft: 52,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
});
