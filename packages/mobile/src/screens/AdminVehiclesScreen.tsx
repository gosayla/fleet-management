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
import {VehicleCard, VehicleCardData} from '../components/ui/cards/VehicleCard';
import {useCachedFetch} from '../hooks/useCachedFetch';

interface Props {
  locale: Locale;
}

export function AdminVehiclesScreen({locale}: Props) {
  const i18n = t(locale);
  const {data: raw, refreshing, refresh: load} = useCachedFetch(
    'admin:vehicles',
    () => api.get<VehicleCardData[] | {data: VehicleCardData[]}>('/vehicles'),
  );
  const vehicles: VehicleCardData[] = raw == null ? [] : Array.isArray(raw) ? raw : (raw as any).data ?? [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScreenHeader
        locale={locale}
        title={i18n.vehiclesSegment}
        subtitle={`${vehicles.length} ${i18n.vehiclesUnit}`}
      />

      <FlatList
        data={vehicles}
        keyExtractor={v => v.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}
        renderItem={({item}) => <VehicleCard vehicle={item} locale={locale} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={styles.emptyText}>{i18n.noVehicles}</Text>
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
