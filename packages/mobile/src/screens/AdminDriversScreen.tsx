import React from 'react';
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
import {useCachedFetch} from '../hooks/useCachedFetch';

interface Props {
  locale: Locale;
}

export function AdminDriversScreen({locale}: Props) {
  const i18n = t(locale);
  const {data: raw, refreshing, refresh: load} = useCachedFetch(
    'admin:drivers',
    () => api.get<DriverCardData[]>('/drivers'),
  );
  const drivers: DriverCardData[] = raw ?? [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScreenHeader
        locale={locale}
        title={i18n.driversSegment}
        subtitle={`${drivers.length} ${i18n.driversUnit}`}
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
            <Text style={styles.emptyText}>{i18n.noDrivers}</Text>
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
