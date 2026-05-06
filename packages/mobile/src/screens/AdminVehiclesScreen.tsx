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
import {VehicleCard, VehicleCardData} from '../components/ui/cards/VehicleCard';

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
}

export function AdminVehiclesScreen({locale, onToggleLocale}: Props) {
  const i18n = t(locale);
  const [vehicles, setVehicles] = useState<VehicleCardData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const res = await api.get<{data: VehicleCardData[]}>('/vehicles');
      setVehicles(Array.isArray(res) ? res : (res as any).data ?? []);
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
        title={locale === 'ar' ? 'المركبات' : 'Vehicles'}
        subtitle={`${vehicles.length} ${locale === 'ar' ? 'مركبة' : 'vehicles'}`}
        languageLabel={i18n.languageLabel}
        onToggleLocale={onToggleLocale}
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
            <Text style={styles.emptyText}>{locale === 'ar' ? 'لا توجد مركبات' : 'No vehicles'}</Text>
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
