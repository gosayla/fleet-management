import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t, isRTL as isRTLFn} from '../lib/i18n';
import {Colors, Radius, Shadow, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {formatDateSmart} from '../lib/dates';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

// ── Types ─────────────────────────────────────────────────────────────────────

interface LinkedVehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
}

interface LinkedDriver {
  id: string;
  fullName: string;
}

interface FleetDocument {
  id: string;
  type: string;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string;
  referenceNumber?: string;
  notes?: string;
  vehicles: LinkedVehicle[];
  drivers: LinkedDriver[];
}

interface DocumentsResponse {
  data: FleetDocument[];
  total: number;
  page: number;
  limit: number;
  expiredCount: number;
  expiringCount: number;
  validCount: number;
}

type StatusFilter = 'all' | 'expired' | 'expiring' | 'valid';
type TypeFilter = string | null;

interface Props {
  locale: Locale;
  onAddPress: () => void;
  onSelectDoc: (doc: FleetDocument) => void;
  initialStatus?: StatusFilter;
}

// ── Doc type label helper ─────────────────────────────────────────────────────

function docTypeLabel(type: string, i18n: ReturnType<typeof t>): string {
  const map: Record<string, string> = {
    DRIVER_LICENSE: i18n.docTypeDriverLicense,
    VEHICLE_INSURANCE: i18n.docTypeVehicleInsurance,
    PERIODIC_INSPECTION: i18n.docTypePeriodicInspection,
    VEHICLE_REGISTRATION: i18n.docTypeVehicleRegistration,
    OPERATION_CARD: i18n.docTypeOperationCard,
    TRANSPORT_PERMIT: i18n.docTypeTransportPermit,
    OWNERSHIP_DEED: i18n.docTypeOwnershipDeed,
  };
  return map[type] ?? i18n.docTypeOther;
}

const ALL_TYPES = [
  'DRIVER_LICENSE',
  'VEHICLE_INSURANCE',
  'PERIODIC_INSPECTION',
  'VEHICLE_REGISTRATION',
  'OPERATION_CARD',
  'TRANSPORT_PERMIT',
  'OWNERSHIP_DEED',
];

// ── Status badge ──────────────────────────────────────────────────────────────

function statusBadge(
  expiryDate: string,
  i18n: ReturnType<typeof t>,
): {label: string; color: string; bg: string} {
  const now = new Date();
  const exp = new Date(expiryDate);
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (exp < now) return {label: i18n.statusExpired, color: '#fff', bg: Colors.danger ?? '#E53935'};
  if (exp <= soon) return {label: i18n.statusExpiring, color: '#fff', bg: Colors.warning ?? '#F57C00'};
  return {label: i18n.statusValid, color: '#fff', bg: Colors.success ?? '#2E7D32'};
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminDocumentsScreen({locale, onAddPress, onSelectDoc, initialStatus = 'all'}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState<FleetDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 20;

  async function fetchDocs(p: number, replace: boolean, isRefresh = false) {
    if (replace) {
      isRefresh ? setRefreshing(true) : setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params: Record<string, string> = {
        page: String(p),
        limit: String(LIMIT),
        status: statusFilter,
      };
      if (typeFilter) params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const qs = new URLSearchParams(params).toString();
      const res = await api.get<DocumentsResponse>(`/documents?${qs}`);
      const fetched = res.data ?? [];
      setTotal(res.total ?? 0);
      setDocs(prev => replace ? fetched : [...prev, ...fetched]);
      setPage(p);
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  // Re-fetch on filter change
  useEffect(() => {
    fetchDocs(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  function onRefresh() {
    fetchDocs(1, true, true);
  }

  function onSearch() {
    fetchDocs(1, true);
  }

  function loadMore() {
    if (loadingMore || docs.length >= total) return;
    fetchDocs(page + 1, false);
  }

  // ── Status chips ────────────────────────────────────────────────────────────

  const STATUS_TABS: {key: StatusFilter; label: string}[] = [
    {key: 'all', label: i18n.allDocs},
    {key: 'expired', label: i18n.expiredDocs},
    {key: 'expiring', label: i18n.expiringDocs2},
    {key: 'valid', label: i18n.validDocs},
  ];

  // ── Render item ─────────────────────────────────────────────────────────────

  const renderItem = useCallback(({item}: {item: FleetDocument}) => {
    const badge = statusBadge(item.expiryDate, i18n);
    const typeStr = docTypeLabel(item.type, i18n);
    const linkedPlates = item.vehicles.map(v => v.plateNumber);
    const linkedDrivers = item.drivers.map(d => d.fullName);
    const allLinked = [...linkedPlates, ...linkedDrivers];

    return (
      <TouchableOpacity style={styles.card} onPress={() => onSelectDoc(item)} activeOpacity={0.85}>
        {/* Header row: type + badge */}
        <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
          <View style={styles.iconWrap}>
            <AppIcon name="file-document-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={[styles.typeText, isRTL && styles.rtlText]} numberOfLines={1}>
            {typeStr}
          </Text>
          <View style={[styles.badge, {backgroundColor: badge.bg}]}>
            <Text style={[styles.badgeText, {color: badge.color}]}>{badge.label}</Text>
          </View>
        </View>

        {/* Linked plates / drivers */}
        {allLinked.length > 0 && (
          <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
            <AppIcon name="link-variant" size={13} color={Colors.textMuted} />
            <Text style={[styles.metaText, isRTL && styles.rtlText]} numberOfLines={1}>
              {allLinked.join(' · ')}
            </Text>
          </View>
        )}

        {/* Dates */}
        <View style={[styles.datesRow, isRTL && styles.rowReverse]}>
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.issueDateLabel}</Text>
            <Text style={styles.dateValue}>{formatDateSmart(item.issueDate, locale)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.expiryLabel}</Text>
            <Text style={[styles.dateValue, badge.bg !== (Colors.success ?? '#2E7D32') && {color: badge.bg}]}>
              {formatDateSmart(item.expiryDate, locale)}
            </Text>
          </View>
        </View>

        {/* Reference number if any */}
        {!!item.referenceNumber && (
          <Text style={[styles.refText, isRTL && styles.rtlText]} numberOfLines={1}>
            # {item.referenceNumber}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [i18n, isRTL, locale, onSelectDoc]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        <View style={{height: SB_HEIGHT}} />
        <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
          <View style={{width: 38}} />
          <Text style={styles.headerTitle}>{i18n.documents}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onAddPress} activeOpacity={0.7}>
            <AppIcon name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, isRTL && styles.rowReverse]}>
          <AppIcon name="magnify" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={[styles.searchInput, isRTL && styles.rtlText]}
            placeholder={i18n.searchPlaceholder}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            textAlign={isRTL ? 'right' : 'left'}
          />
          {!!search && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchDocs(1, true); }}>
              <AppIcon name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status tabs */}
        <View style={[styles.statusRow, isRTL && styles.rowReverse]}>
          {STATUS_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statusTab, statusFilter === tab.key && styles.statusTabActive]}
              onPress={() => setStatusFilter(tab.key)}
              activeOpacity={0.8}>
              <Text style={[styles.statusTabText, statusFilter === tab.key && styles.statusTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* White panel */}
      <View style={styles.panel}>
        {/* Type filter chips — ScrollView keeps this row height-independent */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChips}
          style={styles.typeChipsScroll}>
          {ALL_TYPES.map(typ => (
            <TouchableOpacity
              key={typ}
              style={[styles.typeChip, typeFilter === typ && styles.typeChipActive]}
              onPress={() => setTypeFilter(typeFilter === typ ? null : typ)}
              activeOpacity={0.8}>
              <Text style={[styles.typeChipText, typeFilter === typ && styles.typeChipTextActive]}>
                {docTypeLabel(typ, i18n)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Docs list — flex: 1 so it fills remaining space below chips */}
        <View style={styles.docsArea}>
        {loading && docs.length === 0 ? (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={docs}
            keyExtractor={d => d.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={[styles.empty, isRTL && styles.rtlText]}>{i18n.noDocuments}</Text>
            }
            ListFooterComponent={
              loadingMore ? <ActivityIndicator style={{marginVertical: 12}} color={Colors.primary} /> : null
            }
          />
        )}
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {paddingBottom: 8},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  headerTitle: {fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 0.3},
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {flex: 1, color: '#fff', fontSize: 14, padding: 0},
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statusTabActive: {backgroundColor: '#fff'},
  statusTabText: {fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600'},
  statusTabTextActive: {color: Colors.primary},
  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -4,
    overflow: 'hidden',
  },
  typeChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  typeChips: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 8,
    alignItems: 'center',
  },
  docsArea: {
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight ?? '#E8F5E9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  typeChipText: {fontSize: 12, color: Colors.textSecondary, fontWeight: '500'},
  typeChipTextActive: {color: Colors.primary, fontWeight: '700'},
  list: {padding: Spacing.md, gap: Spacing.sm, paddingBottom: 24},
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 10,
    ...Shadow.sm,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight ?? '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {flex: 1, ...Typography.bodyMd, color: Colors.textPrimary, fontWeight: '600'},
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {fontSize: 11, fontWeight: '700'},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  metaText: {...Typography.bodySm, color: Colors.textSecondary, flex: 1},
  datesRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  datePair: {flex: 1},
  dateLabel: {...Typography.caption, color: Colors.textMuted, marginBottom: 2},
  dateValue: {...Typography.bodySm, color: Colors.textPrimary, fontWeight: '500'},
  divider: {width: 1, height: 30, backgroundColor: Colors.border ?? '#E0E0E0'},
  refText: {...Typography.caption, color: Colors.textMuted},
  centred: {flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60},
  empty: {textAlign: 'center', ...Typography.bodySm, color: Colors.textMuted, marginTop: 40},
  rowReverse: {flexDirection: 'row-reverse'},
  rtlText: {textAlign: 'right'},
});
