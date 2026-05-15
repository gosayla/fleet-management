import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { api } from '../lib/api';
import { Locale, t, isRTL } from '../lib/i18n';
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { DateWheelModal } from '../components/ui/DateWheelModal';

const SB_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

interface VehicleOption {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}
interface DriverOption {
  id: string;
  fullName: string;
  phone?: string;
}

interface Props {
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

function SectionLabel({
  text,
  required,
}: {
  text: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.sectionLabel}>
      {text}
      {required ? <Text style={styles.requiredMark}> *</Text> : null}
    </Text>
  );
}

export function FuelFormScreen({ locale, onBack, onSuccess }: Props) {
  const i18n = t(locale);
  const rtl = isRTL(locale);
  const rowDirectionStyle = rtl ? styles.row : styles.rowReverse;
  const textStartStyle = rtl ? styles.textRight : styles.textLeft;
  const textEndStyle = rtl ? styles.textLeft : styles.textRight;
  const [form, setForm] = useState({
    vehicleId: '',
    driverId: '',
    liters: '',
    costSar: '',
    odometer: '',
    station: '',
    filledAt: '',
  });
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [driverQuery, setDriverQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    api
      .get<any>('/vehicles?limit=100')
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.data ?? [];
        setVehicles(items);
      })
      .catch(() => {});

    api
      .get<DriverOption[]>('/drivers')
      .then((res) => {
        setDrivers(Array.isArray(res) ? res : []);
      })
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id === form.vehicleId
  );
  const selectedDriver = drivers.find((driver) => driver.id === form.driverId);

  const filteredVehicles = useMemo(() => {
    const query = vehicleQuery.trim().toLowerCase();
    if (!query) {
      return vehicles;
    }
    return vehicles.filter(
      (vehicle) =>
        vehicle.plateNumber.toLowerCase().includes(query) ||
        `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(query)
    );
  }, [vehicleQuery, vehicles]);

  const filteredDrivers = useMemo(() => {
    const query = driverQuery.trim().toLowerCase();
    if (!query) {
      return drivers;
    }
    return drivers.filter(
      (driver) =>
        driver.fullName.toLowerCase().includes(query) ||
        (driver.phone ?? '').toLowerCase().includes(query)
    );
  }, [driverQuery, drivers]);

  async function save() {
    if (!form.vehicleId) {
      setError(i18n.vehicleRequiredMsg);
      return;
    }
    if (!form.liters.trim()) {
      setError(i18n.requiredField + i18n.litersLabel);
      return;
    }
    if (!form.costSar.trim()) {
      setError(i18n.requiredField + i18n.fuelCostLabel);
      return;
    }
    if (!form.odometer.trim()) {
      setError(i18n.requiredField + i18n.odometerFuelLabel);
      return;
    }
    if (!form.filledAt) {
      setError(i18n.requiredField + i18n.filledAtLabel);
      return;
    }

    const liters = Number(form.liters);
    const costSar = Number(form.costSar);
    const odometer = Number(form.odometer);

    if (!Number.isFinite(liters) || liters <= 0) {
      setError(i18n.requiredField + i18n.litersLabel);
      return;
    }
    if (!Number.isFinite(costSar) || costSar < 0) {
      setError(i18n.requiredField + i18n.fuelCostLabel);
      return;
    }
    if (!Number.isFinite(odometer) || odometer < 0) {
      setError(i18n.requiredField + i18n.odometerFuelLabel);
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/fuel', {
        vehicleId: form.vehicleId,
        ...(form.driverId ? { driverId: form.driverId } : {}),
        liters,
        costSar,
        odometer,
        ...(form.station.trim() ? { station: form.station.trim() } : {}),
        filledAt: new Date(form.filledAt).toISOString(),
      });
      onSuccess();
    } catch (e: any) {
      const message = e?.response?.data?.message ?? e?.message ?? i18n.error;
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.headerRow, rowDirectionStyle]}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <AppIcon
              name={rtl ? 'arrow-right' : 'arrow-left'}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.addFuelLog}</Text>
          <TouchableOpacity
            onPress={save}
            style={styles.saveBtn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>{i18n.save}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && (
          <Text style={[styles.errorBanner, rtl && styles.rtlText]}>
            {error}
          </Text>
        )}

        <SectionLabel text={i18n.vehicleSection} required />
        <TouchableOpacity
          style={[styles.pickerRow, rowDirectionStyle]}
          onPress={() => setVehiclePickerOpen(true)}
          activeOpacity={0.7}
        >
          {selectedVehicle ? (
            <View style={[styles.pickerSelected, rowDirectionStyle]}>
              <View style={styles.plateBadge}>
                <Text style={styles.plateBadgeText}>
                  {selectedVehicle.plateNumber}
                </Text>
              </View>
              <Text style={styles.pickerName}>
                {selectedVehicle.make} {selectedVehicle.model}
              </Text>
            </View>
          ) : (
            <Text style={styles.pickerPlaceholder}>
              {i18n.selectVehiclePicker}
            </Text>
          )}
          <AppIcon name="chevron-down" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <SectionLabel text={i18n.driverSection} />
        <TouchableOpacity
          style={[styles.pickerRow, rowDirectionStyle]}
          onPress={() => setDriverPickerOpen(true)}
          activeOpacity={0.7}
        >
          {selectedDriver ? (
            <View style={[styles.pickerSelected, rowDirectionStyle]}>
              <View style={styles.driverBadge}>
                <AppIcon
                  name="account-outline"
                  size={14}
                  color={Colors.primary}
                />
              </View>
              <Text style={[styles.pickerName, textStartStyle]}>
                {selectedDriver.fullName}
              </Text>
            </View>
          ) : (
            <Text style={styles.pickerPlaceholder}>
              {i18n.selectDriverPicker}
            </Text>
          )}
          <AppIcon name="chevron-down" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <SectionLabel text={i18n.litersLabel} required />
        <TextInput
          style={[styles.input, textStartStyle]}
          value={form.liters}
          onChangeText={(value) => set('liters', value)}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />

        <SectionLabel text={i18n.fuelCostLabel} required />
        <TextInput
          style={[styles.input, textStartStyle]}
          value={form.costSar}
          onChangeText={(value) => set('costSar', value)}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />

        <SectionLabel text={i18n.odometerFuelLabel} required />
        <TextInput
          style={[styles.input, textStartStyle]}
          value={form.odometer}
          onChangeText={(value) => set('odometer', value)}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />

        <SectionLabel text={i18n.stationLabel} />
        <TextInput
          style={[styles.input, textStartStyle]}
          value={form.station}
          onChangeText={(value) => set('station', value)}
          placeholder={i18n.stationLabel}
          placeholderTextColor={Colors.textMuted}
        />

        <SectionLabel text={i18n.filledAtLabel} required />
        <TouchableOpacity
          style={[styles.dateRow, rowDirectionStyle]}
          onPress={() => setDatePickerOpen(true)}
        >
          <Text
            style={form.filledAt ? styles.dateValue : styles.datePlaceholder}
          >
            {form.filledAt || 'YYYY-MM-DD'}
          </Text>
          <AppIcon name="calendar" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {vehiclePickerOpen && (
        <View style={styles.pickerModal}>
          <View style={styles.pickerSheet}>
            <View style={[styles.pickerModalHeader, rowDirectionStyle]}>
              <Text style={styles.pickerModalTitle}>{i18n.selectVehicle}</Text>
              <TouchableOpacity onPress={() => setVehiclePickerOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.pickerSearchWrap, rowDirectionStyle]}>
              <AppIcon name="magnify" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.pickerSearch}
                value={vehicleQuery}
                onChangeText={setVehicleQuery}
                placeholder={i18n.searchVehicles}
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
            </View>
            {filteredVehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.pickerItem,
                  rowDirectionStyle,
                  form.vehicleId === vehicle.id && styles.pickerItemActive,
                ]}
                onPress={() => {
                  set('vehicleId', vehicle.id);
                  setVehiclePickerOpen(false);
                  setVehicleQuery('');
                }}
              >
                <View style={styles.pickerItemIcon}>
                  <AppIcon
                    name="truck-outline"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={[styles.pickerItemPlate, textEndStyle]}>
                    {vehicle.plateNumber}
                  </Text>
                  <Text style={[styles.pickerItemSub, textEndStyle]}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                </View>
                {form.vehicleId === vehicle.id && (
                  <AppIcon name="check" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            {filteredVehicles.length === 0 && (
              <Text style={styles.pickerEmpty}>{i18n.noVehicles}</Text>
            )}
          </View>
        </View>
      )}

      {driverPickerOpen && (
        <View style={styles.pickerModal}>
          <View style={styles.pickerSheet}>
            <View style={[styles.pickerModalHeader, rowDirectionStyle]}>
              <Text style={styles.pickerModalTitle}>{i18n.selectDriver}</Text>
              <TouchableOpacity onPress={() => setDriverPickerOpen(false)}>
                <AppIcon name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchWrap}>
              <AppIcon name="magnify" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.pickerSearch}
                value={driverQuery}
                onChangeText={setDriverQuery}
                placeholder={i18n.searchDrivers}
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={styles.clearDriverRow}
              onPress={() => {
                set('driverId', '');
                setDriverPickerOpen(false);
                setDriverQuery('');
              }}
            >
              <Text style={styles.clearDriverText}>{i18n.noneSelected}</Text>
            </TouchableOpacity>
            {filteredDrivers.map((driver) => (
              <TouchableOpacity
                key={driver.id}
                style={[
                  styles.pickerItem,
                  rowDirectionStyle,
                  form.driverId === driver.id && styles.pickerItemActive,
                ]}
                onPress={() => {
                  set('driverId', driver.id);
                  setDriverPickerOpen(false);
                  setDriverQuery('');
                }}
              >
                <View style={styles.pickerItemIcon}>
                  <AppIcon
                    name="account-outline"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.flexOne}>
                  <Text style={[styles.pickerItemPlate, textEndStyle]}>
                    {driver.fullName}
                  </Text>
                  <Text style={[styles.pickerItemSub, textEndStyle]}>
                    {driver.phone ?? ''}
                  </Text>
                </View>
                {form.driverId === driver.id && (
                  <AppIcon name="check" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            {filteredDrivers.length === 0 && (
              <Text style={styles.pickerEmpty}>{i18n.noDrivers}</Text>
            )}
          </View>
        </View>
      )}

      <DateWheelModal
        visible={datePickerOpen}
        value={form.filledAt}
        locale={locale}
        cancelLabel={i18n.cancel}
        doneLabel={i18n.done}
        label={i18n.filledAtLabel}
        onConfirm={(value) => {
          set('filledAt', value);
          setDatePickerOpen(false);
        }}
        onClose={() => setDatePickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  row: { flexDirection: 'row' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  flexOne: { flex: 1 },
  header: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg },
  statusBarSpacer: { height: SB_HEIGHT },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14 },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: Spacing.lg },
  errorBanner: {
    backgroundColor: Colors.dangerLight,
    color: Colors.danger,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dateRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dateValue: { fontSize: 15, color: Colors.textPrimary },
  datePlaceholder: { fontSize: 15, color: Colors.textMuted },
  pickerRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pickerSelected: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerPlaceholder: { flex: 1, fontSize: 15, color: Colors.textMuted },
  pickerName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  plateBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  plateBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  driverBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 30,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickerSearch: {
    flex: 1,
    marginStart: 8,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  pickerItemActive: { backgroundColor: Colors.primaryLight },
  pickerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemPlate: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerItemSub: { fontSize: 12, color: Colors.textMuted },
  pickerEmpty: { padding: 20, textAlign: 'center', color: Colors.textMuted },
  clearDriverRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  clearDriverText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  rowReverse: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  requiredMark: { color: Colors.danger },
  bottomSpacer: { height: 40 },
});
