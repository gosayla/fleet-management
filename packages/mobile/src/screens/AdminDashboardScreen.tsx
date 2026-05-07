import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import {api} from '../lib/api';
import {FleetStats} from '@fleet/shared';
import {useAuth} from '../context/AuthContext';
import {Locale} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

interface Props {
  locale: Locale;
  onToggleLocale: () => void;
}

interface MaintenanceItem {
  id: string;
  type: string;
  description: string;
  scheduledDate: string;
  status: string;
  vehicle?: {plateNumber: string};
}

interface ExpiryDoc {
  id: string;
  type: string;
  expiryDate: string;
  vehicles?: {plateNumber: string}[];
  drivers?: {fullName: string}[];
}

const SB_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const MAINTENANCE_ICON: Record<string, string> = {
  OIL_CHANGE: 'oil',
  TIRE_ROTATION: 'tire',
  FILTER_CHANGE: 'air-filter',
  BRAKE_SERVICE: 'car-brake-hold',
  ENGINE_SERVICE: 'engine-outline',
  TRANSMISSION: 'car-cog',
  INSPECTION: 'clipboard-check-outline',
};

const DOC_LABELS_BRIEF: Record<string, {en: string; ar: string}> = {
  VEHICLE_REGISTRATION: {en: 'Vehicle Registration', ar: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u0631\u0643\u0628\u0629'},
  VEHICLE_INSURANCE:    {en: 'Vehicle Insurance',    ar: '\u062a\u0623\u0645\u064a\u0646 \u0627\u0644\u0645\u0631\u0643\u0628\u0629'},
  PERIODIC_INSPECTION:  {en: 'Periodic Inspection',  ar: '\u0627\u0644\u0641\u062d\u0635 \u0627\u0644\u062f\u0648\u0631\u064a'},
  DRIVER_LICENSE:       {en: 'Driving License',      ar: '\u0631\u062e\u0635\u0629 \u0627\u0644\u0642\u064a\u0627\u062f\u0629'},
  TRANSPORT_PERMIT:     {en: 'Transport Permit',     ar: '\u062a\u0635\u0631\u064a\u062d \u0646\u0642\u0644'},
  OWNERSHIP_DEED:       {en: 'Ownership Deed',       ar: '\u0639\u0642\u062f \u0627\u0644\u0645\u0644\u0643\u064a\u0629'},
  OPERATION_CARD:       {en: 'Operation Card',       ar: '\u0628\u0637\u0627\u0642\u0629 \u062a\u0634\u063a\u064a\u0644'},
};

export function AdminDashboardScreen({locale, onToggleLocale}: Props) {
  const {user} = useAuth();
  const isAr = locale === 'ar';
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<ExpiryDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const [s, m, docs] = await Promise.all([
        api.get<FleetStats>('/dashboard/stats'),
        api.get<MaintenanceItem[]>('/maintenance'),
        api.get<{expired: ExpiryDoc[]; critical: ExpiryDoc[]; warning: ExpiryDoc[]}>('/documents/expiring'),
      ]);
      setStats(s);
      setMaintenance(
        (Array.isArray(m) ? m : [])
          .filter((x: MaintenanceItem) => x.status === 'SCHEDULED')
          .slice(0, 3),
      );
      // Merge expired + critical (most urgent)
      const urgent = [...(docs.expired ?? []), ...(docs.critical ?? [])].slice(0, 5);
      setExpiringDocs(urgent);
    } catch {}
    finally {setRefreshing(false);}
  }

  useEffect(() => {load();}, []);

  const fullName = (user as any)?.fullName ?? (user as any)?.name ?? user?.email ?? 'Admin';
  const firstName = fullName.split(' ')[0];
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <View style={{height: SB_HEIGHT}} />
        <View style={styles.topRow}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>{isAr ? 'أهلاً!' : 'Welcome!'}</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
            <AppIcon name="bell-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.primary} />}>

        {/* ── Live GPS section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isAr ? 'GPS مباشر' : 'Live GPS'}</Text>
            <TouchableOpacity><Text style={styles.seeAll}>{isAr ? 'عرض الكل' : 'See all'}</Text></TouchableOpacity>
          </View>
          <View style={styles.mapBox}>
            {/* Map-like decorative background */}
            <View style={styles.mapGrid}>
              {[...Array(6)].map((_, i) => (
                <View key={`h${i}`} style={[styles.mapLine, styles.mapLineH, {top: `${15 + i * 14}%`}]} />
              ))}
              {[...Array(5)].map((_, i) => (
                <View key={`v${i}`} style={[styles.mapLine, styles.mapLineV, {left: `${10 + i * 20}%`}]} />
              ))}
            </View>
            {/* Route line */}
            <View style={styles.routeLine} />
            {/* Vehicle pin */}
            <View style={styles.vehiclePin}>
              <View style={styles.vehiclePinInner}>
                <AppIcon name="truck-outline" size={16} color={Colors.primary} />
              </View>
            </View>
            {/* Stats overlay */}
            <View style={styles.mapStats}>
              {stats && (
                <>
                  <View style={styles.mapStat}>
                    <AppIcon name="truck-outline" size={14} color={Colors.primary} />
                    <Text style={styles.mapStatText}>{stats.activeVehicles} {isAr ? 'نشط' : 'active'}</Text>
                  </View>
                  <View style={styles.mapStat}>
                    <AppIcon name="map-marker-path" size={14} color={Colors.purple} />
                    <Text style={styles.mapStatText}>{stats.tripsInProgress} {isAr ? 'رحلة' : 'trips'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ── Spending section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isAr ? 'الإنفاق' : 'Spending'}</Text>
            <TouchableOpacity><Text style={styles.seeAll}>{isAr ? 'عرض الكل' : 'See all'}</Text></TouchableOpacity>
          </View>
          <View style={styles.spendingBox}>
            <SpendingLineChart peakValue={stats?.fuelConsumedThisMonth ?? null} />
          </View>
        </View>

        {/* ── Upcoming Deadlines ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isAr ? 'المواعيد القادمة' : 'Upcoming Deadlines'}</Text>
            <TouchableOpacity><Text style={styles.seeAll}>{isAr ? 'عرض الكل' : 'See all'}</Text></TouchableOpacity>
          </View>
          {maintenance.length === 0 ? (
            <View style={styles.emptyDeadline}>
              <AppIcon name="calendar-check-outline" size={32} color={Colors.border} />
              <Text style={styles.emptyDeadlineText}>{isAr ? 'لا توجد مواعيد' : 'No upcoming deadlines'}</Text>
            </View>
          ) : (
            maintenance.map((item, i) => {
              const highlighted = i === maintenance.length - 1;
              const date = new Date(item.scheduledDate);
              const dateStr = `${isAr ? 'بتاريخ' : 'Due On:'} ${date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}`;
              const iconName = MAINTENANCE_ICON[item.type] ?? 'wrench-outline';
              return (
                <View key={item.id} style={[styles.deadlineRow, highlighted && styles.deadlineRowHL]}>
                  <View style={[styles.deadlineIcon, highlighted && styles.deadlineIconHL]}>
                    <AppIcon name={iconName} size={20} color={highlighted ? '#fff' : Colors.primary} />
                  </View>
                  <View style={styles.deadlineBody}>
                    <Text style={[styles.deadlineTitle, highlighted && styles.deadlineTextHL]} numberOfLines={1}>
                      {item.description || item.type.replace(/_/g,' ')}
                    </Text>
                    <Text style={[styles.deadlineDate, highlighted && styles.deadlineTextHL]}>{dateStr}</Text>
                  </View>
                  <AppIcon name="arrow-right" size={20} color={highlighted ? '#fff' : Colors.primary} />
                </View>
              );
            })
          )}
        </View>

        {/* ── Stat pills ── */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isAr ? 'نظرة عامة' : 'Overview'}</Text>
            <View style={styles.pills}>
              {[
                {icon:'truck-outline',         label: isAr?'مركبات':'Vehicles',  value: stats.totalVehicles,      color: Colors.primary},
                {icon:'account-group-outline', label: isAr?'سائقون':'Drivers',   value: stats.totalDrivers,       color: Colors.success},
                {icon:'map-marker-path',       label: isAr?'رحلات اليوم':'Today', value: stats.tripsToday,         color: Colors.purple},
                {icon:'wrench-outline',        label: isAr?'صيانة':'Maintenance', value: stats.pendingMaintenance, color: Colors.warning},
              ].map((p, i) => (
                <View key={i} style={styles.pill}>
                  <View style={[styles.pillIcon, {backgroundColor: p.color + '18'}]}>
                    <AppIcon name={p.icon} size={18} color={p.color} />
                  </View>
                  <Text style={styles.pillValue}>{p.value}</Text>
                  <Text style={styles.pillLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Document Expiry Alert ── */}
        {expiringDocs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isAr ? 'وثائق منتهية / قريبة الانتهاء' : 'Expiring Documents'}</Text>
            </View>
            {expiringDocs.map((doc, idx) => {
              const now = new Date();
              const expiry = new Date(doc.expiryDate);
              const isExpired = expiry < now;
              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const subject = doc.vehicles?.[0]?.plateNumber ?? doc.drivers?.[0]?.fullName ?? '—';
              const expiryStr = expiry.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
              return (
                <View key={doc.id} style={[styles.deadlineRow, isExpired && {borderLeftWidth: 3, borderLeftColor: '#e74c3c'}]}>
                  <View style={[styles.deadlineIcon, {backgroundColor: isExpired ? '#fdecea' : '#fff3e0'}]}>
                    <AppIcon name="file-alert-outline" size={20} color={isExpired ? '#e74c3c' : '#e67e22'} />
                  </View>
                  <View style={styles.deadlineBody}>
                    <Text style={styles.deadlineTitle} numberOfLines={1}>
                      {(DOC_LABELS_BRIEF[doc.type]?.[isAr ? 'ar' : 'en']) ?? doc.type.replace(/_/g,' ')} — {subject}
                    </Text>
                    <Text style={[styles.deadlineDate, {color: isExpired ? '#e74c3c' : '#e67e22'}]}>
                      {isExpired
                        ? (isAr ? `منتهية منذ ${Math.abs(daysLeft)} يوم` : `Expired ${Math.abs(daysLeft)}d ago`)
                        : (isAr ? `تنتهي خلال ${daysLeft} يوم` : `Expires in ${daysLeft}d`)}
                      {' · '}{expiryStr}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{height: Spacing.xl}} />
      </ScrollView>
    </View>
  );
}

// ─── Spending line chart (pure RN, no SVG) ──────────────────────────────────
const CHART_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const CHART_DATA   = [0.22, 0.38, 0.28, 0.52, 0.88, 0.65, 0.42, 0.58]; // May is peak
const ACTIVE_IDX   = 4; // May

function SpendingLineChart({peakValue}: {peakValue: number | null}) {
  const [w, setW] = useState(0);
  const H = 90;
  const PAD_Y = 16;

  const pts = CHART_DATA.map((v, i) => ({
    x: w > 0 ? (i / (CHART_DATA.length - 1)) * w : 0,
    y: PAD_Y + (H - PAD_Y * 2) * (1 - v),
  }));

  const segs = pts.slice(0, -1).map((p, i) => {
    const q = pts[i + 1];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return {mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, len, angle};
  });

  const peak = pts[ACTIVE_IDX];
  const peakLabel = peakValue != null && peakValue > 0
    ? `${Math.round(peakValue).toLocaleString()} L`
    : '$1,230'; // fallback display value

  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)}>
      {/* Peak label above chart */}
      <Text style={lcStyles.peakLabel}>{peakLabel}</Text>

      {/* Line chart area */}
      <View style={[lcStyles.chartArea, {height: H}]}>
        {w > 0 && (
          <>
            {/* Line segments */}
            {segs.map((s, i) => (
              <View
                key={i}
                style={[lcStyles.seg, {
                  left: s.mx - s.len / 2,
                  top: s.my - 1.5,
                  width: s.len,
                  transform: [{rotate: `${s.angle}deg`}],
                }]}
              />
            ))}
            {/* Dashed vertical from peak to bottom */}
            {Array.from({length: 7}, (_, di) => (
              <View
                key={`d${di}`}
                style={[lcStyles.dashSeg, {
                  left: peak.x - 0.5,
                  top: peak.y + 10 + di * 9,
                }]}
              />
            ))}
            {/* Peak dot (outer ring + inner) */}
            <View style={[lcStyles.peakRing, {left: peak.x - 8, top: peak.y - 8}]} />
            <View style={[lcStyles.peakDot, {left: peak.x - 5, top: peak.y - 5}]} />
          </>
        )}
      </View>

      {/* Month axis */}
      <View style={lcStyles.axis}>
        {CHART_MONTHS.map((m, i) => (
          <Text
            key={m}
            style={[lcStyles.axisLabel, i === ACTIVE_IDX && lcStyles.axisLabelActive]}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

const lcStyles = StyleSheet.create({
  peakLabel: {fontSize: 13, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 2},
  chartArea: {position: 'relative', overflow: 'visible'},
  seg: {
    position: 'absolute',
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    opacity: 0.95,
  },
  dashSeg: {position: 'absolute', width: 1, height: 5, backgroundColor: Colors.textMuted},
  peakRing: {position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primaryLight},
  peakDot: {position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary},
  axis: {flexDirection: 'row', marginTop: 10},
  axisLabel: {flex: 1, textAlign: 'center', fontSize: 10, color: Colors.textMuted},
  axisLabelActive: {color: Colors.primary, fontWeight: '700' as const},
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},

  // Top bar
  topBar: {backgroundColor: Colors.bg, paddingHorizontal: Spacing.md, paddingBottom: 8},
  topRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8},
  userRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  avatarCircle: {width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center'},
  avatarText: {fontSize: 17, fontWeight: '700' as const, color: '#fff'},
  welcomeText: {fontSize: 12, color: Colors.textMuted},
  userName: {fontSize: 18, fontWeight: '800' as const, color: Colors.primary},
  bellBtn: {width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center'},

  // Scroll
  scroll: {paddingHorizontal: Spacing.md, paddingTop: 4},

  // Section
  section: {marginBottom: Spacing.lg},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  sectionTitle: {fontSize: 17, fontWeight: '700' as const, color: Colors.textPrimary},
  seeAll: {fontSize: 13, color: Colors.primary, fontWeight: '600' as const},

  // Map box
  mapBox: {height: 160, borderRadius: 16, backgroundColor: '#E8F3F2', overflow: 'hidden', position: 'relative'},
  mapGrid: {position: 'absolute', width: '100%', height: '100%'},
  mapLine: {position: 'absolute', backgroundColor: 'rgba(36,124,118,0.12)'},
  mapLineH: {left: 0, right: 0, height: 1},
  mapLineV: {top: 0, bottom: 0, width: 1},
  routeLine: {
    position: 'absolute', left: '20%', top: '35%', width: '60%', height: 3,
    backgroundColor: Colors.primary, borderRadius: 2, transform: [{rotate: '15deg'}],
  },
  vehiclePin: {position: 'absolute', left: '55%', top: '25%', alignItems: 'center'},
  vehiclePinInner: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: {width:0, height:2}, shadowRadius: 4},
  mapStats: {position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 8},
  mapStat: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: {width:0,height:1}, shadowRadius: 3},
  mapStatText: {fontSize: 12, fontWeight: '600' as const, color: Colors.textPrimary},

  // Spending chart
  spendingBox: {backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight},

  // Deadlines
  deadlineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  deadlineRowHL: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  deadlineIcon: {width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center'},
  deadlineIconHL: {backgroundColor: 'rgba(255,255,255,0.25)'},
  deadlineBody: {flex: 1},
  deadlineTitle: {fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary},
  deadlineDate: {fontSize: 12, color: Colors.textMuted, marginTop: 2},
  deadlineTextHL: {color: '#fff'},
  emptyDeadline: {alignItems: 'center', paddingVertical: 24, gap: 8, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight},
  emptyDeadlineText: {fontSize: 14, color: Colors.textMuted},

  // Pills
  pills: {flexDirection: 'row', gap: 10},
  pill: {flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.borderLight},
  pillIcon: {width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center'},
  pillValue: {fontSize: 20, fontWeight: '800' as const, color: Colors.textPrimary},
  pillLabel: {fontSize: 11, color: Colors.textMuted, textAlign: 'center'},
});