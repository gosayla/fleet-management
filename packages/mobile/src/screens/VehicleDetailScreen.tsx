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
  Alert,
  Image,
  FlatList,
  Modal,
  Animated,
} from 'react-native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {api, resolveApiAssetUrls, resolvePhotoUrl} from '../lib/api';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {Locale, t} from '../lib/i18n';
import {subscribeToVehicleLocation} from '../lib/socket';
import {OsmMapView} from '../components/maps/OsmMapView';

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
  drivers?: {id: string; fullName: string; phone: string; photoUrl?: string | null}[];
  maintenanceLogs?: {id: string; type: string; status: string; scheduledDate: string; description?: string}[];
  fuelLogs?: {id: string; liters: number; cost: number; filledAt: string}[];
  documents?: {id: string; type: string; fileUrl: string; issueDate: string; expiryDate: string; issuingAuthority?: string; referenceNumber?: string}[];
  pilotImei?: string | null;
  pilotMotorHours?: number | null;
  pilotLastStop?: string | null;
  pilotLastMove?: string | null;
  pilotBatteryVoltage?: number | null;
  pilotIgnitionOn?: boolean | null;
  pilotLoadWeight?: number | null;
  pilotProviderMileage?: number | null;
  pilotSpeed?: number | null;
  pilotHeading?: number | null;
  pilotIsOnline?: boolean | null;
}

interface VehiclePhoto {
  id: string;
  url: string;
  isProfile: boolean;
  caption?: string | null;
}

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;
const HEADER_H = 240;
const HEADER_MIN_H = 118;

const STATUS_LABELS: Record<string, Record<Locale, string>> = {
  ACTIVE:      {en: 'In Use',      ar: 'نشطة',      hi: 'उपयोग में',  bn: 'ব্যবহারে',  ur: 'استعمال میں'},
  MAINTENANCE: {en: 'Maintenance', ar: 'صيانة',     hi: 'रखरखाव',     bn: 'রক্ষণাবেক্ষণ', ur: 'دیکھ بھال'},
  INACTIVE:    {en: 'Inactive',    ar: 'غير نشطة',  hi: 'निष्क्रिय',  bn: 'নিষ্ক্রিয়',  ur: 'غیر فعال'},
  RETIRED:     {en: 'Retired',     ar: 'متقاعدة',   hi: 'सेवानिवृत्त', bn: 'অবসরপ্রাপ্ত', ur: 'ریٹائرڈ'},
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
  const i18n = t(locale);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [activePhoto, setActivePhoto] = useState<VehiclePhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  function refreshPhotos() {
    api.get<VehiclePhoto[]>(`/vehicles/${vehicleId}/photos`)
      .then(p => setPhotos(Array.isArray(p) ? p : []))
      .catch(() => {});
  }

  useEffect(() => {
    Promise.all([
      api.get<VehicleDetail>(`/vehicles/${vehicleId}`),
      api.get<VehiclePhoto[]>(`/vehicles/${vehicleId}/photos`),
    ])
      .then(([v, p]) => { setVehicle(v); setPhotos(Array.isArray(p) ? p : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vehicleId]);

  useEffect(() => {
    let cleanup: undefined | (() => void);

    subscribeToVehicleLocation(vehicleId, (update) => {
      setVehicle((current) => current ? {
        ...current,
        lastLocationLat: update.location.lat,
        lastLocationLng: update.location.lng,
        lastLocationAt: new Date(update.timestamp).toISOString(),
      } : current);
    }).then((dispose) => {
      cleanup = dispose;
    }).catch(() => {});

    return () => cleanup?.();
  }, [vehicleId]);

  async function uploadPhoto(uri: string, fileName: string, type: string) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', {uri, name: fileName, type} as any);
      await api.upload<VehiclePhoto>(`/vehicles/${vehicleId}/photos`, form);
      refreshPhotos();
    } catch (e: any) {
      Alert.alert(i18n.error, e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function showAddPhotoOptions() {
    Alert.alert(
      i18n.addPhoto,
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

  async function setAsProfile(photo: VehiclePhoto) {
    try {
      await api.patch(`/vehicles/${vehicleId}/photos/${photo.id}/profile`, {});
      refreshPhotos();
      setActivePhoto(null);
    } catch {}
  }

  async function deletePhoto(photo: VehiclePhoto) {
    Alert.alert(
      i18n.deletePhotoTitle,
      i18n.deletePhotoConfirm,
      [
        {text: i18n.cancel, style: 'cancel'},
        {
          text: i18n.deleteLabel,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/vehicles/${vehicleId}/photos/${photo.id}`);
              setActivePhoto(null);
              refreshPhotos();
            } catch {}
          },
        },
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

  if (!vehicle) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.couldNotLoadVehicle}</Text>
        <TouchableOpacity onPress={onBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>{i18n.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusLabel = STATUS_LABELS[vehicle.status]?.[locale] ?? vehicle.status;
  const drivers = vehicle.drivers ?? [];
  const driverName = drivers.length > 0
    ? drivers.length === 1 ? drivers[0].fullName : `${drivers[0].fullName} +${drivers.length - 1}`
    : i18n.unassigned;
  const profilePhoto = photos.find(p => p.isProfile) ?? photos[0] ?? null;

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

  const animatedPlateSize = scrollY.interpolate({
    inputRange: [0, collapseDistance],
    outputRange: [18, 15],
    extrapolate: 'clamp',
  });

  const animatedWatermarkOpacity = scrollY.interpolate({
    inputRange: [0, collapseDistance * 0.8],
    outputRange: [0.25, 0.08],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />

      {/* ── Stylised vehicle header ── */}
      <Animated.View style={[styles.imageHeader, {backgroundColor: headerBg, height: animatedHeaderHeight}]}>
        {/* Profile photo as header bg if available */}
        {profilePhoto && resolvePhotoUrl(profilePhoto.url) ? (
          <Image
            source={{uri: resolvePhotoUrl(profilePhoto.url)!}}
            style={[StyleSheet.absoluteFill, {opacity: 0.55}]}
            resizeMode="cover"
          />
        ) : (
          <>
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
            <Animated.View style={[styles.watermark, {opacity: animatedWatermarkOpacity}]} pointerEvents="none">
              <Text style={styles.watermarkMake} numberOfLines={1}>{vehicle.make.toUpperCase()}</Text>
              <Text style={styles.watermarkModel}>{vehicle.model.toUpperCase()}</Text>
              <Text style={styles.watermarkYear}>{vehicle.year}</Text>
            </Animated.View>
          </>
        )}

        {/* Top bar: back + plate */}
        <Animated.View style={[styles.topBar, {paddingTop: animatedTopPadding}]}> 
          <TouchableOpacity style={styles.closeBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Animated.Text style={[styles.plateOverlay, {fontSize: animatedPlateSize}]}>{vehicle.plateNumber}</Animated.Text>
          {onEdit ? (
            <TouchableOpacity style={styles.closeBtn} onPress={onEdit} activeOpacity={0.8}>
              <AppIcon name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{width: 36}} />
          )}
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
        )}>

        {/* 3-column info strip */}
        <View style={styles.infoStrip}>
          <InfoCol
            label={i18n.driverNameLabel}
            value={driverName}
          />
          <View style={styles.stripDiv} />
          <InfoCol
            label={i18n.vehicleStatusLabel}
            value={statusLabel}
            highlight={vehicle.status === 'ACTIVE'}
          />
          <View style={styles.stripDiv} />
          <InfoCol
            label={i18n.vehicleCheckLabel}
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
            unit={i18n.fuelUnit}
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
            unit={i18n.costUnit}
            color="#9b59b6"
          />
        </View>

        {/* ── Live GPS ── */}
        <Text style={styles.sectionTitle}>{i18n.liveGPSSection}</Text>
        <View style={styles.mapCard}>
          <View style={styles.mapBg}>
            {vehicle.lastLocationLat != null && vehicle.lastLocationLng != null ? (
              <OsmMapView
                style={styles.mapCanvas}
                center={{latitude: vehicle.lastLocationLat, longitude: vehicle.lastLocationLng}}
                marker={{latitude: vehicle.lastLocationLat, longitude: vehicle.lastLocationLng}}
                zoom={14}
                interactive={false}
              />
            ) : (
              <View style={styles.mapEmptyState}>
                <AppIcon name="map-marker-off-outline" size={22} color={Colors.textMuted} />
                <Text style={styles.mapEmptyText}>{i18n.noLiveLocation}</Text>
              </View>
            )}

            <View style={styles.speedChip}>
              <Text style={styles.speedText}>
                {vehicle.lastLocationAt
                  ? `${i18n.updatedLabel}: ${new Date(vehicle.lastLocationAt).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}`
                  : i18n.noGpsData}
              </Text>
            </View>

            {vehicle.lastLocationLat != null && vehicle.lastLocationLng != null && (
              <Text style={styles.coordsText}>
                {vehicle.lastLocationLat.toFixed(4)}, {vehicle.lastLocationLng.toFixed(4)}
              </Text>
            )}
          </View>
        </View>

        {/* ── GPS Telemetry ── */}
        {(vehicle.pilotMotorHours != null || vehicle.pilotImei) && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 4}]}>{i18n.gpsTelemetry}</Text>
            <View style={styles.telemetryCard}>
              {vehicle.pilotMotorHours != null && vehicle.pilotMotorHours > 0 && (
                <TelemetryRow
                  icon="engine-outline"
                  label={i18n.engineHours}
                  value={`${(vehicle.pilotMotorHours).toFixed(1)} h`}
                />
              )}
              {vehicle.pilotProviderMileage != null && vehicle.pilotProviderMileage > 0 && (
                <TelemetryRow
                  icon="map-marker-distance"
                  label={i18n.deviceMileage}
                  value={`${vehicle.pilotProviderMileage.toFixed(1)} km`}
                />
              )}
              {vehicle.pilotBatteryVoltage != null && vehicle.pilotBatteryVoltage > 0 && (
                <TelemetryRow
                  icon="car-battery"
                  label={i18n.batteryVoltage}
                  value={`${vehicle.pilotBatteryVoltage.toFixed(2)} V`}
                />
              )}
              {vehicle.pilotIgnitionOn != null && (
                <TelemetryRow
                  icon={vehicle.pilotIgnitionOn ? 'key' : 'key-outline'}
                  label={i18n.ignition}
                  value={vehicle.pilotIgnitionOn ? i18n.ignitionOn : i18n.ignitionOff}
                  valueColor={vehicle.pilotIgnitionOn ? '#27ae60' : undefined}
                />
              )}
              {vehicle.pilotIsOnline != null && (
                <TelemetryRow
                  icon={vehicle.pilotIsOnline ? 'wifi' : 'wifi-off'}
                  label={locale === 'ar' ? 'حالة الجهاز' : 'Device Status'}
                  value={vehicle.pilotIsOnline ? (locale === 'ar' ? 'متصل' : 'Online') : (locale === 'ar' ? 'غير متصل' : 'Offline')}
                  valueColor={vehicle.pilotIsOnline ? '#27ae60' : '#e74c3c'}
                />
              )}
              {vehicle.pilotSpeed != null && (
                <TelemetryRow
                  icon="speedometer"
                  label={locale === 'ar' ? 'السرعة الحالية' : 'Current Speed'}
                  value={`${Math.round(vehicle.pilotSpeed)} km/h`}
                />
              )}
              {vehicle.pilotLoadWeight != null && vehicle.pilotLoadWeight > 0 && (
                <TelemetryRow
                  icon="weight"
                  label={i18n.loadWeight}
                  value={`${vehicle.pilotLoadWeight.toFixed(0)} kg`}
                />
              )}
              {vehicle.pilotLastStop && (
                <TelemetryRow
                  icon="map-marker-check-outline"
                  label={i18n.lastStop}
                  value={new Date(vehicle.pilotLastStop).toLocaleDateString()}
                />
              )}
              {vehicle.pilotLastMove && (
                <TelemetryRow
                  icon="map-marker-path"
                  label={i18n.lastMove}
                  value={new Date(vehicle.pilotLastMove).toLocaleDateString()}
                />
              )}
              {vehicle.pilotImei && (
                <TelemetryRow
                  icon="chip"
                  label="IMEI"
                  value={vehicle.pilotImei}
                  mono
                  last
                />
              )}
            </View>
          </>
        )}

        {/* ── Assigned Drivers ── */}
        {drivers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 8}]}>{i18n.assignedDriversLabel}</Text>
            {drivers.map((d, idx) => (
              <View key={d.id} style={[styles.logRow, idx < drivers.length - 1 && {marginBottom: 6}]}>
                <View style={styles.driverThumb}>
                  {d.photoUrl && resolvePhotoUrl(d.photoUrl) ? (
                    <Image source={{uri: resolvePhotoUrl(d.photoUrl)!}} style={styles.driverThumbImg} />
                  ) : (
                    <Text style={styles.driverThumbInitial}>{d.fullName.charAt(0)}</Text>
                  )}
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.logTitle}>{d.fullName}</Text>
                  <Text style={styles.logDate}>{d.phone}</Text>
                </View>
                <AppIcon name="account-check-outline" size={18} color={Colors.primary} />
              </View>
            ))}
          </>
        )}

        {/* ── Vehicle Photos ── */}
        <View style={styles.photosSectionHeader}>
          <Text style={[styles.sectionTitle, {marginTop: 16}]}>{i18n.vehiclePhotos}</Text>
          <TouchableOpacity
            style={styles.addPhotoBtn}
            onPress={showAddPhotoOptions}
            activeOpacity={0.8}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator size={14} color={Colors.primary} />
              : <><AppIcon name="camera-plus" size={14} color={Colors.primary} /><Text style={styles.addPhotoBtnText}>{i18n.addLabel}</Text></>
            }
          </TouchableOpacity>
        </View>
        {photos.length > 0 ? (
          <FlatList
            data={photos}
            keyExtractor={p => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{marginBottom: 16}}
            contentContainerStyle={{gap: 8, paddingRight: 4}}
            renderItem={({item: photo}) => {
              const uri = resolvePhotoUrl(photo.url);
              if (!uri) return null;
              return (
                <TouchableOpacity onPress={() => setActivePhoto(photo)} activeOpacity={0.85}>
                  <View style={[styles.photoThumb, photo.isProfile && styles.photoThumbProfile]}>
                    <Image source={{uri}} style={styles.photoThumbImg} resizeMode="cover" />
                    {photo.isProfile && (
                      <View style={styles.profileBadge}>
                        <AppIcon name="star" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <TouchableOpacity style={styles.emptyPhotos} onPress={showAddPhotoOptions} activeOpacity={0.8}>
            <AppIcon name="camera-plus-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyPhotosText}>{i18n.addVehiclePhoto}</Text>
          </TouchableOpacity>
        )}

        {/* ── Recent Maintenance ── */}
        {vehicle.maintenanceLogs && vehicle.maintenanceLogs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{i18n.recentMaintenance}</Text>
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
        <Text style={[styles.sectionTitle, {marginTop: 8}]}>{i18n.docValidity}</Text>
        <View style={styles.docsCard}>
          <DocRow label={i18n.mvpiStatusLabel} value={vehicle.mvpiStatus ?? '—'} warn={vehicle.mvpiStatus === 'Expired'} />
          <DocRow label={i18n.insuranceExpiryStatus} value={vehicle.insuranceExpiryDate ?? '—'} warn={!!vehicle.insuranceExpiryDate && new Date(vehicle.insuranceExpiryDate) < new Date()} />
          <DocRow label={i18n.licenseExpiryStatus} value={vehicle.licenseExpiryDate ?? '—'} warn={!!vehicle.licenseExpiryDate && new Date(vehicle.licenseExpiryDate) < new Date()} last />
        </View>

        {/* ── Attached documents (downloadable) ── */}
        {vehicle.documents && vehicle.documents.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: 8}]}>{i18n.attachedDocs}</Text>
            {vehicle.documents.map((doc, idx) => (
              <DocFileRow
                key={doc.id}
                doc={doc}
                locale={locale}
                last={idx === (vehicle.documents!.length - 1)}
              />
            ))}
          </>
        )}

        <View style={{height: 32}} />
      </Animated.ScrollView>

      {/* ── Photo lightbox ── */}
      <Modal visible={!!activePhoto} transparent animationType="fade" onRequestClose={() => setActivePhoto(null)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setActivePhoto(null)} />
          {activePhoto && resolvePhotoUrl(activePhoto.url) && (
            <Image
              source={{uri: resolvePhotoUrl(activePhoto.url)!}}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          )}
          {/* Close */}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setActivePhoto(null)}>
            <AppIcon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          {/* Action bar */}
          {activePhoto && (
            <View style={styles.lightboxActions}>
              {!activePhoto.isProfile && (
                <TouchableOpacity style={styles.lightboxAction} onPress={() => setAsProfile(activePhoto)}>
                  <AppIcon name="star-outline" size={18} color="#fff" />
                  <Text style={styles.lightboxActionText}>{i18n.setAsProfileLabel}</Text>
                </TouchableOpacity>
              )}
              {activePhoto.isProfile && (
                <View style={[styles.lightboxAction, {opacity: 0.6}]}>
                  <AppIcon name="star" size={18} color="#FFD700" />
                  <Text style={styles.lightboxActionText}>{i18n.profilePhotoLabel}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.lightboxAction} onPress={() => deletePhoto(activePhoto)}>
                <AppIcon name="trash-can-outline" size={18} color="#e74c3c" />
                <Text style={[styles.lightboxActionText, {color: '#e74c3c'}]}>{i18n.deleteLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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

function TelemetryRow({
  icon, label, value, valueColor, mono, last,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.telemetryRow, !last && styles.telemetryBorder]}>
      <AppIcon name={icon} size={16} color={Colors.primary} />
      <Text style={styles.telemetryLabel}>{label}</Text>
      <Text style={[styles.telemetryValue, valueColor ? {color: valueColor} : {}, mono ? {fontFamily: 'monospace', fontSize: 11} : {}]}>
        {value}
      </Text>
    </View>
  );
}

function DocRow({label, value, last, warn}: {label: string; value: string; last?: boolean; warn?: boolean}) {
  return (
    <View style={[styles.docRow, !last && styles.docBorder]}>
      <Text style={styles.docLabel}>{label}</Text>
      <Text style={[styles.docValue, warn && {color: '#e74c3c'}]}>{value}</Text>
    </View>
  );
}

const DOC_ICONS: Record<string, string> = {
  VEHICLE_REGISTRATION: 'card-account-details-outline',
  VEHICLE_INSURANCE:    'shield-check-outline',
  PERIODIC_INSPECTION:  'clipboard-check-outline',
  DRIVER_LICENSE:       'card-account-details-outline',
  TRANSPORT_PERMIT:     'truck-delivery-outline',
  OWNERSHIP_DEED:       'file-certificate-outline',
  OPERATION_CARD:       'file-document-outline',
  DEFAULT:              'file-outline',
};

const DOC_LABELS: Record<string, Record<string, string>> = {
  VEHICLE_REGISTRATION: {ar: 'تسجيل مركبة', en: 'Vehicle Registration', hi: 'वाहन पंजीकरण', bn: 'গাড়ি নিবন্ধন', ur: 'گاڑی رجسٹریشن'},
  VEHICLE_INSURANCE: {ar: 'تأمين مركبة', en: 'Vehicle Insurance', hi: 'वाहन बीमा', bn: 'গাড়ির বীমা', ur: 'گاڑی انشورنس'},
  PERIODIC_INSPECTION: {ar: 'فحص دوري', en: 'Periodic Inspection', hi: 'आवधिक निरीक्षण', bn: 'পর্যায়ক্রমিক পরিদর্শন', ur: 'وقتاً فوقتاً معائنہ'},
  DRIVER_LICENSE: {ar: 'رخصة قيادة', en: 'Driver License', hi: 'ड्राइवर लाइसेंस', bn: 'ড্রাইভার লাইসেন্স', ur: 'ڈرائیور لائسنس'},
  TRANSPORT_PERMIT: {ar: 'تصريح نقل', en: 'Transport Permit', hi: 'परिवहन परमिट', bn: 'পরিবহন পারমিট', ur: 'ٹرانسپورٹ پرمٹ'},
  OWNERSHIP_DEED: {ar: 'صك ملكية', en: 'Ownership Deed', hi: 'स्वामित्व विलेख', bn: 'মালিকানা দলিল', ur: 'ملکیت دستاویز'},
  OPERATION_CARD: {ar: 'بطاقة تشغيل', en: 'Operation Card', hi: 'ऑपरेशन कार्ड', bn: 'অপারেশন কার্ড', ur: 'آپریشن کارڈ'},
};

function DocFileRow({
  doc,
  locale,
  last,
}: {
  doc: {id: string; type: string; fileUrl: string; issueDate: string; expiryDate: string; issuingAuthority?: string};
  locale: Locale;
  last: boolean;
}) {
  const i18n = t(locale);
  const expiry = doc.expiryDate
    ? new Date(doc.expiryDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})
    : '—';
  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
  const icon = DOC_ICONS[doc.type] ?? DOC_ICONS.DEFAULT;
  const typeName = DOC_LABELS[doc.type]?.[locale] ?? doc.type.replace(/_/g, ' ');

  async function handleOpen() {
    const url = doc.fileUrl;
    if (!url) return;
    const candidates = resolveApiAssetUrls(url).map((candidate) => encodeURI(candidate));
    try {
      const resolvedUrl = await findReachableDocumentUrl(candidates);
      await Linking.openURL(resolvedUrl);
    } catch {
      const resolvedUrl = candidates[0];
      const isPdf = /\.pdf($|\?)/i.test(resolvedUrl);
      if (isPdf) {
        try {
          await Linking.openURL(`https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(resolvedUrl)}`);
          return;
        } catch {
          // Fall through to the user-facing error below.
        }
      }

      Alert.alert(
        i18n.cannotOpenFile,
        i18n.cannotOpenFileMsg,
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
          {i18n.expLabel}{expiry}
        </Text>
      </View>
      <View style={styles.downloadBtn}>
        <AppIcon name="download" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

async function findReachableDocumentUrl(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {method: 'HEAD'});
      if (response.ok || response.status === 405) {
        return candidate;
      }
    } catch {
      // Try the next URL candidate.
    }
  }

  return candidates[0];
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
  mapCanvas: {height: '100%', width: '100%'},
  mapEmptyState: {flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8},
  mapEmptyText: {fontSize: 12, color: Colors.textMuted},
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

  // GPS Telemetry card
  telemetryCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: 14, marginBottom: 20,
  },
  telemetryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, gap: 10,
  },
  telemetryBorder: {borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  telemetryLabel: {flex: 1, fontSize: 13, color: Colors.textMuted},
  telemetryValue: {fontSize: 13, fontWeight: '600' as const, color: Colors.textPrimary},

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

  // Driver thumb
  driverThumb: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  driverThumbImg: {width: 36, height: 36, borderRadius: 18},
  driverThumbInitial: {fontSize: 14, fontWeight: '700' as const, color: Colors.primary},

  // Photo gallery
  photoThumb: {
    width: 96, height: 80, borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.borderLight,
  },
  photoThumbProfile: {borderColor: Colors.primary},
  photoThumbImg: {width: '100%', height: '100%'},
  profileBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: Colors.primary, borderRadius: 10,
    padding: 2,
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  lightboxImg: {width: '100%', height: '75%'},
  lightboxClose: {
    position: 'absolute', top: 50, right: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, padding: 8,
  },
  lightboxActions: {
    position: 'absolute', bottom: 48,
    flexDirection: 'row', gap: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12,
  },
  lightboxAction: {alignItems: 'center', gap: 4},
  lightboxActionText: {fontSize: 11, color: '#fff'},

  // Photos section header
  photosSectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16},
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  addPhotoBtnText: {fontSize: 12, color: Colors.primary, fontWeight: '600' as const},
  emptyPhotos: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    borderStyle: 'dashed', marginBottom: 16,
  },
  emptyPhotosText: {fontSize: 13, color: Colors.textMuted},
});
