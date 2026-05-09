import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ScrollView,
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

type GpsFilter = 'all' | 'has' | 'none';

export function AdminVehiclesScreen({locale}: Props) {
  const i18n = t(locale);
  const [gpsFilter, setGpsFilter] = useState<GpsFilter>('all');

  const {data: raw, refreshing, refresh: load} = useCachedFetch(
    'admin:vehicles',
    () => api.get<{data: VehicleCardData[]; total: number} | VehicleCardData[]>('/vehicles?limit=500'),
  );
  const all: VehicleCardData[] = raw == null
    ? []
    : Array.isArray(raw)
    ? raw
    : ((raw as {data: VehicleCardData[]}).data ?? []);

  const total: number = raw == null
    ? 0
    : Array.isArray(raw)
    ? raw.length
    : ((raw as {total: number}).total ?? all.length);

  const vehicles = gpsFilter === 'has'
    ? all.filter(v => v.pilotImei != null)
    : gpsFilter === 'none'
    ? all.filter(v => v.pilotImei == null)
    : all;

  const chips: {key: GpsFilter; label: string}[] = [
    {key: 'all',  label: (i18n as any).gpsAll  ?? 'All'},
    {key: 'has',  label: (i18n as any).gpsHas  ?? 'With GPS'},
    {key: 'none', label: (i18n as any).gpsNone ?? 'No GPS'},
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScreenHeader
        locale={locale}
        title={i18n.vehiclesSegment}
        subtitle={`${vehicles.length} / ${total} ${i18n.vehiclesUnit}`}
      />

      {/* GPS filter chips */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {chips.map(chip => {
            const active = gpsFilter === chip.key;
            const chipColor = chip.key === 'has' ? '#047857' : chip.key === 'none' ? '#6b7280' : Colors.primary;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setGpsFilter(chip.key)}
                style={[styles.chip, active && {backgroundColor: chipColor, borderColor: chipColor}]}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
  filterWrap: {paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 4},
  filterScroll: {gap: 8, flexDirection: 'row'},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  chipText: {fontSize: 13, fontWeight: '600' as const, color: Colors.textMuted},
  chipTextActive: {color: '#fff'},
  list: {padding: Spacing.md, gap: Spacing.sm},
  emptyWrap: {alignItems: 'center', paddingTop: Spacing.xxl},
  emptyIcon: {fontSize: 48, marginBottom: Spacing.md},
  emptyText: {...Typography.body, color: Colors.textMuted},
});
