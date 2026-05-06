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
import {Locale, t, formatDateTime} from '../lib/i18n';
import {Colors, Radius, Shadow, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
  onBack: () => void;
}

export function NotificationsScreen({locale, onToggleLocale}: Props) {
  const i18n = t(locale);
  const isRTL = locale === 'ar';
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const data = await api.get<Notification[]>('/notifications');
      setItems(data);
    } catch {
      // endpoint may not exist yet — silently ignore
    } finally {
      setRefreshing(false);
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
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{i18n.notifications}</Text>
          <TouchableOpacity style={styles.langPill} onPress={onToggleLocale} activeOpacity={0.7}>
            <Text style={styles.langText}>{i18n.languageLabel}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>{locale === 'ar' ? 'آخر التنبيهات' : 'Latest alerts'}</Text>
      </View>

      {/* White curved panel */}
      <View style={styles.panel}>
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          renderItem={({item}) => (
            <View style={[styles.card, !item.read && styles.cardUnread]}>
              <View style={styles.iconWrap}>
                <AppIcon name={item.read ? 'bell-outline' : 'bell-badge-outline'} size={18} color={Colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.title, isRTL && styles.rtlText]}>{item.title}</Text>
                <Text style={[styles.body, isRTL && styles.rtlText]}>{item.body}</Text>
                <Text style={[styles.date, isRTL && styles.rtlText]}>
                  {formatDateTime(item.createdAt, locale)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, isRTL && styles.rtlText]}>{i18n.noNotifications}</Text>
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
  langPill: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  langText: {fontSize: 12, fontWeight: '600' as const, color: '#fff'},
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
