import React, {useState} from 'react';
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
import {Locale} from '../lib/i18n';
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

interface Props {
  locale: Locale;
  onBack: () => void;
  onSuccess: () => void;
}

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  licenseNumber: string;
  licenseExpiry: string;
  bloodType: '' | BloodType;
}

const EMPTY: FormState = {
  fullName: '',
  phone: '',
  email: '',
  nationalId: '',
  licenseNumber: '',
  licenseExpiry: '',
  bloodType: '',
};

export function DriverFormScreen({locale, onBack, onSuccess}: Props) {
  const isAr = locale === 'ar';
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({...prev, [key]: value}));
  }

  async function handleSubmit() {
    setError('');

    const required: Array<[string, string]> = [
      [form.fullName, isAr ? 'الاسم الكامل' : 'Full Name'],
      [form.phone, isAr ? 'رقم الجوال' : 'Phone'],
      [form.nationalId, isAr ? 'رقم الهوية' : 'National ID'],
      [form.licenseNumber, isAr ? 'رقم الرخصة' : 'License Number'],
      [form.licenseExpiry, isAr ? 'انتهاء الرخصة' : 'License Expiry'],
    ];

    for (const [value, label] of required) {
      if (!value.trim()) {
        setError((isAr ? 'الحقل مطلوب: ' : 'Required: ') + label);
        return;
      }
    }

    const parsedExpiry = new Date(form.licenseExpiry.trim());
    if (Number.isNaN(parsedExpiry.getTime())) {
      setError(isAr ? 'صيغة تاريخ الرخصة غير صحيحة (YYYY-MM-DD)' : 'License expiry date format is invalid (YYYY-MM-DD)');
      return;
    }

    setSubmitting(true);
    try {
      const basePayload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        licenseNumber: form.licenseNumber.trim(),
        ...(form.email.trim() && {email: form.email.trim()}),
        ...(form.bloodType && {bloodType: form.bloodType}),
      };

      // Primary payload matches current web app and local backend DTO.
      try {
        await api.post('/drivers', {
          ...basePayload,
          licenseExpiry: parsedExpiry.toISOString(),
        });
      } catch (firstErr: any) {
        const firstMsg = JSON.stringify(firstErr?.response?.data?.message ?? firstErr?.message ?? '');

        // Compatibility fallback for environments that use licenseExpiryDate instead.
        if (firstMsg.includes('licenseExpiry')) {
          await api.post('/drivers', {
            ...basePayload,
            licenseExpiryDate: form.licenseExpiry.trim(),
          });
        } else {
          throw firstErr;
        }
      }

      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
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
          <Text style={styles.headerTitle}>{isAr ? 'إضافة سائق' : 'Add Driver'}</Text>
          <TouchableOpacity style={[styles.saveBtn, submitting && {opacity: 0.6}]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{isAr ? 'حفظ' : 'Save'}</Text>}
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

          <Text style={styles.section}>{isAr ? 'المعلومات الأساسية' : 'Basic Info'}</Text>
          <View style={styles.card}>
            <Field label={isAr ? 'الاسم الكامل' : 'Full Name'} required>
              <TextInput style={styles.input} value={form.fullName} onChangeText={v => set('fullName', v)} placeholder={isAr ? 'محمد القحطاني' : 'Mohammed Al-Qahtani'} placeholderTextColor={Colors.textMuted} />
            </Field>
            <Divider />
            <Field label={isAr ? 'رقم الجوال' : 'Phone'} required>
              <TextInput style={styles.input} value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="+966501234567" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Divider />
            <Field label={isAr ? 'البريد الإلكتروني' : 'Email'}>
              <TextInput style={styles.input} value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="driver@fleet.com" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Divider />
            <Field label={isAr ? 'رقم الهوية' : 'National ID'} required>
              <TextInput style={styles.input} value={form.nationalId} onChangeText={v => set('nationalId', v)} placeholder="1098765432" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />
            </Field>
          </View>

          <Text style={styles.section}>{isAr ? 'الرخصة' : 'License'}</Text>
          <View style={styles.card}>
            <Field label={isAr ? 'رقم الرخصة' : 'License Number'} required>
              <TextInput style={styles.input} value={form.licenseNumber} onChangeText={v => set('licenseNumber', v)} placeholder="SA-DL-123456" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Divider />
            <Field label={isAr ? 'تاريخ انتهاء الرخصة' : 'License Expiry Date'} required>
              <TextInput style={styles.input} value={form.licenseExpiry} onChangeText={v => set('licenseExpiry', v)} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} keyboardType="numbers-and-punctuation" />
            </Field>
          </View>

          <Text style={styles.section}>{isAr ? 'فصيلة الدم (اختياري)' : 'Blood Type (Optional)'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {BLOOD_TYPES.map(type => (
              <TouchableOpacity key={type} style={[styles.pill, form.bloodType === type && styles.pillActive]} onPress={() => set('bloodType', form.bloodType === type ? '' : type)} activeOpacity={0.8}>
                <Text style={[styles.pillText, form.bloodType === type && styles.pillTextActive]}>{BLOOD_TYPE_LABELS[type]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
});
