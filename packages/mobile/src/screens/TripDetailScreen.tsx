import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {api} from '../lib/api';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {Locale} from '../lib/i18n';

interface TripDetail {
  id: string;
  name?: string;
  origin: string;
  destination: string;
  status: string;
  tripType: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  distanceKm?: number;
  notes?: string;
  clientName?: string;
  contractNumber?: string;
  driver?: {id: string; fullName: string; phone: string; licenseNumber: string};
  vehicle?: {id: string; plateNumber: string; make: string; model: string; type: string};
}

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const STATUS_CONFIG: Record<string, {label: {en: string; ar: string}; color: string; bg: string; icon: string}> = {
  SCHEDULED:   {label: {en: 'Scheduled',  ar: 'مجدولة'},   color: Colors.info,      bg: Colors.infoLight,    icon: 'clock-outline'},
  IN_PROGRESS: {label: {en: 'In Progress', ar: 'جارية'},    color: Colors.success,   bg: Colors.successLight, icon: 'truck-fast-outline'},
  COMPLETED:   {label: {en: 'Completed',  ar: 'مكتملة'},   color: Colors.textMuted, bg: Colors.borderLight,  icon: 'check-circle-outline'},
  CANCELLED:   {label: {en: 'Cancelled',  ar: 'ملغاة'},    color: Colors.danger,    bg: Colors.dangerLight,  icon: 'close-circle-outline'},
};

const TRIP_TYPE_LABELS: Record<string, {en: string; ar: string}> = {
  ONE_TIME:         {en: 'One Time',         ar: 'مرة واحدة'},
  DAILY:            {en: 'Daily',            ar: 'يومية'},
  MONTHLY_CONTRACT: {en: 'Monthly Contract', ar: 'عقد شهري'},
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}) + ' ' +
    d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
}

interface Props {
  tripId: string;
  locale: Locale;
  onBack: () => void;
  onEdit?: () => void;
}

export function TripDetailScreen({tripId, locale, onBack, onEdit}: Props) {
  const isAr = locale === 'ar';
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TripDetail>(`/trips/${tripId}`)
      .then(setTrip)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{isAr ? 'تعذر تحميل البيانات' : 'Could not load trip'}</Text>
        <TouchableOpacity onPress={onBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>{isAr ? 'رجوع' : 'Go back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.SCHEDULED;
  const tripTypeCfg = TRIP_TYPE_LABELS[trip.tripType];
  const displayName = trip.name || `${trip.origin} → ${trip.destination}`;

  const durationMs = trip.scheduledEnd && trip.scheduledStart
    ? new Date(trip.scheduledEnd).getTime() - new Date(trip.scheduledStart).getTime()
    : 0;
  const durationHrs = durationMs > 0 ? (durationMs / 3_600_000).toFixed(1) : '—';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Teal header */}
      <View style={styles.header}>
        {/* Grid decoration */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0.3, 0.65].map(f => (
            <View key={`h${f}`} style={[styles.gridLineH, {top: `${Math.round(f * 100)}%` as any}]} />
          ))}
          {[0.25, 0.5, 0.75].map(f => (
            <View key={`v${f}`} style={[styles.gridLineV, {left: `${Math.round(f * 100)}%` as any}]} />
          ))}
        </View>

        {/* Top bar */}
        <View style={[styles.topBar, {paddingTop: SB_H + 6}]}>
          <TouchableOpacity style={styles.circleBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>{isAr ? 'تفاصيل الرحلة' : 'Trip Details'}</Text>
          {onEdit ? (
            <TouchableOpacity style={styles.circleBtn} onPress={onEdit} activeOpacity={0.8}>
              <AppIcon name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{width: 36}} />
          )}
        </View>

        {/* Route display */}
        <View style={styles.routeSection}>
          <Text style={styles.tripNameText} numberOfLines={2}>{displayName}</Text>
          {trip.name && (
            <Text style={styles.routeSubText}>{trip.origin} → {trip.destination}</Text>
          )}
          <View style={[styles.statusPill, {backgroundColor: statusCfg.bg}]}>
            <AppIcon name={statusCfg.icon} size={13} color={statusCfg.color} />
            <Text style={[styles.statusPillText, {color: statusCfg.color}]}>
              {statusCfg.label[isAr ? 'ar' : 'en']}
            </Text>
          </View>
        </View>
      </View>

      {/* White curved panel */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}>

        {/* 3-col info strip */}
        <View style={styles.infoStrip}>
          <InfoCol label={isAr ? 'النوع' : 'Type'} value={tripTypeCfg?.[isAr ? 'ar' : 'en'] ?? trip.tripType} />
          <View style={styles.stripDiv} />
          <InfoCol label={isAr ? 'المدة' : 'Duration'} value={durationHrs !== '—' ? `${durationHrs}h` : '—'} highlight />
          <View style={styles.stripDiv} />
          <InfoCol label={isAr ? 'المسافة' : 'Distance'} value={trip.distanceKm ? `${trip.distanceKm} km` : '—'} />
        </View>

        {/* Schedule card */}
        <Text style={styles.sectionTitle}>{isAr ? 'الجدول الزمني' : 'Schedule'}</Text>
        <View style={styles.infoCard}>
          <InfoRow
            icon="clock-start"
            label={isAr ? 'البداية المجدولة' : 'Scheduled Start'}
            value={fmtDateTime(trip.scheduledStart)}
          />
          <InfoRow
            icon="clock-end"
            label={isAr ? 'النهاية المجدولة' : 'Scheduled End'}
            value={fmtDateTime(trip.scheduledEnd)}
            noBorder
          />
        </View>
        {(trip.actualStart || trip.actualEnd) && (
          <View style={[styles.infoCard, {marginTop: 8}]}>
            {trip.actualStart && (
              <InfoRow
                icon="play-circle-outline"
                label={isAr ? 'البداية الفعلية' : 'Actual Start'}
                value={fmtDateTime(trip.actualStart)}
                highlight
                noBorder={!trip.actualEnd}
              />
            )}
            {trip.actualEnd && (
              <InfoRow
                icon="stop-circle-outline"
                label={isAr ? 'النهاية الفعلية' : 'Actual End'}
                value={fmtDateTime(trip.actualEnd)}
                highlight
                noBorder
              />
            )}
          </View>
        )}

        {/* Driver */}
        <Text style={[styles.sectionTitle, {marginTop: 20}]}>{isAr ? 'السائق' : 'Driver'}</Text>
        {trip.driver ? (
          <View style={styles.personCard}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitials}>
                {trip.driver.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.personName}>{trip.driver.fullName}</Text>
              <Text style={styles.personSub}>{trip.driver.phone}</Text>
            </View>
            <View style={styles.licenseChip}>
              <Text style={styles.licenseText}>{trip.driver.licenseNumber}</Text>
            </View>
          </View>
        ) : (
          <EmptyCard isAr={isAr} icon="account-outline" text={isAr ? 'لا يوجد سائق' : 'No driver'} />
        )}

        {/* Vehicle */}
        <Text style={[styles.sectionTitle, {marginTop: 20}]}>{isAr ? 'المركبة' : 'Vehicle'}</Text>
        {trip.vehicle ? (
          <View style={styles.personCard}>
            <View style={[styles.personAvatar, {backgroundColor: '#e8f5f4'}]}>
              <AppIcon name="truck" size={22} color={Colors.primary} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.personName}>{trip.vehicle.plateNumber}</Text>
              <Text style={styles.personSub}>{trip.vehicle.make} {trip.vehicle.model}</Text>
            </View>
            <View style={styles.licenseChip}>
              <Text style={styles.licenseText}>{trip.vehicle.type?.replace(/_/g, ' ')}</Text>
            </View>
          </View>
        ) : (
          <EmptyCard isAr={isAr} icon="truck-outline" text={isAr ? 'لا توجد مركبة' : 'No vehicle'} />
        )}

        {/* Extra info */}
        {(trip.clientName || trip.contractNumber || trip.notes) && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>{isAr ? 'معلومات إضافية' : 'Additional Info'}</Text>
            <View style={styles.infoCard}>
              {trip.clientName && (
                <InfoRow
                  icon="account-tie-outline"
                  label={isAr ? 'اسم العميل' : 'Client Name'}
                  value={trip.clientName}
                  noBorder={!trip.contractNumber && !trip.notes}
                />
              )}
              {trip.contractNumber && (
                <InfoRow
                  icon="file-document-outline"
                  label={isAr ? 'رقم العقد' : 'Contract No.'}
                  value={trip.contractNumber}
                  noBorder={!trip.notes}
                />
              )}
              {trip.notes && (
                <InfoRow
                  icon="note-text-outline"
                  label={isAr ? 'ملاحظات' : 'Notes'}
                  value={trip.notes}
                  noBorder
                />
              )}
            </View>
          </>
        )}

        <View style={{height: 32}} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InfoCol({label, value, highlight}: {label: string; value: string; highlight?: boolean}) {
  return (
    <View style={styles.infoCol}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && {color: Colors.primary}]}>{value}</Text>
    </View>
  );
}

function InfoRow({icon, label, value, highlight, noBorder}: {
  icon: string; label: string; value: string; highlight?: boolean; noBorder?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !noBorder && styles.infoRowBorder]}>
      <View style={styles.infoRowIcon}>
        <AppIcon name={icon} size={17} color={highlight ? Colors.primary : Colors.textMuted} />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={[styles.infoRowValue, highlight && {color: Colors.primary}]}>{value}</Text>
      </View>
    </View>
  );
}

function EmptyCard({isAr, icon, text}: {isAr: boolean; icon: string; text: string}) {
  return (
    <View style={styles.emptyCard}>
      <AppIcon name={icon} size={18} color={Colors.textMuted} />
      <Text style={styles.emptyCardText}>{text}</Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, gap: 12},
  errorText: {fontSize: 15, color: Colors.textMuted},
  retryBtn: {paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 20},
  retryText: {color: '#fff', fontWeight: '600' as const},

  header: {backgroundColor: Colors.primary, paddingBottom: 28, overflow: 'hidden'},
  gridLineH: {position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)'},
  gridLineV: {position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.07)'},
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingBottom: 12,
  },
  circleBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerLabel: {fontSize: 16, fontWeight: '600' as const, color: '#fff', opacity: 0.9},
  routeSection: {alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md},
  tripNameText: {fontSize: 20, fontWeight: '800' as const, color: '#fff', textAlign: 'center'},
  routeSubText: {fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center'},
  statusPill: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20},
  statusPillText: {fontSize: 12, fontWeight: '600' as const},

  panel: {flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24},
  panelContent: {padding: Spacing.md},

  infoStrip: {flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginBottom: 14},
  infoCol: {flex: 1, alignItems: 'center', gap: 5},
  infoLabel: {fontSize: 10, color: Colors.textMuted, fontWeight: '500' as const, textAlign: 'center'},
  infoValue: {fontSize: 13, fontWeight: '700' as const, color: Colors.textPrimary, textAlign: 'center'},
  stripDiv: {width: 1, height: 32, backgroundColor: Colors.borderLight},

  sectionTitle: {fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 10},

  infoCard: {backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden'},
  infoRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: Spacing.md},
  infoRowBorder: {borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  infoRowIcon: {width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center'},
  infoRowLabel: {fontSize: 10, color: Colors.textMuted, fontWeight: '500' as const, marginBottom: 2},
  infoRowValue: {fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary},

  personCard: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight, paddingVertical: 14, paddingHorizontal: Spacing.md},
  personAvatar: {width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center'},
  personInitials: {fontSize: 17, fontWeight: '700' as const, color: Colors.primary},
  personName: {fontSize: 15, fontWeight: '700' as const, color: Colors.textPrimary},
  personSub: {fontSize: 12, color: Colors.textMuted, marginTop: 1},
  licenseChip: {backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  licenseText: {fontSize: 11, fontWeight: '600' as const, color: Colors.primary},

  emptyCard: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight, paddingVertical: 16, paddingHorizontal: Spacing.md},
  emptyCardText: {fontSize: 14, color: Colors.textMuted},
});
