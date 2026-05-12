import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t, isRTL} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface MaintenanceItem {
  id: string;
  type: string;
  status: string;
  description: string;
  scheduledDate: string;
  completedDate?: string;
  costSar?: number;
  vehicle?: {plateNumber: string; make: string; model: string};
}

type StatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Props {
  locale: Locale;
  onSelectItem: (id: string) => void;
  onAddPress: () => void;
  onBack: () => void;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: '2-digit'});
}

export function AdminMaintenanceScreen({locale, onSelectItem, onAddPress, onBack}: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const [all, setAll] = useState<MaintenanceItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    try {
      const data = await api.get<MaintenanceItem[]>('/maintenance');
      setAll(Array.isArray(data) ? data : []);
    } catch {}
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useCallback(() => {
    let items = filter === 'ALL' ? all : all.filter(m => m.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(m =>
        (m.vehicle?.plateNumber ?? '').toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        `${m.vehicle?.make} ${m.vehicle?.model}`.toLowerCase().includes(q)
      );
    }
    return items;
  }, [all, filter, searchQuery]);

  function statusColors(status: string) {
    switch (status) {
      case 'PENDING':     return {bg: '#FFF8E1', color: '#F57F17'};
      case 'IN_PROGRESS': return {bg: '#E3F2FD', color: '#1565C0'};
      case 'COMPLETED':   return {bg: '#E8F5E9', color: '#2E7D32'};
      case 'CANCELLED':   return {bg: Colors.borderLight, color: Colors.textMuted};
      default:            return {bg: Colors.borderLight, color: Colors.textMuted};
    }
  }

  function typeLabel(type: string) {
    switch (type) {
      case 'SCHEDULED':   return i18n.maintenanceTypeScheduled;
      case 'UNSCHEDULED': return i18n.maintenanceTypeUnscheduled;
      case 'EMERGENCY':   return i18n.maintenanceTypeEmergency;
      default: return type;
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'PENDING':     return i18n.maintenancePending;
      case 'IN_PROGRESS': return i18n.maintenanceInProgress;
      case 'COMPLETED':   return i18n.maintenanceCompleted;
      case 'CANCELLED':   return i18n.maintenanceCancelled;
      default: return status;
    }
  }

  const FILTERS: {key: StatusFilter; label: string}[] = [
    {key: 'ALL',         label: i18n.filterAll},
    {key: 'PENDING',     label: i18n.maintenancePending},
    {key: 'IN_PROGRESS', label: i18n.maintenanceInProgress},
    {key: 'COMPLETED',   label: i18n.maintenanceCompleted},
    {key: 'CANCELLED',   label: i18n.maintenanceCancelled},
  ];

  const items = filtered();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={[styles.headerRow, !rtl && {flexDirection: 'row-reverse'}]}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <AppIcon name={rtl ? "arrow-right" : "arrow-left"} size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.maintenanceScreenTitle}</Text>
          <View style={[styles.headerActions, rtl && {flexDirection: 'row-reverse'}]}>
            <TouchableOpacity style={styles.iconBtn} onPress={onAddPress}>
              <AppIcon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => {
              if (searchOpen && searchQuery) setSearchQuery('');
              setSearchOpen(p => !p);
            }}>
              <AppIcon name="magnify" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSub}>{items.length} {i18n.maintenanceUnit}</Text>

        {searchOpen && (
          <View style={styles.searchWrap}>
            <AppIcon name="magnify" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={i18n.searchMaintenance}
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <AppIcon name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* White panel */}
      <View style={styles.panel}>
        {/* Status filter pills */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={f => f.key}
          showsHorizontalScrollIndicator={false}
          style={{flexGrow: 0, alignSelf: rtl ? 'flex-end' : 'flex-start'}}
          contentContainerStyle={[styles.filterRow, {flexDirection: rtl ? 'row-reverse' : 'row'}]}
          renderItem={({item: f}) => (
            <TouchableOpacity
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* List */}
        <FlatList
          data={items}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          renderItem={({item}) => {
            const sc = statusColors(item.status);
            return (
              <TouchableOpacity style={styles.card} onPress={() => onSelectItem(item.id)} activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                  <View style={{flex: 1}}>
                    <Text style={styles.cardPlate}>{item.vehicle?.plateNumber ?? '—'}</Text>
                    <Text style={styles.cardSub}>{item.vehicle ? `${item.vehicle.make} ${item.vehicle.model}` : ''}</Text>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: sc.bg}]}>
                    <Text style={[styles.statusBadgeText, {color: sc.color}]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>{typeLabel(item.type)}</Text>
                  </View>
                  <Text style={styles.cardDate}>{fmtDate(item.scheduledDate)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <AppIcon name="wrench" size={48} color={Colors.borderLight} />
              <Text style={styles.emptyText}>{i18n.noMaintenance}</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg},
  headerRow: {flexDirection: 'row', alignItems: 'center', paddingBottom: 4},
  headerTitle: {flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center'},
  headerActions: {flexDirection: 'row'},
  headerSub: {color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 12},
  iconBtn: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  searchWrap: {flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, gap: 8},
  searchInput: {flex: 1, color: '#fff', fontSize: 15},
  panel: {flex: 1, backgroundColor: '#f5f5f5', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden'},
  filterRow: {paddingHorizontal: 16, paddingVertical: 14, gap: 8},
  filterPill: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderLight},
  filterPillActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  filterText: {fontSize: 13, color: Colors.textMuted, fontWeight: '600'},
  filterTextActive: {color: '#fff'},
  list: {paddingHorizontal: 16, paddingBottom: 24},
  card: {backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: {width: 0, height: 2}},
  cardHeader: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8},
  cardPlate: {fontSize: 16, fontWeight: '700', color: Colors.textPrimary},
  cardSub: {fontSize: 12, color: Colors.textMuted, marginTop: 2},
  statusBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10},
  statusBadgeText: {fontSize: 12, fontWeight: '700'},
  cardDesc: {fontSize: 13, color: Colors.textMuted, marginBottom: 10, lineHeight: 18},
  cardFooter: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  typePill: {backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8},
  typePillText: {fontSize: 12, color: Colors.primary, fontWeight: '600'},
  cardDate: {fontSize: 12, color: Colors.textMuted},
  emptyWrap: {alignItems: 'center', paddingTop: 60, gap: 12},
  emptyText: {fontSize: 15, color: Colors.textMuted},
});
