/**
 * HandoverReportScreen — Read-only handover report for a staff vehicle assignment
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import { api, resolveApiAssetUrls } from '../lib/api';
import { API_URL } from '../lib/env';

const WEB_BASE = API_URL.replace(/\/api\/v1\/?$/, '');
import { Colors, Spacing } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Locale, t, isRTL as isRTLFn } from '../lib/i18n';
import { formatDateSmart } from '../lib/dates';

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;
const ACCENT = '#7C3AED';
const SCREEN_W = Dimensions.get('window').width;

const CHECKLIST_ITEMS: { id: string; en: string; ar: string }[] = [
  { id: 'vehicle_keys',      en: 'Vehicle Keys',       ar: 'مفاتيح المركبة' },
  { id: 'spare_tire',        en: 'Spare Tire',          ar: 'الإطار الاحتياطي' },
  { id: 'jack',              en: 'Jack',                ar: 'الرافعة' },
  { id: 'toolkit',           en: 'Toolkit',             ar: 'حقيبة الأدوات' },
  { id: 'warning_triangle',  en: 'Warning Triangle',    ar: 'مثلث التحذير' },
  { id: 'fire_extinguisher', en: 'Fire Extinguisher',   ar: 'طفاية الحريق' },
  { id: 'first_aid_kit',     en: 'First Aid Kit',       ar: 'حقيبة الإسعافات' },
  { id: 'front_camera',      en: 'Front Camera',        ar: 'كاميرا أمامية' },
  { id: 'rear_camera',       en: 'Rear Camera',         ar: 'كاميرا خلفية' },
  { id: 'dashboard_screen',  en: 'Dashboard Screen',    ar: 'شاشة لوحة القيادة' },
  { id: 'registration_card', en: 'Registration Card',   ar: 'وثيقة التسجيل' },
  { id: 'insurance_card',    en: 'Insurance Card',      ar: 'وثيقة التأمين' },
  { id: 'fuel_card',         en: 'Fuel Card',           ar: 'بطاقة الوقود' },
  { id: 'floor_mats',        en: 'Floor Mats',          ar: 'سجادة المركبة' },
];

interface Assignment {
  id: string;
  assigneeName: string;
  assigneeTitle?: string | null;
  assigneePhone?: string | null;
  assigneeNationalId?: string | null;
  assignedAt: string;
  returnedAt?: string | null;
  odometerOut?: number | null;
  odometerIn?: number | null;
  fuelLevel?: number | null;
  conditionRating?: string | null;
  conditionPhotos?: string[];
  checklistItems?: string[];
  signatureUrl?: string | null;
  managerSignatureUrl?: string | null;
  notes?: string | null;
  vehicle?: {
    id?: string;
    plateNumber: string;
    make: string;
    model: string;
    year?: number | null;
    color?: string | null;
  };
}

interface Props {
  assignmentId: string;
  type?: 'staff' | 'rental';
  locale: Locale;
  onBack: () => void;
}

export function HandoverReportScreen({ assignmentId, type = 'staff', locale, onBack }: Props) {
  const i18n = t(locale);
  const rtl = isRTLFn(locale);
  const rowDir: 'row' | 'row-reverse' = rtl ? 'row' : 'row-reverse';

  const isRental = type === 'rental';

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const endpoint = isRental ? `/rentals/${assignmentId}` : `/staff-assignments/${assignmentId}`;
    api
      .get<any>(endpoint)
      .then((data) => {
        if (isRental) {
          // Normalize rental fields into Assignment shape
          setAssignment({
            ...data,
            assigneeName: data.clientName,
            assigneePhone: data.clientPhone ?? null,
            assigneeNationalId: data.clientNationalId ?? null,
            assigneeTitle: data.contractNumber ? `#${data.contractNumber}` : null,
            assignedAt: data.rentalStart,
            returnedAt: data.status === 'RETURNED' ? (data.returnedAt ?? data.rentalEnd ?? null) : null,
            odometerOut: data.odometerOut ?? null,
            odometerIn: data.odometerIn ?? null,
          });
        } else {
          setAssignment(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId, isRental]);

  function resolveUrl(path: string) {
    return resolveApiAssetUrls(path)[0];
  }

  const webLocale = locale === 'ar' ? 'ar' : 'en';

  function getWebReportUrl(): string | null {
    if (isRental) {
      return `${WEB_BASE}/${webLocale}/dashboard/rentals/${assignmentId}/report`;
    }
    const vid = assignment?.vehicle?.id;
    if (!vid) return null;
    return `${WEB_BASE}/${webLocale}/dashboard/vehicles/${vid}/staff/${assignmentId}/report`;
  }

  async function handleShare() {
    const url = getWebReportUrl();
    if (!url) return;
    try {
      await Share.share({ message: url, url });
    } catch {
      await Linking.openURL(url);
    }
  }

  function conditionLabel(r?: string | null) {
    if (r === 'GOOD') return i18n.conditionGood;
    if (r === 'FAIR') return i18n.conditionFair;
    if (r === 'POOR') return i18n.conditionPoor;
    return '—';
  }

  function conditionColor(r?: string | null) {
    if (r === 'GOOD') return '#166534';
    if (r === 'FAIR') return '#92400e';
    if (r === 'POOR') return '#991b1b';
    return Colors.textMuted;
  }

  function fuelBarColor(pct: number) {
    if (pct > 50) return '#16a34a';
    if (pct > 20) return '#d97706';
    return '#dc2626';
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AppIcon name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isRental ? i18n.rentalHandoverTitle : i18n.vehicleHandoverTitle}
        </Text>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={!assignment}
        >
          <AppIcon name="share-outline" size={22} color={assignment ? '#fff' : 'rgba(255,255,255,0.3)'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : !assignment ? (
        <View style={styles.center}>
          <AppIcon name="alert-circle-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{i18n.error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status badge */}
          <View style={[styles.statusRow, { flexDirection: rowDir }]}>
            <Text style={styles.recordId}>
              #{assignment.id.slice(0, 8).toUpperCase()}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: assignment.returnedAt ? '#f3f4f6' : '#ede9fe' },
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: assignment.returnedAt ? Colors.textMuted : ACCENT },
              ]}>
                {assignment.returnedAt ? i18n.reportStatusReturned : i18n.reportStatusActive}
              </Text>
            </View>
          </View>

          {/* Vehicle & Assignee cards */}
          <View style={[styles.twoCol, {flexDirection: rtl ? 'row' : 'row-reverse'}]}>
            <Section title={i18n.vehicleSection} accent={ACCENT} style={{ flex: 1, marginEnd: 6 }}>
              {assignment.vehicle ? (
                <>
                  <InfoRow label={i18n.plateNumber} value={assignment.vehicle.plateNumber} mono rtl={rtl} />
                  <InfoRow
                    label={i18n.modelField}
                    value={[assignment.vehicle.year, assignment.vehicle.make, assignment.vehicle.model].filter(Boolean).join(' ')}
                    rtl={rtl}
                  />
                  {!!assignment.vehicle.color && (
                    <InfoRow label={i18n.colorField} value={assignment.vehicle.color} rtl={rtl} />
                  )}
                </>
              ) : (
                <Text style={styles.naText}>—</Text>
              )}
            </Section>

            <Section title={isRental ? i18n.clientDetailsLabel : i18n.assigneeDetailsLabel} accent={ACCENT} style={{ flex: 1, marginStart: 6 }}>
              <InfoRow label={i18n.nameLabel} value={assignment.assigneeName} rtl={rtl} />
              {!!assignment.assigneeTitle && (
                <InfoRow label={isRental ? i18n.contractLabel : i18n.staffAssigneeTitle} value={assignment.assigneeTitle} rtl={rtl} />
              )}
              {!!assignment.assigneePhone && (
                <InfoRow label={i18n.phone} value={assignment.assigneePhone} rtl={rtl} />
              )}
              {!!assignment.assigneeNationalId && (
                <InfoRow label={i18n.nationalIdLabel} value={assignment.assigneeNationalId} mono rtl={rtl} />
              )}
            </Section>
          </View>

          {/* Handover state */}
          <Section title={i18n.handoverSection} accent={ACCENT}>
            <View style={[styles.infoGrid, { flexDirection: rowDir }]}>
              <View style={styles.infoGridCol}>
                <InfoRow
                  label={i18n.handoverDateLabel}
                  value={formatDateSmart(assignment.assignedAt, locale)}
                  rtl={rtl}
                />
                {assignment.odometerOut != null && (
                  <InfoRow
                    label={i18n.staffOdometerOut}
                    value={`${assignment.odometerOut.toLocaleString()} km`}
                    rtl={rtl}
                  />
                )}
              </View>
              <View style={styles.infoGridCol}>
                {assignment.returnedAt && (
                  <InfoRow
                    label={i18n.returnDateLabel}
                    value={formatDateSmart(assignment.returnedAt, locale)}
                    rtl={rtl}
                  />
                )}
                {assignment.odometerIn != null && (
                  <InfoRow
                    label={i18n.staffOdometerIn}
                    value={`${assignment.odometerIn.toLocaleString()} km`}
                    rtl={rtl}
                  />
                )}
              </View>
            </View>

            {/* Fuel level */}
            {assignment.fuelLevel != null && (
              <View style={styles.fuelWrap}>
                <Text style={[styles.infoLabel, { textAlign: !rtl ? 'right' : 'left' }]}>
                  {i18n.fuelLevelLabel}
                </Text>
                <View style={[styles.fuelRow, { flexDirection: rowDir }]}>
                  <Text style={styles.fuelEdge}>E</Text>
                  <View style={styles.fuelTrack}>
                    <View
                      style={[
                        styles.fuelFill,
                        {
                          width: `${assignment.fuelLevel}%` as any,
                          backgroundColor: fuelBarColor(assignment.fuelLevel),
                          alignSelf: rtl ? 'flex-end' : 'flex-start',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.fuelEdge}>F</Text>
                  <Text style={[styles.fuelPct, { color: fuelBarColor(assignment.fuelLevel) }]}>
                    {assignment.fuelLevel}%
                  </Text>
                </View>
              </View>
            )}

            {/* Condition rating */}
            {assignment.conditionRating && (
              <View style={styles.conditionWrap}>
                <Text style={[styles.infoLabel, { textAlign: !rtl ? 'right' : 'left' }]}>
                  {i18n.conditionRatingLabel}
                </Text>
                <View style={[
                  styles.conditionBadge,
                  { backgroundColor: conditionColor(assignment.conditionRating) + '18' },
                ]}>
                  <Text style={[styles.conditionText, { color: conditionColor(assignment.conditionRating) }]}>
                    {conditionLabel(assignment.conditionRating)}
                  </Text>
                </View>
              </View>
            )}

            {/* Notes */}
            {!!assignment.notes && (
              <View style={styles.notesWrap}>
                <Text style={[styles.infoLabel, { textAlign: !rtl ? 'right' : 'left' }]}>
                  {i18n.notes}
                </Text>
                <Text style={[styles.notesText, { textAlign: !rtl ? 'right' : 'left' }]}>
                  {assignment.notes}
                </Text>
              </View>
            )}
          </Section>

          {/* Condition Photos */}
          {assignment.conditionPhotos && assignment.conditionPhotos.length > 0 && (
            <Section title={i18n.conditionPhotosSection} accent={ACCENT}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                {assignment.conditionPhotos.map((url, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.photoThumb}
                    onPress={() => setLightboxUrl(resolveUrl(url))}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: resolveUrl(url) }}
                      style={styles.photoThumbImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Section>
          )}

          {/* Checklist */}
          <Section title={i18n.handoverChecklist} accent={ACCENT}>
            {(assignment.checklistItems ?? []).length === 0 ? (
              <Text style={[styles.naText, { textAlign: !rtl ? 'right' : 'left' }]}>
                {i18n.noChecklistItems}
              </Text>
            ) : (
              <View style={[styles.checklistWrap, rtl && { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
                {CHECKLIST_ITEMS.filter((item) =>
                  (assignment.checklistItems ?? []).includes(item.id)
                ).map((item) => (
                  <View key={item.id} style={styles.checkBadge}>
                    <AppIcon name="check-circle" size={12} color="#16a34a" />
                    <Text style={styles.checkBadgeText}>
                      {locale === 'ar' || locale === 'ur' ? item.ar : item.en}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Section>

          {/* Signatures */}
          <View style={[styles.twoCol, { flexDirection: rowDir }]}>
            <SignatureCard
              label={isRental ? i18n.clientSignatureLabel : i18n.recipientSignatureLabel}
              name={assignment.assigneeName}
              date={formatDateSmart(assignment.assignedAt, locale)}
              sigUrl={assignment.signatureUrl ? resolveUrl(assignment.signatureUrl) : null}
              onPress={(url) => setLightboxUrl(url)}
              style={{ flex: 1, marginEnd: 6 }}
            />
            <SignatureCard
              label={i18n.managerSignatureLabel}
              name={i18n.nameSignatureStamp}
              date={null}
              sigUrl={assignment.managerSignatureUrl ? resolveUrl(assignment.managerSignatureUrl) : null}
              onPress={(url) => setLightboxUrl(url)}
              style={{ flex: 1, marginStart: 6 }}
            />
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            {i18n.reportFooter}
          </Text>
        </ScrollView>
      )}

      {/* Photo lightbox */}
      <Modal visible={!!lightboxUrl} transparent animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <View style={styles.lightboxBg}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUrl(null)}>
            <AppIcon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  accent,
  children,
  style,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={[styles.sectionTitle, { color: accent }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  mono,
  rtl,
}: {
  label: string;
  value: string;
  mono?: boolean;
  rtl: boolean;
}) {
  return (
    <View style={styles.infoRowWrap}>
      <Text style={[styles.infoLabel, { textAlign: !rtl ? 'right' : 'left' }]}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoValueMono, { textAlign: !rtl ? 'right' : 'left' }]}>
        {value}
      </Text>
    </View>
  );
}

function SignatureCard({
  label,
  name,
  date,
  sigUrl,
  onPress,
  style,
}: {
  label: string;
  name: string;
  date: string | null;
  sigUrl: string | null;
  onPress: (url: string) => void;
  style?: object;
}) {
  return (
    <View style={[styles.sigCard, style]}>
      <Text style={styles.sigLabel}>{label}</Text>
      {sigUrl ? (
        <TouchableOpacity onPress={() => onPress(sigUrl)} activeOpacity={0.85}>
          <Image source={{ uri: sigUrl }} style={styles.sigImg} resizeMode="contain" />
        </TouchableOpacity>
      ) : (
        <View style={styles.sigEmpty} />
      )}
      <Text style={styles.sigName}>{name}</Text>
      {date && <Text style={styles.sigDate}>{date}</Text>}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },

  header: {
    paddingTop: SB_H + 10,
    paddingBottom: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 40, alignItems: 'center' },
  shareBtn: { width: 40, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },

  statusRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordId: { fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  twoCol: { gap: 0, marginBottom: 12 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  infoGrid: { flexWrap: 'wrap' },
  infoGridCol: { flex: 1 },
  infoRowWrap: { marginBottom: 8 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  infoValueMono: { fontFamily: 'monospace', fontWeight: '700' },
  naText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },

  fuelWrap: { marginTop: 8 },
  fuelRow: { alignItems: 'center', gap: 6, marginTop: 4 },
  fuelEdge: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, width: 12, textAlign: 'center' },
  fuelTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fuelFill: { height: 8, borderRadius: 4 },
  fuelPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'center' },

  conditionWrap: { marginTop: 8 },
  conditionBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  conditionText: { fontSize: 13, fontWeight: '700' },

  notesWrap: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  notesText: { fontSize: 13, color: Colors.textPrimary },

  photosScroll: { marginTop: 4 },
  photoThumb: { marginEnd: 10, borderRadius: 8, overflow: 'hidden' },
  photoThumbImg: { width: 100, height: 72, borderRadius: 8 },

  checklistWrap: { flexWrap: 'wrap', gap: 6, marginTop: 4 },
  checkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 20,
  },
  checkBadgeText: { fontSize: 12, color: '#166534', fontWeight: '500' },

  sigCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: 12,
  },
  sigLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  sigImg: { width: '100%', height: 72, marginBottom: 6 },
  sigEmpty: { width: '100%', height: 72, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 6 },
  sigName: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary },
  sigDate: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  footer: {
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },

  lightboxBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: SB_H + 12, right: 16, zIndex: 10, padding: 8 },
  lightboxImg: { width: SCREEN_W, height: SCREEN_W * 1.2 },
});
