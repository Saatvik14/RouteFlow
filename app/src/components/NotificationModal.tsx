import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import { InAppNotification } from '../services/api/notifications';

interface NotificationModalProps {
  visible: boolean;
  loading: boolean;
  notifications: InAppNotification[];
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void;
  onNotificationPress: (item: InAppNotification) => void;
}

const formatTimestamp = (isoString?: string) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export function NotificationModal({
  visible,
  loading,
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
  onNotificationPress,
}: NotificationModalProps) {
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close notifications" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconCircle}>
                <Feather name="bell" size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 ? (
                <Pressable onPress={onMarkAllRead} style={styles.markAllBtn}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={18} color="#64748B" />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.loadingText}>Loading notifications…</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="check-circle" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                When new routes are posted to the fleet pool, you will see alerts here.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.map((item) => {
                const isPool = item.type === 'fleet_pool_route';
                return (
                  <Pressable
                    key={item.notificationId}
                    onPress={() => onNotificationPress(item)}
                    style={({ pressed }) => [
                      styles.item,
                      !item.isRead && styles.itemUnread,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        isPool ? styles.itemIconPool : styles.itemIconDefault,
                      ]}
                    >
                      <Feather
                        name={isPool ? 'users' : 'bell'}
                        size={16}
                        color={isPool ? '#2563EB' : '#64748B'}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <Text numberOfLines={1} style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemTime}>{formatTimestamp(item.createdAt)}</Text>
                      </View>
                      <Text numberOfLines={2} style={styles.itemMessage}>
                        {item.message}
                      </Text>
                      {isPool ? (
                        <View style={styles.actionTag}>
                          <Text style={styles.actionTagText}>Tap to Opt In / Out →</Text>
                        </View>
                      ) : null}
                    </View>
                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemUnread: {
    backgroundColor: '#F0F7FF',
    borderColor: '#D0E1FD',
  },
  itemPressed: {
    opacity: 0.85,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconPool: {
    backgroundColor: '#DBEAFE',
  },
  itemIconDefault: {
    backgroundColor: '#F1F5F9',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: '#0F172A',
  },
  itemTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  itemMessage: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  actionTag: {
    marginTop: 6,
  },
  actionTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
});
