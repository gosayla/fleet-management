import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing, Typography} from '../lib/theme';
import {ScreenHeader} from '../components/ui/ScreenHeader';
import {DriverCard, DriverCardData} from '../components/ui/cards/DriverCard';

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
}

export function AdminDriversScreen({locale, onToggleLocale}: Props) {
  const i18n = t(locale);
  const [drivers, setDrivers] = useState<DriverCardData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const data = await api.get<DriverCardData[]>('/drivers');
      setDrivers(data);
    } catch {
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
      <ScreenHeader
        locale={locale}
        title={locale === 'ar' ? 'السائقون' : 'Drivers'}
        subtitle={`${drivers.length} ${locale === 'ar' ? 'سائق' : 'drivers'}`}
        languageLabel={i18n.languageLabel}
        onToggleLocale={onToggleLocale}
      />

      <FlatList
        data={drivers}
        keyExtractor={d => d.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}
        renderItem={({item}) => <DriverCard driver={item} locale={locale} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>{locale === 'ar' ? 'لا يوجد سائقون' : 'No drivers'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  list: {padding: Spacing.md, gap: Spacing.sm},
  emptyWrap: {alignItems: 'center', paddingTop: Spacing.xxl},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyText: {...Typography.body, color: Colors.textMuted},
});
