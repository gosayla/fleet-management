import React, {useEffect, useRef, useState} from 'react';
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
  Image,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {api, resolvePhotoUrl} from '../lib/api';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {Locale, t} from '../lib/i18n';

interface DriverDetail {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  nationalId: string;
  licenseNumber: string;
  licenseExpiry: string;
  bloodType?: string;
  status: string;
  photoUrl?: string | null;
  createdAt: string;
  vehicles?: {id: string; plateNumber: string; make: string; model: string; type: string}[];
  trips?: {id: string; origin: string; destination: string; status: string; scheduledStart: string}[];
  documents?: {id: string; type: string; fileUrl: string; issueDate: string; expiryDate: string}[];
}

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const HEADER_H = 220;
const HEADER_MIN_H = 116;

const STATUS_CONFIG: Record<string, {label: Record<Locale, string>; color: string; bg: string}> = {
  ACTIVE:     {label: {en: 'Active',      ar: 'نشط',          hi: 'सक्रिय',     bn: 'সক্রিয়',    ur: 'فعال'},       color: '#fff',            bg: Colors.primary},
  OFF_DUTY:   {label: {en: 'Off Duty',    ar: 'خارج الخدمة', hi: 'ड्यूटी से बाहर', bn: 'ড্যুটি থেকে বাইরে', ur: 'ڈیوٹی سے باہر'}, color: Colors.textMuted,  bg: Colors.borderLight},
  ON_LEAVE:   {label: {en: 'On Leave',    ar: 'إجازة',       hi: 'छुट्टी पर',   bn: 'ছুটিতে',    ur: 'چھٹی پر'},   color: '#d68910',         bg: '#fef9e7'},
  SUSPENDED:  {label: {en: 'Suspended',   ar: 'موقوف',       hi: 'निलंबिت',   bn: 'স্থগিত',    ur: 'معطل'},       color: '#c0392b',         bg: '#fdecea'},
  TERMINATED: {label: {en: 'Terminated',  ar: 'منتهي',       hi: 'समाप्ت',     bn: 'সমাপ্ত',    ur: 'ختم'},       color: '#c0392b',         bg: '#fdecea'},
};

const BLOOD_TYPE_LABELS: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A-',
  B_POS: 'B+', B_NEG: 'B-',
  AB_POS: 'AB+', AB_NEG: 'AB-',
  O_POS: 'O+', O_NEG: 'O-',
};

const TRIP_STATUS_COLOR: Record<string, string> = {
  COMPLETED:  '#27ae60',
  IN_PROGRESS:'#2980b9',
  SCHEDULED:  Colors.primary,
  CANCELLED:  '#c0392b',
};

interface Props {
  driverId: string;
  locale: Locale;
  onBack: () => void;
  onEdit?: () => void;
}

export function DriverDetailScreen({driverId, locale, onBack, onEdit}: Props) {
  const i18n = t(locale);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhoto, setShowPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get<DriverDetail>(`/drivers/${driverId}`)
      .then(setDriver)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [driverId]);

  async function uploadPhoto(uri: string, fileName: string, type: string) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', {uri, name: fileName, type} as any);
      const updated = await api.upload<{photoUrl: string}>(`/drivers/${driverId}/photo`, form);
      setDriver(prev => prev ? {...prev, photoUrl: updated.photoUrl} : prev);
    } catch (e: any) {
      Alert.alert(i18n.error, e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function showPhotoOptions() {
    Alert.alert(
      i18n.changePhoto,
      '',
      [
        {
          text: i18n.camera,
          onPress: () => launchCamera(
            {mediaType: 'photo', quality: 0.8, saveToPhotos: false},
            res => {
              if (res.didCancel || res.errorCode) return;
              const asset = res.assets?.[0];
              if (asset?.uri) uploadPhoto(asset.uri, asset.fileName ?? 'photo.jpg', asset.type ?? 'image/jpeg');
            },
          ),
        },
        {
          text: i18n.gallery,
          onPress: () => launchImageLibrary(
            {mediaType: 'photo', quality: 0.8, selectionLimit: 1},
            res => {
              if (res.didCancel || res.errorCode) return;
              const asset = res.assets?.[0];
              if (asset?.uri) uploadPhoto(asset.uri, asset.fileName ?? 'photo.jpg', asset.type ?? 'image/jpeg');
            },
          ),
        },
        {text: i18n.cancel, style: 'cancel'},
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.couldNotLoadDriver}</Text>
        <TouchableOpacity onPress={onBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>{i18n.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[driver.status] ?? STATUS_CONFIG.OFF_DUTY;
  const statusLabel = statusCfg.label[locale];
  const initials = driver.fullName
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const licenseExpiry = driver.licenseExpiry
    ? new Date(driver.licenseExpiry).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  const isLicenseExpired = driver.licenseExpiry
    ? new Date(driver.licenseExpiry) < new Date()
    : false;

  const totalTrips = driver.trips?.length ?? 0;
  const completedTrips = driver.trips?.filter(t => t.status === 'COMPLETED').length ?? 0;
  const bloodTypeLabel = driver.bloodType ? (BLOOD_TYPE_LABELS[driver.bloodType] ?? driver.bloodType) : '—';
  const collapseDistance = HEADER_H - HEADER_MIN_H;

  const animatedHeaderHeight = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [HEADER_H, HEADER_MIN_H],
    extrapolate: 'clamp',
  });

  const animatedTopPadding = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [SB_H + 6, SB_H + 2],
    extrapolate: 'clamp',
  });

  const animatedAvatarScale = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });

  const animatedAvatarOpacity = scrollY.interpolate({
    inputRange: [0, collapseDistance * 0.8],
    outputRange: [1, 0.88],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Teal header with avatar ── */}
      <Animated.View style={[styles.header, {height: animatedHeaderHeight}]}>
        {/* Subtle grid */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0.3, 0.6].map(f => (
            <View key={`h${f}`} style={[styles.gridLineH, {top: `${Math.round(f * 100)}%` as any}]} />
          ))}
          {[0.25, 0.5, 0.75].map(f => (
            <View key={`v${f}`} style={[styles.gridLineV, {left: `${Math.round(f * 100)}%` as any}]} />
          ))}
        </View>

        {/* Top bar */}
        <Animated.View style={[styles.topBar, {paddingTop: animatedTopPadding}]}> 
          <TouchableOpacity style={styles.circleBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{width: 36}} />
          {onEdit ? (
            <TouchableOpacity style={styles.circleBtn} onPress={onEdit} activeOpacity={0.8}>
              <AppIcon name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{width: 36}} />
          )}
        </Animated.View>

        {/* Avatar + name */}
        <Animated.View
          style={[
            styles.avatarSection,
            {
              opacity: animatedAvatarOpacity,
              transform: [{scale: animatedAvatarScale}],
            },
          ]}
        >
          <View style={{position: 'relative'}}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => { if (driver.photoUrl) setShowPhoto(true); }}
            >
              <View style={styles.avatar}>
                {driver.photoUrl && resolvePhotoUrl(driver.photoUrl) ? (
                  <Image
                    source={{uri: resolvePhotoUrl(driver.photoUrl)!}}
                    style={{width: 72, height: 72, borderRadius: 36}}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
            {/* Camera badge */}
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={showPhotoOptions}
              activeOpacity={0.8}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator size={10} color="#fff" />
                : <AppIcon name="camera" size={12} color="#fff" />}
            </TouchableOpacity>
          </View>
          <Text style={styles.driverName}>{driver.fullName}</Text>
          <View style={[styles.statusPill, {backgroundColor: statusCfg.bg}]}>
            <Text style={[styles.statusPillText, {color: statusCfg.color}]}>{statusLabel}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── White curved panel ── */}
      <Animated.ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}
      >

        {/* 3-column info strip */}
        <View style={styles.infoStrip}>
          <InfoCol
            label={i18n.licenseExpiryLabel}
            value={licenseExpiry}
            warn={isLicenseExpired}
          />
          <View style={styles.stripDiv} />
          <InfoCol
            label={i18n.bloodTypeLabel}
            value={bloodTypeLabel}
            highlight
          />
        </View>

        {/* 4-tile stats row */}
        <View style={styles.statsRow}>
          <StatTile
            icon="map-marker-distance"
            value={String(totalTrips)}
            unit={i18n.tripsUnit}
            color="#247C76"
          />
          <StatTile
            icon="check-circle-outline"
            value={String(completedTrips)}
            unit={i18n.doneUnit}
            color="#27ae60"
          />
          <StatTile
            icon="card-account-details-outline"
            value={driver.nationalId.slice(-4)}
            unit={i18n.idUnit}
            color="#e67e22"
          />
          <StatTile
            icon="water"
            value={bloodTypeLabel}
            unit={i18n.bloodUnit}
            color="#9b59b6"
          />
        </View>

        {/* ── Assigned Vehicles ── */}
        <Text style={styles.sectionTitle}>{i18n.assignedVehicles}</Text>
        {(driver.vehicles ?? []).length > 0 ? (
          (driver.vehicles ?? []).map(v => (
            <View key={v.id} style={styles.vehicleCard}>
              <View style={styles.vehicleIcon}>
                <AppIcon name="truck" size={24} color={Colors.primary} />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.vehiclePlate}>{v.plateNumber}</Text>
                <Text style={styles.vehicleSub}>{v.make} {v.model}</Text>
              </View>
              <View style={styles.vehicleTypePill}>
                <Text style={styles.vehicleTypeText}>{v.type?.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <AppIcon name="truck-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.emptyCardText}>{i18n.noVehicleAssigned}</Text>
          </View>
        )}

        {/* ── Contact Info ── */}
        <Text style={[styles.sectionTitle, {marginTop: 20}]}>{i18n.contactInfo}</Text>
        <View style={styles.contactCard}>
          <ContactRow
            icon="phone"
            label={i18n.phoneLabel}
            value={driver.phone}
            onPress={() => Linking.openURL(`tel:${driver.phone}`)}
          />
          {driver.email && (
            <ContactRow
              icon="email-outline"
              label={i18n.emailLabel}
              value={driver.email}
              onPress={() => Linking.openURL(`mailto:${driver.email}`)}
              noBorder
            />
          )}
        </View>

        <View style={styles.contactCard}>
          <InfoRow
            icon="card-account-details"
            label={i18n.nationalIdField}
            value={driver.nationalId}
          />
        </View>

        {/* ── Recent Trips ── */}
        {driver.trips && driver.trips.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>
              {i18n.recentTrips}
            </Text>
            {driver.trips.slice(0, 5).map(trip => {
              const statusColor = TRIP_STATUS_COLOR[trip.status] ?? Colors.textMuted;
              const date = trip.scheduledStart
                ? new Date(trip.scheduledStart).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short',
                  })
                : '—';
              return (
                <View key={trip.id} style={styles.tripRow}>
                  <View style={styles.tripIconWrap}>
                    <AppIcon name="map-marker-path" size={16} color={Colors.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.tripRoute} numberOfLines={1}>
                      {trip.origin} → {trip.destination}
                    </Text>
                    <Text style={styles.tripDate}>{date}</Text>
                  </View>
                  <Text style={[styles.tripStatus, {color: statusColor}]}>
                    {trip.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <View style={{height: 32}} />
      </Animated.ScrollView>

      {/* ── Photo lightbox ── */}
      <Modal visible={showPhoto} transparent animationType="fade" onRequestClose={() => setShowPhoto(false)}>
        <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setShowPhoto(false)}>
          {driver.photoUrl && resolvePhotoUrl(driver.photoUrl) && (
            <Image
              source={{uri: resolvePhotoUrl(driver.photoUrl)!}}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setShowPhoto(false)}>
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InfoCol({label, value, highlight, warn}: {
  label: string; value: string; highlight?: boolean; warn?: boolean;
}) {
  return (
    <View style={styles.infoCol}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[
        styles.infoValue,
        highlight && {color: Colors.primary},
        warn && {color: '#c0392b'},
      ]}>
        {value}
      </Text>
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

function ContactRow({icon, label, value, onPress, noBorder}: {
  icon: string; label: string; value: string;
  onPress: () => void; noBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.contactRow, !noBorder && styles.contactBorder]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.contactIconWrap}>
        <AppIcon name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
      <AppIcon name="chevron-right" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function InfoRow({icon, label, value, noBorder}: {
  icon: string; label: string; value: string; noBorder?: boolean;
}) {
  return (
    <View style={[styles.contactRow, !noBorder && styles.contactBorder]}>
      <View style={styles.contactIconWrap}>
        <AppIcon name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
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

  // Header
  header: {backgroundColor: Colors.primary, justifyContent: 'center', overflow: 'hidden'},
  gridLineH: {position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.07)'},
  gridLineV: {position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(255,255,255,0.07)'},
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingBottom: 10,
    zIndex: 30,
    elevation: 30,
  },
  circleBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerLabel: {fontSize: 16, fontWeight: '600' as const, color: '#fff', opacity: 0.9},
  avatarSection: {alignItems: 'center', gap: 8, paddingTop: 16},
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {fontSize: 26, fontWeight: '800' as const, color: '#fff'},
  driverName: {fontSize: 20, fontWeight: '700' as const, color: '#fff'},
  statusPill: {
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {fontSize: 12, fontWeight: '600' as const},

  // Panel
  panel: {flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24},
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

  // Vehicle card
  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
  },
  vehicleIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  vehiclePlate: {fontSize: 16, fontWeight: '700' as const, color: Colors.textPrimary, letterSpacing: 1},
  vehicleSub: {fontSize: 13, color: Colors.textMuted, marginTop: 2},
  vehicleTypePill: {
    backgroundColor: Colors.primaryLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  vehicleTypeText: {fontSize: 10, fontWeight: '600' as const, color: Colors.primary},

  // Empty card
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 16, paddingHorizontal: Spacing.md,
  },
  emptyCardText: {fontSize: 14, color: Colors.textMuted},

  // Contact / Info rows
  contactCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    overflow: 'hidden', marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
  },
  contactBorder: {borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  contactIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  contactLabel: {fontSize: 10, color: Colors.textMuted, fontWeight: '500' as const, marginBottom: 1},
  contactValue: {fontSize: 14, fontWeight: '600' as const, color: Colors.textPrimary},

  // Trip rows
  tripRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 8,
  },
  tripIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  tripRoute: {fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary},
  tripDate: {fontSize: 11, color: Colors.textMuted, marginTop: 1},
  tripStatus: {fontSize: 10, fontWeight: '700' as const},

  // Lightbox
  lightboxOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  lightboxImg: {width: '100%', height: '80%'},
  lightboxClose: {
    position: 'absolute', top: 50, right: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, padding: 8,
  },
});
