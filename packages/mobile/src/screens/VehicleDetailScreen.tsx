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
  Linking,
  Alert,
} from 'react-native';
import {api, resolveApiUrl} from '../lib/api';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {Locale} from '../lib/i18n';

interface VehicleDetail {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  type: string;
  status: string;
  odometer: number;
  fuelCapacity: number;
  lastLocationLat?: number;
  lastLocationLng?: number;
  lastLocationAt?: string;
  licenseExpiryDate?: string;
  inspectionExpiryDate?: string;
  insuranceExpiryDate?: string;
  mvpiStatus?: string;
  insuranceStatus?: string;
  restrictionStatus?: string;
  assignedDriver?: {id: string; fullName: string; phone: string};
  maintenanceLogs?: {id: string; type: string; status: string; scheduledDate: string; description?: string}[];
  fuelLogs?: {id: string; liters: number; cost: number; filledAt: string}[];
  documents?: {id: string; type: string; fileUrl: string; issueDate: string; expiryDate: string; issuingAuthority?: string; referenceNumber?: string}[];
}

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const HEADER_H = 240;

const STATUS_LABELS: Record<string, {en: string; ar: string}> = {
  ACTIVE:      {en: 'In Use',      ar: 'نشطة'},
  MAINTENANCE: {en: 'Maintenance', ar: 'صيانة'},
  INACTIVE:    {en: 'Inactive',    ar: 'غير نشطة'},
  RETIRED:     {en: 'Retired',     ar: 'متقاعدة'},
};

// Dark tinted color per vehicle type for the header bg
const TYPE_BG: Record<string, string> = {
  TRUCK:           '#1a5276',
  BUS:             '#154360',
  SEDAN:           '#1a6b5a',
  SUV:             '#1d6a52',
  VAN:             '#1b4f72',
  MOTORCYCLE:      '#4a235a',
  HEAVY_EQUIPMENT: '#212f3d',
};

interface Props {
  vehicleId: string;
  locale: Locale;
  onBack: () => void;
  onEdit?: () => void;
}

export function VehicleDetailScreen({vehicleId, locale, onBack, onEdit}: Props) {
  const isAr = locale === 'ar';
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<VehicleDetail>(`/vehicles/${vehicleId}`)
      .then(setVehicle)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{isAr ? 'تعذر تحميل البيانات' : 'Could not load vehicle'}</Text>
        <TouchableOpacity onPress={onBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>{isAr ? 'رجوع' : 'Go back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusLabel = STATUS_LABELS[vehicle.status]?.[isAr ? 'ar' : 'en'] ?? vehicle.status;
  const driverName = vehicle.assignedDriver?.fullName ?? (isAr ? 'غير معين' : 'Unassigned');

  const vehicleCheck = vehicle.inspectionExpiryDate
    ? new Date(vehicle.inspectionExpiryDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  const totalFuelLiters = vehicle.fuelLogs?.reduce((s, l) => s + (l.liters ?? 0), 0) ?? 0;
  const totalFuelCost   = vehicle.fuelLogs?.reduce((s, l) => s + (l.cost  ?? 0), 0) ?? 0;
  const efficiency = vehicle.odometer > 100 && totalFuelLiters > 0
    ? ((totalFuelLiters / vehicle.odometer) * 100).toFixed(1)
    : '—';
  const costLabel = totalFuelCost > 0
    ? totalFuelCost >= 1000
      ? (totalFuelCost / 1000).toFixed(1) + 'K'
      : String(Math.round(totalFuelCost))
    : '—';

  const headerBg = TYPE_BG[vehicle.type] ?? '#1a5276';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />

      {/* ── Stylised vehicle header (no real image — use make/model typography) ── */}
      <View style={[styles.imageHeader, {backgroundColor: headerBg}]}>
        {/* Subtle grid lines */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0.25, 0.5, 0.75].map(f => (
            <View key={f} style={[styles.gridLine, {top: `${Math.round(f * 100)}%` as any}]} />
          ))}
          {[0.33, 0.66].map(f => (
            <View key={f} style={[styles.gridLineV, {left: `${Math.round(f * 100)}%` as any}]} />
          ))}
        </View>

        {/* Large watermark make/model */}
        <View style={styles.watermark} pointerEvents="none">
          <Text style={styles.watermarkMake} numberOfLines={1}>{vehicle.make.toUpperCase()}</Text>
          <Text style={styles.watermarkModel}>{vehicle.model.toUpperCase()}</Text>
          <Text style={styles.watermarkYear}>{vehicle.year}</Text>
        </View>

        {/* Top bar: back + plate */}
        <View style={[styles.topBar, {paddingTop: SB_H + 6}]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.plateOverlay}>{vehicle.plateNumber}</Text>
          {onEdit ? (
            <TouchableOpacity style={styles.closeBtn} onPress={onEdit} activeOpacity={0.8}>
              <AppIcon name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{width: 36}} />
          )}
        </View>
      </View>

      {/* ── White curved panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}>

        {/* 3-column info strip */}
        <View style={styles.infoStrip}>
          <InfoCol
            label={isAr ? 'اسم السائق' : 'Driver Name'}
            value={driverName}
          />
          <View style={styles.stripDiv} />
          <InfoCol
            label={isAr ? 'الحالة' : 'Vehicle Status'}
            value={statusLabel}
            highlight={vehicle.status === 'ACTIVE'}
          />
          <View style={styles.stripDiv} />
          <InfoCol
            label={isAr ? 'تاريخ الفحص' : 'Vehicle Check'}
            value={vehicleCheck}
          />
        </View>

        {/* 4-tile stats row */}
        <View style={styles.statsRow}>
          <StatTile
            icon="speedometer"
            value={vehicle.odometer > 0 ? vehicle.odometer.toLocaleString() : '—'}
            unit="KM"
            color="#247C76"
          />
          <StatTile
            icon="gas-station"
            value={vehicle.fuelCapacity > 0 ? `${vehicle.fuelCapacity}` : 'Diesel'}
            unit={isAr ? 'وقود' : 'Fuel'}
            color="#27ae60"
          />
          <StatTile
            icon="map-marker-radius"
            value={efficiency}
            unit="1/100 km"
            color="#e67e22"
          />
          <StatTile
            icon="cash-multiple"
            value={costLabel}
            unit={isAr ? 'تكلفة' : 'Earn'}
            color="#9b59b6"
          />
        </View>

        {/* ── Live GPS ── */}
        <Text style={styles.sectionTitle}>{isAr ? 'الموقع الحي' : 'Live GPS'}</Text>
        <View style={styles.mapCard}>
          {/* Tinted grid map placeholder */}
          <View style={styles.mapBg}>
            {[1,2,3,4].map(i => (
              <View key={`h${i}`} style={[styles.mapGridH, {top: `${i * 20}%` as any}]} />
            ))}
            {[1,2,3,4].map(i => (
              <View key={`v${i}`} style={[styles.mapGridV2, {left: `${i * 20}%` as any}]} />
            ))}

            {/* Simulated road lines */}
            <View style={styles.roadH} />
            <View style={styles.roadV} />

            {/* Vehicle pin */}
            <View style={styles.mapPin}>
              <AppIcon name="truck" size={16} color="#fff" />
            </View>

            {/* Speed chip */}
            <View style={styles.speedChip}>
              <Text style={styles.speedText}>
                {vehicle.lastLocationAt
                  ? (isAr ? 'السرعة 50 ك/س' : 'Speed 50km/hr')
                  : (isAr ? 'لا يوجد بيانات GPS' : 'No GPS data')}
              </Text>
            </View>

            {/* Coords if available */}
            {vehicle.lastLocationLat != null && (
              <Text style={styles.coordsText}>
                {vehicle.lastLocationLat.toFixed(4)}, {vehicle.lastLocationLng?.toFixed(4)}
              </Text>
            )}
          </View>
        </View>

        {/* ── Recent Maintenance ── */}
        {vehicle.maintenanceLogs && vehicle.maintenanceLogs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{isAr ? 'آخر الصيانة' : 'Recent Maintenance'}</Text>
            {vehicle.maintenanceLogs.slice(0, 3).map(log => (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logIcon}>
                  <AppIcon name="wrench-outline" size={16} color={Colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.logTitle}>{log.type?.replace(/_/g, ' ') ?? '—'}</Text>
                  <Text style={styles.logDate}>
                    {log.scheduledDate
                      ? new Date(log.scheduledDate).toLocaleDateString()
                      : ''}
                  </Text>
                </View>
                <Text style={[
                  styles.logStatus,
                  {color: log.status === 'COMPLETED' ? '#27ae60' : Colors.warning},
                ]}>
                  {log.status}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Document validity ── */}
        <Text style={[styles.sectionTitle, {marginTop: 8}]}>{isAr ? 'صلاحية الوثائق' : 'Document Validity'}</Text>
        <View style={styles.docsCard}>
          <DocRow label={isAr ? 'حالة الفحص الدوري' : 'MVPI Status'} value={vehicle.mvpiStatus ?? '—'} />
          <DocRow label={isAr ? 'انتهاء التأمين' : 'Insurance Expiry'} value={vehicle.insuranceExpiryDate ?? '—'} />
          <DocRow label={isAr ? 'انتهاء الترخيص' : 'License Expiry'} value={vehicle.licenseExpiryDate ?? '—'} last />
        </View>

        {/* ── Attached documents (downloadable) ── */}
        {vehicle.documents && vehicle.documents.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 8}]}>{isAr ? 'المستندات المرفقة' : 'Attached Documents'}</Text>
            {vehicle.documents.map((doc, idx) => (
              <DocFileRow
                key={doc.id}
                doc={doc}
                isAr={isAr}
                last={idx === (vehicle.documents!.length - 1)}
              />
            ))}
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

function StatTile({icon, value, unit, color}: {icon: string; value: string; unit: string; color: string}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, {backgroundColor: color + '20'}]}>
        <AppIcon name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

function DocRow({label, value, last}: {label: string; value: string; last?: boolean}) {
  return (
    <View style={[styles.docRow, !last && styles.docBorder]}>
      <Text style={styles.docLabel}>{label}</Text>
      <Text style={styles.docValue}>{value}</Text>
    </View>
  );
}

const DOC_ICONS: Record<string, string> = {
  VEHICLE_REGISTRATION: 'card-account-details-outline',
  VEHICLE_INSURANCE:    'shield-check-outline',
  DRIVER_LICENSE:       'card-account-details-outline',
  OPERATION_CARD:       'file-document-outline',
  DEFAULT:              'file-outline',
};

function DocFileRow({
  doc,
  isAr,
  last,
}: {
  doc: {id: string; type: string; fileUrl: string; issueDate: string; expiryDate: string; issuingAuthority?: string};
  isAr: boolean;
  last: boolean;
}) {
  const expiry = doc.expiryDate
    ? new Date(doc.expiryDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})
    : '—';
  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
  const icon = DOC_ICONS[doc.type] ?? DOC_ICONS.DEFAULT;
  const typeName = doc.type.replace(/_/g, ' ');

  async function handleOpen() {
    const url = doc.fileUrl;
    if (!url) return;
    try {
      const resolvedUrl = resolveApiUrl(url);
      const canOpen = await Linking.canOpenURL(resolvedUrl);
      if (canOpen) {
        await Linking.openURL(resolvedUrl);
      } else {
        Alert.alert(
          isAr ? 'تعذر فتح الملف' : 'Cannot open file',
          isAr ? 'الرابط غير مدعوم على هذا الجهاز' : 'This URL cannot be opened on this device.',
        );
      }
    } catch {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'تعذر فتح الملف' : 'Could not open the file.',
      );
    }
  }

  return (
    <TouchableOpacity
      style={[styles.fileRow, !last && styles.fileRowBorder]}
      onPress={handleOpen}
      activeOpacity={0.75}>
      <View style={styles.fileIcon}>
        <AppIcon name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.fileType}>{typeName}</Text>
        <Text style={[styles.fileExpiry, isExpired ? {color: '#e74c3c'} : {}]}>
          {isAr ? 'ينتهي: ' : 'Exp: '}{expiry}
        </Text>
      </View>
      <View style={styles.downloadBtn}>
        <AppIcon name="download" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, gap: 12},
  errorText: {fontSize: 15, color: Colors.textMuted},
  retryBtn: {paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 20},
  retryText: {color: '#fff', fontWeight: '600' as const},

  // Header
  imageHeader: {height: HEADER_H, justifyContent: 'center', alignItems: 'center', overflow: 'hidden'},
  gridLine: {position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.06)'},
  gridLineV: {position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.06)'},
  watermark: {alignItems: 'center', gap: 4, opacity: 0.25},
  watermarkMake: {fontSize: 52, fontWeight: '900' as const, color: '#fff', letterSpacing: 6},
  watermarkModel: {fontSize: 20, fontWeight: '600' as const, color: '#fff', letterSpacing: 3},
  watermarkYear: {fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 1},
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingBottom: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  plateOverlay: {fontSize: 18, fontWeight: '700' as const, color: '#fff', letterSpacing: 1.5},

  // Panel
  panel: {flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28},
  panelContent: {padding: Spacing.md},

  // Info strip
  infoStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 4,
    marginBottom: 14,
  },
  infoCol: {flex: 1, alignItems: 'center', gap: 5},
  infoLabel: {fontSize: 10, color: Colors.textMuted, fontWeight: '500' as const, textAlign: 'center'},
  infoValue: {fontSize: 12, fontWeight: '700' as const, color: Colors.textPrimary, textAlign: 'center'},
  stripDiv: {width: 1, height: 32, backgroundColor: Colors.borderLight},

  // Stats
  statsRow: {flexDirection: 'row', gap: 8, marginBottom: 20},
  statTile: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 14, alignItems: 'center', gap: 5,
  },
  statIcon: {width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center'},
  statValue: {fontSize: 12, fontWeight: '800' as const, color: Colors.textPrimary},
  statUnit: {fontSize: 9, color: Colors.textMuted, fontWeight: '500' as const},

  // Section title
  sectionTitle: {fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 10},

  // Map
  mapCard: {borderRadius: 14, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: Colors.borderLight},
  mapBg: {height: 175, backgroundColor: '#e8f2f0', justifyContent: 'center', alignItems: 'center'},
  mapGridH: {position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(36,124,118,0.1)'},
  mapGridV2: {position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(36,124,118,0.1)'},
  roadH: {position: 'absolute', top: '55%', width: '100%', height: 6, backgroundColor: 'rgba(36,124,118,0.22)'},
  roadV: {position: 'absolute', left: '55%', height: '100%', width: 6, backgroundColor: 'rgba(36,124,118,0.22)'},
  mapPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: {width: 0, height: 2},
  },
  speedChip: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  speedText: {fontSize: 11, color: '#fff', fontWeight: '600' as const},
  coordsText: {position: 'absolute', bottom: 8, fontSize: 10, color: Colors.textMuted},

  // Maintenance log rows
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 8,
  },
  logIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  logTitle: {fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary, textTransform: 'capitalize'},
  logDate: {fontSize: 11, color: Colors.textMuted, marginTop: 2},
  logStatus: {fontSize: 11, fontWeight: '700' as const},

  // Docs card
  docsCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    marginBottom: 8,
  },
  docRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12},
  docBorder: {borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  docLabel: {fontSize: 13, color: Colors.textMuted},
  docValue: {fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary},

  // Attached document file rows
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 12, paddingHorizontal: 12,
    marginBottom: 8,
  },
  fileRowBorder: {},
  fileIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  fileType: {fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary, textTransform: 'capitalize'},
  fileExpiry: {fontSize: 11, color: Colors.textMuted, marginTop: 2},
  downloadBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
});
