/**
 * Agent Session Settings
 * 
 * Settings for Agent Session feature:
 * - Enable/disable audit logging
 * - Auto-cleanup old logs
 * - Export audit logs
 * - Clear all authorizations
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, Alert } from 'react-native';

import { getAgentSessionSettings, updateAgentSessionSettings } from '../services/settings';
import type { IAgentSessionSettings } from '../services/settings';
import { getAllAuditLogs, cleanupOldAuditLogs } from '../services/storage';

export function AgentSessionSettings() {
  const [settings, setSettings] = useState<IAgentSessionSettings>({
    auditLoggingEnabled: true,
    auditLogRetentionDays: 90,
    autoCleanupEnabled: true,
  });
  const [auditLogCount, setAuditLogCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadAuditLogStats();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const currentSettings = await getAgentSessionSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('[Settings] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLogStats = useCallback(async () => {
    try {
      const logs = await getAllAuditLogs();
      setAuditLogCount(logs.length);
    } catch (error) {
      console.error('[Settings] Failed to load audit log stats:', error);
    }
  }, []);

  const handleToggleAuditLogging = useCallback(async (enabled: boolean) => {
    try {
      await updateAgentSessionSettings({ auditLoggingEnabled: enabled });
      setSettings(prev => ({ ...prev, auditLoggingEnabled: enabled }));
      
      if (!enabled) {
        Alert.alert(
          'Audit Logging Disabled',
          'New operations will not be logged. Existing logs are preserved.',
        );
      }
    } catch (error) {
      console.error('[Settings] Failed to update audit logging:', error);
    }
  }, []);

  const handleToggleAutoCleanup = useCallback(async (enabled: boolean) => {
    try {
      await updateAgentSessionSettings({ autoCleanupEnabled: enabled });
      setSettings(prev => ({ ...prev, autoCleanupEnabled: enabled }));
    } catch (error) {
      console.error('[Settings] Failed to update auto cleanup:', error);
    }
  }, []);

  const handleChangeRetentionDays = useCallback(async (days: number) => {
    try {
      await updateAgentSessionSettings({ auditLogRetentionDays: days });
      setSettings(prev => ({ ...prev, auditLogRetentionDays: days }));
    } catch (error) {
      console.error('[Settings] Failed to update retention days:', error);
    }
  }, []);

  const handleCleanupNow = useCallback(async () => {
    Alert.alert(
      'Clean Up Old Logs',
      `Delete logs older than ${settings.auditLogRetentionDays} days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deleted = await cleanupOldAuditLogs(settings.auditLogRetentionDays);
              Alert.alert('Success', `Deleted ${deleted} old log entries`);
              loadAuditLogStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to clean up logs');
            }
          },
        },
      ],
    );
  }, [settings.auditLogRetentionDays]);

  const handleExportLogs = useCallback(async () => {
    try {
      const logs = await getAllAuditLogs();
      const json = JSON.stringify(logs, null, 2);
      
      // TODO: Implement actual export (share/save to file)
      console.log('[Settings] Export logs:', logs.length, 'entries');
      Alert.alert('Export', `${logs.length} logs ready to export`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Agent Session Settings</Text>
      </View>

      {/* Audit Logging Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Audit Logging</Text>
        
        <SettingRow
          label="Enable Audit Logging"
          description="Track all agent operations and authorization changes"
          value={settings.auditLoggingEnabled}
          onValueChange={handleToggleAuditLogging}
        />
        
        {settings.auditLoggingEnabled && (
          <>
            <SettingRow
              label="Auto-cleanup Old Logs"
              description={`Automatically delete logs older than ${settings.auditLogRetentionDays} days`}
              value={settings.autoCleanupEnabled}
              onValueChange={handleToggleAutoCleanup}
            />
            
            <View style={styles.retentionSelector}>
              <Text style={styles.label}>Retention Period</Text>
              <View style={styles.retentionOptions}>
                {[30, 60, 90, 180, 365].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.retentionOption,
                      settings.auditLogRetentionDays === days && styles.retentionOptionActive,
                    ]}
                    onPress={() => handleChangeRetentionDays(days)}
                  >
                    <Text
                      style={[
                        styles.retentionOptionText,
                        settings.auditLogRetentionDays === days && styles.retentionOptionTextActive,
                      ]}
                    >
                      {days}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.stats}>
              <Text style={styles.statsText}>
                {auditLogCount} log entries • Using ~{Math.round(auditLogCount * 0.5)}KB
              </Text>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleExportLogs}>
                <Text style={styles.actionButtonText}>📤 Export Logs</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={handleCleanupNow}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                  🗑️ Clean Up Now
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Privacy</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Audit logs are stored locally on your device and never sent to servers.
          </Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About Audit Logging</Text>
        
        <Text style={styles.description}>
          When enabled, audit logging tracks:
        </Text>
        
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Account derivation (address, path)</Text>
          <Text style={styles.bulletItem}>• Funding transactions (from, to, amount)</Text>
          <Text style={styles.bulletItem}>• Private key exports (⚠️ sensitive)</Text>
          <Text style={styles.bulletItem}>• Authorization lifecycle (create, revoke)</Text>
          <Text style={styles.bulletItem}>• Failures and errors</Text>
        </View>
        
        <Text style={styles.description}>
          Logs help you review what agents have done and troubleshoot issues.
        </Text>
      </View>
    </View>
  );
}

/**
 * Setting Row Component
 */
function SettingRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
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
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  retentionSelector: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 12,
  },
  retentionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  retentionOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  retentionOptionActive: {
    backgroundColor: '#007AFF',
  },
  retentionOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  retentionOptionTextActive: {
    color: '#fff',
  },
  stats: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
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
  infoBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletList: {
    paddingLeft: 8,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
});
