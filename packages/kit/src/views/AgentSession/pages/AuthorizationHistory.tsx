/**
 * Authorization History Page
 * 
 * Displays list of all agent authorizations with:
 * - Active/revoked status
 * - Agent name and purpose
 * - Allocated amount and remaining balance
 * - Creation date
 * - Quick actions (view details, revoke, view audit logs)
 */

import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity } from 'react-native';

import type { IAgentAuthorization } from '../types';
import { EAgentAuthorizationStatus } from '../types';
import { getAllAuthorizations } from '../services/storage';

export function AuthorizationHistory() {
  const [authorizations, setAuthorizations] = useState<IAgentAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'revoked'>('all');

  // Load authorizations
  useEffect(() => {
    loadAuthorizations();
  }, []);

  const loadAuthorizations = useCallback(async () => {
    try {
      setLoading(true);
      const allAuths = await getAllAuthorizations();
      // Sort by creation date (newest first)
      allAuths.sort((a, b) => b.createdAt - a.createdAt);
      setAuthorizations(allAuths);
    } catch (error) {
      console.error('[AuthHistory] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter authorizations
  const filteredAuths = authorizations.filter((auth) => {
    if (filter === 'all') return true;
    if (filter === 'active') return auth.status === EAgentAuthorizationStatus.Active;
    if (filter === 'revoked') return auth.status === EAgentAuthorizationStatus.Revoked;
    return true;
  });

  const renderItem = ({ item }: { item: IAgentAuthorization }) => (
    <AuthorizationCard authorization={item} onRefresh={loadAuthorizations} />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Agent Authorizations</Text>
        <Text style={styles.subtitle}>
          {authorizations.length} total, {authorizations.filter(a => a.status === EAgentAuthorizationStatus.Active).length} active
        </Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            All ({authorizations.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, filter === 'active' && styles.tabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.tabText, filter === 'active' && styles.tabTextActive]}>
            Active ({authorizations.filter(a => a.status === EAgentAuthorizationStatus.Active).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, filter === 'revoked' && styles.tabActive]}
          onPress={() => setFilter('revoked')}
        >
          <Text style={[styles.tabText, filter === 'revoked' && styles.tabTextActive]}>
            Revoked ({authorizations.filter(a => a.status === EAgentAuthorizationStatus.Revoked).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filteredAuths}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadAuthorizations}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No authorizations yet</Text>
          </View>
        }
      />
    </View>
  );
}

/**
 * Authorization Card Component
 */
function AuthorizationCard({
  authorization,
  onRefresh,
}: {
  authorization: IAgentAuthorization;
  onRefresh: () => void;
}) {
  const isActive = authorization.status === EAgentAuthorizationStatus.Active;
  const hasPrivateKey = authorization.privateKeyExported;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        // Navigate to detail page
        console.log('View details:', authorization.id);
      }}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{authorization.agentName}</Text>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusRevoked]}>
            <Text style={styles.statusText}>
              {isActive ? 'Active' : 'Revoked'}
            </Text>
          </View>
        </View>
        
        {hasPrivateKey && (
          <View style={styles.warningBadge}>
            <Text style={styles.warningText}>⚠️ Always Allow</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <InfoRow label="Chain" value={authorization.networkName} />
        <InfoRow label="Address" value={`${authorization.subWalletAddress.slice(0, 10)}...${authorization.subWalletAddress.slice(-8)}`} />
        <InfoRow label="Allocated" value={`${authorization.allocatedAmount} ${authorization.tokenSymbol}`} />
        <InfoRow label="Created" value={formatDate(authorization.createdAt)} />
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // View audit logs
            console.log('View logs:', authorization.id);
          }}
        >
          <Text style={styles.actionButtonText}>View Logs</Text>
        </TouchableOpacity>
        
        {isActive && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={() => {
              // Revoke authorization
              console.log('Revoke:', authorization.id);
            }}
          >
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
              Revoke
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Info Row Component
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
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
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusRevoked: {
    backgroundColor: '#999',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFC107',
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
  cardInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  actionButtonDanger: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  actionButtonTextDanger: {
    color: '#f44336',
  },
});
