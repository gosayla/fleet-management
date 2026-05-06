import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t, formatDateTime} from '../lib/i18n';

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

export function NotificationsScreen({locale, onToggleLocale, onBack}: Props) {
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
      <View style={[styles.header, isRTL && styles.headerRtl]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>{i18n.notifications}</Text>
        <TouchableOpacity style={styles.langBtn} onPress={onToggleLocale}>
          <Text style={styles.langText}>{i18n.languageLabel}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={n => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <View style={[styles.card, !item.read && styles.cardUnread]}>
            {!item.read && <View style={styles.dot} />}
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
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  headerRtl: {flexDirection: 'row-reverse'},
  backBtn: {padding: 4},
  backText: {fontSize: 20, color: '#2563eb', fontWeight: '700'},
  heading: {flex: 1, fontSize: 20, fontWeight: '700', color: '#111827'},
  langBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langText: {color: '#374151', fontSize: 12, fontWeight: '600'},
  list: {padding: 16, gap: 10},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 10,
    elevation: 1,
  },
  cardUnread: {borderLeftWidth: 3, borderLeftColor: '#2563eb'},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: 6,
  },
  cardBody: {flex: 1, gap: 4},
  title: {fontSize: 15, fontWeight: '600', color: '#111827'},
  body: {fontSize: 13, color: '#6b7280'},
  date: {fontSize: 11, color: '#9ca3af', marginTop: 2},
  rtlText: {textAlign: 'right'},
  empty: {textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15},
});
