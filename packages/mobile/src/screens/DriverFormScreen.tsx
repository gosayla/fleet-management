import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {api} from '../lib/api';
import {Locale, t} from '../lib/i18n';
import {Colors, Spacing} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

const BLOOD_TYPES = [
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'AB_POS',
  'AB_NEG',
  'O_POS',
  'O_NEG',
] as const;

const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
  O_POS: 'O+',
  O_NEG: 'O-',
};

type BloodType = (typeof BLOOD_TYPES)[number];

const DRIVER_STATUSES = ['ACTIVE', 'OFF_DUTY', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'] as const;
type DriverStatus = (typeof DRIVER_STATUSES)[number];

const STATUS_LABELS: Record<DriverStatus, Record<Locale, string>> = {
  ACTIVE:     {en: 'Active',      ar: 'نشط',          hi: 'सक्रिय',     bn: 'সক্রিয়',    ur: 'فعال'},
  OFF_DUTY:   {en: 'Off Duty',    ar: 'خارج الخدمة', hi: 'ड्यूटी से बाहर', bn: 'ড্যুটি থেকে বাইরে', ur: 'ڈیوٹی سے باہر'},
  ON_LEAVE:   {en: 'On Leave',    ar: 'إجازة',       hi: 'छुट्टी पर',   bn: 'ছুটিতে',    ur: 'چھٹی پر'},
  SUSPENDED:  {en: 'Suspended',   ar: 'موقوف',       hi: 'निलंबिت',   bn: 'স্থগিত',    ur: 'معطل'},
  TERMINATED: {en: 'Terminated',  ar: 'منتهي',       hi: 'समाप्ت',     bn: 'সমাপ্ত',    ur: 'ختم'},
};

interface Props {
  locale: Locale;
  driverId?: string;   // present → edit mode
  onBack: () => void;
  onSuccess: () => void;
}

interface FormState {
  fullName: string;
  phone: string;
  nationalId: string;
  licenseExpiry: string;
  bloodType: '' | BloodType;
  status: DriverStatus;
}

const EMPTY: FormState = {
  fullName: '',
  phone: '',
  nationalId: '',
  licenseExpiry: '',
  bloodType: '',
  status: 'ACTIVE',
};

export function DriverFormScreen({locale, driverId, onBack, onSuccess}: Props) {
  const i18n = t(locale);
  const isEdit = !!driverId;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loadingDriver, setLoadingDriver] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (!driverId) return;
    api.get<any>(`/drivers/${driverId}`)
      .then(d => {
        const expiry = d.licenseExpiry
          ? new Date(d.licenseExpiry).toISOString().slice(0, 10)
          : '';
        setForm({
          fullName: d.fullName ?? '',
          phone: d.phone ?? '',
          nationalId: d.nationalId ?? '',
          licenseExpiry: expiry,
          bloodType: (d.bloodType as BloodType | null) ?? '',
          status: (d.status as DriverStatus) ?? 'ACTIVE',
        });
      })
      .catch(() => setError(i18n.failedToLoadDriver))
      .finally(() => setLoadingDriver(false));
  }, [driverId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({...prev, [key]: value}));
  }

  async function handleSubmit() {
    setError('');

    const required: Array<[string, string]> = [
      [form.fullName, i18n.fullName],
      [form.phone, i18n.phoneFieldLabel],
      [form.nationalId, i18n.nationalIdLabel],
      [form.licenseExpiry, i18n.licenseExpiryRequired],
    ];

    for (const [value, label] of required) {
      if (!value.trim()) {
        setError(i18n.requiredField + label);
        return;
      }
    }

    const parsedExpiry = new Date(form.licenseExpiry.trim());
    if (Number.isNaN(parsedExpiry.getTime())) {
      setError(i18n.invalidLicenseDate);
      return;
    }

    setSubmitting(true);
    try {
      const basePayload: Record<string, any> = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        licenseExpiry: parsedExpiry.toISOString(),
        ...(form.bloodType ? {bloodType: form.bloodType} : {}),
      };

      if (isEdit) {
        await api.patch(`/drivers/${driverId}`, {
          ...basePayload,
          status: form.status,
        });
      } else {
        await api.post('/drivers', basePayload);
      }

      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDriver) {
    return (
      <View style={styles.loaderWrap}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <View style={{height: SB_H}} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.8}>
            <AppIcon name="close" size={21} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
          {isEdit ? i18n.editDriver : i18n.addDriver}
          </Text>
          <TouchableOpacity style={[styles.saveBtn, submitting && {opacity: 0.6}]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{i18n.save}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.panel} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!error && (
            <View style={styles.errorBanner}>
              <AppIcon name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.section}>{i18n.basicInfo}</Text>
          <View style={styles.card}>
            <Field label={i18n.fullName} required>
              <TextInput style={styles.input} value={form.fullName} onChangeText={v => set('fullName', v)} placeholder={locale === 'ar' ? 'محمد القحطاني' : 'Mohammed Al-Qahtani'} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Divider />
            <Field label={i18n.phoneFieldLabel} required>
              <TextInput style={styles.input} value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="+966501234567" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Divider />
            <Field label={i18n.nationalIdLabel} required>
              <TextInput style={styles.input} value={form.nationalId} onChangeText={v => set('nationalId', v)} placeholder="1098765432" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
            </Field>
            {!isEdit && (
              <Text style={styles.helperText}>
                {i18n.defaultPasswordNote}
              </Text>
            )}
          </View>

          <Text style={styles.section}>{i18n.licenseSection}</Text>
          <View style={styles.card}>
            <Field label={i18n.licenseExpiryDate} required>
              <TextInput style={styles.input} value={form.licenseExpiry} onChangeText={v => set('licenseExpiry', v)} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} keyboardType="numbers-and-punctuation" />
            </Field>
          </View>

          <Text style={styles.section}>{i18n.bloodTypeOptional}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {BLOOD_TYPES.map(type => (
              <TouchableOpacity key={type} style={[styles.pill, form.bloodType === type && styles.pillActive]} onPress={() => set('bloodType', form.bloodType === type ? '' : type)} activeOpacity={0.8}>
                <Text style={[styles.pillText, form.bloodType === type && styles.pillTextActive]}>{BLOOD_TYPE_LABELS[type]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isEdit && (
            <>
              <Text style={[styles.section, {marginTop: 20}]}>{i18n.statusSection}</Text>
              <View style={styles.card}>
                {DRIVER_STATUSES.map((s, idx) => {
                  const isFirst = idx === 0;
                  const isActive = form.status === s;
                  return (
                    <React.Fragment key={s}>
                      {!isFirst && <Divider />}
                      <TouchableOpacity
                        style={styles.statusRow}
                        onPress={() => set('status', s)}
                        activeOpacity={0.7}>
                        <Text style={[styles.statusLabel, isActive && {color: Colors.primary, fontWeight: '700' as const}]}>
                          {STATUS_LABELS[s][locale]}
                        </Text>
                        {isActive && <AppIcon name="check-circle" size={20} color={Colors.primary} />}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            </>
          )}

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({label, required, children}: {label: string; required?: boolean; children: React.ReactNode}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? <Text style={{color: '#ef4444'}}> *</Text> : null}</Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.primary},
  header: {paddingBottom: 24},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  headerTitle: {fontSize: 18, fontWeight: '700' as const, color: '#fff'},
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  saveBtn: {
    minWidth: 62,
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  saveText: {color: '#fff', fontWeight: '700' as const, fontSize: 14},

  panel: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    overflow: 'hidden',
  },
  content: {paddingHorizontal: Spacing.md, paddingTop: Spacing.md},

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {flex: 1, fontSize: 13, color: '#dc2626'},
  helperText: {fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginTop: 10},

  section: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
  },
  field: {paddingVertical: 12},
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 28,
    paddingVertical: 0,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500' as const,
  },
  divider: {height: 1, backgroundColor: Colors.borderLight},

  pillsRow: {gap: 8, paddingBottom: 4},
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  pillActive: {borderColor: Colors.primary, backgroundColor: Colors.primary},
  pillText: {fontSize: 13, color: Colors.textMuted, fontWeight: '600' as const},
  pillTextActive: {color: '#fff'},

  loaderWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg},

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  statusLabel: {fontSize: 15, color: Colors.textPrimary, fontWeight: '500' as const},
});
