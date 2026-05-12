import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t, formatDateTime, isRTL as isRTLFn} from '../lib/i18n';
import {Colors, Radius, Shadow, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {useCachedFetch} from '../hooks/useCachedFetch';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  locale: Locale;
  onBack: () => void;
  onUnreadCountChange?: (count: number) => void;
}



export function NotificationsScreen({locale, onBack, onUnreadCountChange}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);
  const [markingAll, setMarkingAll] = useState(false);

  const {data: fetched, refreshing, refresh: loadFresh} = useCachedFetch(
    'notifications',
    () => api.get<Notification[]>('/notifications'),
  );

  // Maintain local items so mark-read mutations are applied immediately
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => {
    if (fetched != null) {
      setItems(Array.isArray(fetched) ? fetched : []);
    }
  }, [fetched]);

  function applyItems(nextItems: Notification[]) {
    setItems(nextItems);
    onUnreadCountChange?.(nextItems.filter(n => !n.isRead).length);
  }

  async function load() {
    loadFresh();
  }

  async function markRead(notificationId: string) {
    const item = items.find(n => n.id === notificationId);
    if (!item || item.isRead) return;

    try {
      await api.patch(`/notifications/${notificationId}/read`, {});
      applyItems(items.map(n => (n.id === notificationId ? {...n, isRead: true} : n)));
    } catch {
      // ignore mark-read failures to keep browsing smooth
    }
  }

  async function markAllRead() {
    const unread = items.filter(n => !n.isRead);
    if (!unread.length) return;

    setMarkingAll(true);
    try {
      await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`, {})));
      applyItems(items.map(n => ({...n, isRead: true})));
    } catch {
      // ignore failures; user can pull to refresh
    } finally {
      setMarkingAll(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={[styles.headerRow, !isRTL && {flexDirection: 'row-reverse'}]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onBack} activeOpacity={0.7}>
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.notifications}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={markAllRead}
              activeOpacity={0.7}
              disabled={markingAll || !items.some(n => !n.isRead)}>
              <Text style={styles.actionText}>
                {markingAll ? i18n.marking : i18n.markAllRead}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSub}>
          {i18n.latestAlerts}
          {` • ${items.filter(n => !n.isRead).length} ${i18n.unreadLabel}`}
        </Text>
      </View>

      {/* White curved panel */}
      <View style={styles.panel}>
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          renderItem={({item}) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => markRead(item.id)}
              style={[styles.card, !isRTL && {flexDirection: 'row-reverse'}, isRTL ? !item.isRead && {borderLeftWidth: 3, borderLeftColor: Colors.primary} : !item.isRead && {borderRightWidth: 3, borderRightColor: Colors.primary}]}>
              <View style={styles.iconWrap}>
                <AppIcon name={item.isRead ? 'bell-outline' : 'bell-badge-outline'} size={18} color={Colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.title, !isRTL && styles.rtlText]}>{item.title}</Text>
                <Text style={[styles.body, !isRTL && styles.rtlText]}>{item.body}</Text>
                <Text style={[styles.date, !isRTL && styles.rtlText]}>
                  {formatDateTime(item.createdAt, locale)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, !isRTL && styles.rtlText]}>{i18n.noNotifications}</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {paddingBottom: 24},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  headerTitle: {fontSize: 22, fontWeight: '700' as const, color: '#fff', letterSpacing: 0.3},
  headerSub: {fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingHorizontal: Spacing.md, paddingBottom: 4},
  headerActions: {flexDirection: 'row', gap: 8},
  closeBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  actionPill: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  actionText: {fontSize: 12, fontWeight: '600' as const, color: '#fff'},
  panel: {
    flex: 1, backgroundColor: Colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20, overflow: 'hidden',
  },
  list: {padding: Spacing.md, gap: Spacing.sm},
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardUnread: {borderLeftWidth: 3, borderLeftColor: Colors.primary},
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBody: {flex: 1, gap: 4},
  title: {...Typography.bodyMd, color: Colors.textPrimary},
  body: {...Typography.bodySm, color: Colors.textSecondary},
  date: {...Typography.caption, color: Colors.textMuted, marginTop: 2},
  rtlText: {textAlign: 'right'},
  empty: {...Typography.body, textAlign: 'center', color: Colors.textMuted, marginTop: 60},
});
