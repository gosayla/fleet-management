import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t, isRTL} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
type ActionFilter = AuditAction | 'ALL';

interface AuditLog {
  id: string;
  userFullName: string | null;
  userRole: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  route: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_COLORS: Record<AuditAction, {bg: string; text: string}> = {
  CREATE: {bg: '#dcfce7', text: '#15803d'},
  UPDATE: {bg: '#dbeafe', text: '#1d4ed8'},
  DELETE: {bg: '#fee2e2', text: '#dc2626'},
  LOGIN:  {bg: '#f3e8ff', text: '#7c3aed'},
  LOGOUT: {bg: '#f1f5f9', text: '#475569'},
};

const ROLE_SHORT: Record<string, string> = {
  SUPER_ADMIN:      'Super Admin',
  FLEET_MANAGER:    'Fleet Manager',
  DISPATCHER:       'Dispatcher',
  DRIVER:           'Driver',
  VIEWER:           'Viewer',
  MAINTENANCE_TECH: 'Maintenance Tech',
};

const ENTITY_LABEL: Record<string, string> = {
  Vehicle:        'Vehicle',
  Driver:         'Driver',
  Trip:           'Trip',
  MaintenanceLog: 'Maintenance Record',
  FuelLog:        'Fuel Log',
  Document:       'Document',
  User:           'User',
  VehicleRental:  'Rental',
  TripContract:   'Contract',
  Settings:       'Settings',
  AuditLog:       'Activity Log',
  Authentication: 'Authentication',
  auth:           'Authentication',
};

function describeLog(item: AuditLog): string {
  const actor =
    item.userFullName ??
    (item.userRole ? (ROLE_SHORT[item.userRole] ?? item.userRole) : null) ??
    'Unknown User';
  const entity = ENTITY_LABEL[item.entity] ?? item.entity;
  switch (item.action) {
    case 'LOGIN':  return `${actor} signed in`;
    case 'LOGOUT': return `${actor} signed out`;
    case 'CREATE': return `${actor} created a ${entity}`;
    case 'UPDATE': return `${actor} updated ${entity}`;
    case 'DELETE': return `${actor} deleted a ${entity}`;
    default:       return `${actor} performed a ${entity} action`;
  }
}

function changesText(changes: Record<string, unknown> | null): string | null {
  if (!changes || typeof changes !== 'object') return null;
  const keys = Object.keys(changes);
  if (keys.length === 0) return null;
  const readable = keys.map(k =>
    k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim(),
  );
  return readable.join(', ');
}

const FILTERS: ActionFilter[] = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const PAGE_SIZE = 25;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: '2-digit'}) +
    ' ' + d.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true});
}

interface Props {
  locale: Locale;
  onBack?: () => void;
}

export function AuditLogScreen({locale, onBack}: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ActionFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // track current filter/page in ref so fetchPage can use fresh values
  const filterRef = useRef(filter);
  filterRef.current = filter;

  async function fetchPage(p: number, f: ActionFilter, append = false) {
    const params = new URLSearchParams({
      page: String(p),
      limit: String(PAGE_SIZE),
      ...(f !== 'ALL' && {action: f}),
    });
    const res = await api.get<AuditLogsResponse>(`/audit-logs?${params}`);
    if (append) {
      setLogs(prev => [...prev, ...res.data]);
    } else {
      setLogs(res.data);
    }
    setTotalPages(res.totalPages);
    setPage(p);
  }

  async function load(f: ActionFilter = filter) {
    setInitialLoading(true);
    try {
      await fetchPage(1, f);
    } catch {}
    setInitialLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await fetchPage(1, filter);
    } catch {}
    setRefreshing(false);
  }

  async function loadMore() {
    if (page >= totalPages || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, filter, true);
    } catch {}
    setLoadingMore(false);
  }

  function changeFilter(f: ActionFilter) {
    setFilter(f);
    setLogs([]);
    load(f);
  }

  useEffect(() => {
    load();
  }, []);

  const filterLabel = useCallback((f: ActionFilter): string => {
    if (f === 'ALL') return i18n.alAll;
    const map: Record<AuditAction, string> = {
      CREATE: i18n.alActionCreate,
      UPDATE: i18n.alActionUpdate,
      DELETE: i18n.alActionDelete,
      LOGIN:  i18n.alActionLogin,
      LOGOUT: i18n.alActionLogout,
    };
    return map[f];
  }, [i18n]);

  function renderItem({item}: {item: AuditLog}) {
    const colors = ACTION_COLORS[item.action] ?? {bg: '#f1f5f9', text: '#475569'};
    const description = describeLog(item);
    const details = changesText(item.changes);
    return (
      <View style={[styles.card, !rtl && styles.cardRTL]}>
        {/* Left: action badge */}
        <View style={[styles.badge, {backgroundColor: colors.bg}]}>
          <Text style={[styles.badgeText, {color: colors.text}]}>
            {filterLabel(item.action as ActionFilter)}
          </Text>
        </View>

        {/* Right: description + details + time */}
        <View style={styles.cardBody}>
          {/* What happened — human-readable sentence */}
          <Text style={[styles.description, !rtl && styles.textRTL]} numberOfLines={2}>
            {description}
          </Text>

          {/* What fields changed (only for mutations that carried a body) */}
          {details ? (
            <View style={[styles.row, styles.rowRTL]}>
              <AppIcon name="pencil-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.changesText} numberOfLines={1}>{details}</Text>
            </View>
          ) : null}

          {/* Timestamp */}
          <View style={[styles.row, styles.rowRTL]}>
            <AppIcon name="clock-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.dateText}>{fmtDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderFooter() {
    if (loadingMore) {
      return <ActivityIndicator color={Colors.primary} style={{marginVertical: 16}} />;
    }
    if (page < totalPages) {
      return (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
          <Text style={styles.loadMoreText}>{i18n.alLoadMore}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={[styles.header, {paddingTop: SB_HEIGHT + 12}]}>
        <View style={[styles.headerRow, {flexDirection: !rtl ? 'row-reverse' : 'row'}]}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <AppIcon name={rtl ? 'chevron-right' : 'chevron-left'} size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <AppIcon name="clipboard-list-outline" size={22} color={Colors.primary} />
          <Text style={[styles.title, rtl && styles.textRTL]}>{i18n.auditLog}</Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={[styles.filterWrap, {direction: !rtl ? 'rtl' : 'ltr'}]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterRow, !rtl && styles.filterRowRTL]}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, filter === f && styles.pillActive]}
              onPress={() => changeFilter(f)}
            >
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                {filterLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>{i18n.alLoading}</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.center}>
          <AppIcon name="clipboard-text-off-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>{i18n.alEmpty}</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[Colors.primary]} tintColor={Colors.primary} />
          }
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.bg},
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  backBtn: {marginEnd: 4},
  title: {fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginStart: 6},
  filterWrap: {backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb'},
  filterRow: {flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center'},
  filterRowRTL: {flexDirection: 'row-reverse'},
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  pillText: {fontSize: 12, fontWeight: '600', color: '#64748b'},
  pillTextActive: {color: '#fff'},
  listContent: {padding: Spacing.md, gap: 10, paddingBottom: 100},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  cardRTL: {flexDirection: 'row-reverse'},
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: {fontSize: 11, fontWeight: '700', textAlign: 'center'},
  cardBody: {flex: 1, gap: 5},
  row: {flexDirection: 'row', alignItems: 'center', gap: 5},
  rowRTL: {flexDirection: 'row-reverse'},
  textRTL: {textAlign: 'right'},
  description: {fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 19},
  changesText: {fontSize: 11, color: '#6b7280', flex: 1},
  dateText: {fontSize: 11, color: Colors.textSecondary},
  loadMoreBtn: {
    alignSelf: 'center',
    marginVertical: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  loadMoreText: {fontSize: 13, fontWeight: '600', color: '#fff'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12},
  loadingText: {fontSize: 14, color: Colors.textSecondary},
  emptyText: {fontSize: 14, color: Colors.textSecondary},
});
