/**
 * DocumentDetailScreen — View a single FleetDocument with edit + delete actions
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
  Linking,
} from 'react-native';
import { api, resolveApiAssetUrls } from '../lib/api';
import { Colors, Radius, Shadow, Spacing, Typography } from '../lib/theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Locale, t, isRTL as isRTLFn } from '../lib/i18n';
import { formatDateSmart } from '../lib/dates';
import { Alert } from '../lib/alert';

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

// ── Types ─────────────────────────────────────────────────────────────────────

interface LinkedVehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
}
interface LinkedDriver {
  id: string;
  fullName: string;
}

interface FleetDocument {
  id: string;
  type: string;
  fileUrl: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string;
  referenceNumber?: string;
  notes?: string;
  vehicles: LinkedVehicle[];
  drivers: LinkedDriver[];
}

interface Props {
  documentId: string;
  locale: Locale;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  /** When true, hide edit/delete if the document is linked to any vehicle */
  driverView?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function docTypeLabel(type: string, i18n: ReturnType<typeof t>): string {
  const map: Record<string, string> = {
    DRIVER_LICENSE: i18n.docTypeDriverLicense,
    DRIVER_CARD: i18n.docTypeDriverCard,
    VEHICLE_INSURANCE: i18n.docTypeVehicleInsurance,
    PERIODIC_INSPECTION: i18n.docTypePeriodicInspection,
    VEHICLE_REGISTRATION: i18n.docTypeVehicleRegistration,
    OPERATION_CARD: i18n.docTypeOperationCard,
    TRANSPORT_PERMIT: i18n.docTypeTransportPermit,
    OWNERSHIP_DEED: i18n.docTypeOwnershipDeed,
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

function statusBadge(
  expiryDate: string,
  i18n: ReturnType<typeof t>
): { label: string; color: string; bg: string } {
  const now = new Date();
  const exp = new Date(expiryDate);
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (exp < now) {
    return { label: i18n.statusExpired, color: '#fff', bg: Colors.danger };
  }
  if (exp <= soon) {
    return { label: i18n.statusExpiring, color: '#fff', bg: Colors.warning };
  }
  return { label: i18n.statusValid, color: '#fff', bg: Colors.success };
}

function InfoRow({
  label,
  value,
  locale,
}: {
  label: string;
  value: string | null | undefined;
  locale: Locale;
}) {
  const isRTL = isRTLFn(locale);
  const rowDirectionStyle = isRTL ? styles.row : styles.rowReverse;
  const labelAlignStyle = isRTL ? styles.textLeft : styles.textRight;
  const valueAlignStyle = isRTL ? styles.textRight : styles.textLeft;
  if (!value) {
    return null;
  }
  return (
    <View style={[styles.infoRow, rowDirectionStyle]}>
      <Text style={[styles.infoLabel, labelAlignStyle]}>{label}</Text>
      <Text style={[styles.infoValue, valueAlignStyle]}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DocumentDetailScreen({
  documentId,
  locale,
  onBack,
  onEdit,
  onDeleted,
  driverView,
}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);
  const rowDirectionStyle = isRTL ? styles.row : styles.rowReverse;
  const linkedVehicleRowDirectionStyle = isRTL ? styles.rowReverse : styles.row;
  const labelAlignStyle = isRTL ? styles.textLeft : styles.textRight;

  const [doc, setDoc] = useState<FleetDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // When viewed by a driver, hide edit/delete if the doc is linked to any vehicle
  const readOnly = driverView && (doc?.vehicles?.length ?? 0) > 0;

  useEffect(() => {
    api
      .get<FleetDocument>(`/documents/${documentId}`)
      .then(setDoc)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  function confirmDelete() {
    Alert.alert(i18n.deleteDocument, i18n.deleteDocConfirm, [
      { text: i18n.cancel, style: 'cancel' },
      {
        text: i18n.deleteLabel,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/documents/${documentId}`);
            onDeleted();
          } catch {
            Alert.alert(i18n.error, i18n.failedToLoadDoc);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  async function openFile() {
    if (!doc?.fileUrl) {
      return;
    }
    const candidates = resolveApiAssetUrls(doc.fileUrl).map((candidate) =>
      encodeURI(candidate)
    );

    try {
      const resolvedUrl = await findReachableDocumentUrl(candidates);
      await Linking.openURL(resolvedUrl);
    } catch {
      const resolvedUrl = candidates[0];
      const isPdf = /\.pdf($|\?)/i.test(resolvedUrl);
      if (isPdf) {
        try {
          await Linking.openURL(
            `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
              resolvedUrl
            )}`
          );
          return;
        } catch {
          // Fall through to the user-facing error below.
        }
      }

      Alert.alert(i18n.cannotOpenFile, i18n.cannotOpenFileMsg);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!doc) {
    return (
      <View style={styles.loader}>
        <AppIcon name="file-alert-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorMsg}>{i18n.failedToLoadDoc}</Text>
        <TouchableOpacity onPress={onBack} style={styles.goBackBtn}>
          <Text style={styles.goBackText}>{i18n.goBack}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = statusBadge(doc.expiryDate, i18n);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.statusBarSpacer} />
        <View style={[styles.headerRow, rowDirectionStyle]}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <AppIcon
              name={isRTL ? 'arrow-right' : 'arrow-left'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {i18n.viewDocument}
          </Text>
          <View style={[styles.headerActions, rowDirectionStyle]}>
            {!readOnly && (
              <>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={onEdit}
                  activeOpacity={0.7}
                >
                  <AppIcon name="pencil-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={confirmDelete}
                  disabled={deleting}
                  activeOpacity={0.7}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <AppIcon name="trash-can-outline" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Identity card ── */}
        <View style={[styles.identityCard, rowDirectionStyle]}>
          <View style={styles.identityIconWrap}>
            <AppIcon
              name="file-document-outline"
              size={32}
              color={Colors.primary}
            />
          </View>
          <View style={styles.identityInfo}>
            <Text style={[styles.docTypeName, labelAlignStyle]}>
              {docTypeLabel(doc.type, i18n)}
            </Text>
            <View style={[styles.badgeRow, rowDirectionStyle]}>
              {!!doc.referenceNumber && (
                <Text style={[styles.refNumber, labelAlignStyle]}>
                  #{doc.referenceNumber}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* ── Dates ── */}
        <View style={[styles.datesRow, rowDirectionStyle]}>
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.issueDateLabel}</Text>
            <Text style={styles.dateValue}>
              {formatDateSmart(doc.issueDate, locale)}
            </Text>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.expiryLabel}</Text>
            <Text
              style={[
                styles.dateValue,
                badge.bg !== Colors.success && { color: badge.bg },
              ]}
            >
              {formatDateSmart(doc.expiryDate, locale)}
            </Text>
          </View>
        </View>

        {/* ── Details ── */}
        {(doc.issuingAuthority || doc.notes) && (
          <View style={styles.section}>
            <InfoRow
              label={i18n.issuingAuthorityLabel}
              value={doc.issuingAuthority}
              locale={locale}
            />
            {!!doc.issuingAuthority && !!doc.notes && (
              <View style={styles.rowDivider} />
            )}
            <InfoRow
              label={i18n.notesLabel}
              value={doc.notes}
              locale={locale}
            />
          </View>
        )}

        {/* ── Open file ── */}
        {!!doc.fileUrl && (
          <TouchableOpacity
            style={[styles.fileRow, rowDirectionStyle]}
            onPress={openFile}
            activeOpacity={0.8}
          >
            <View style={styles.fileIcon}>
              <AppIcon name="file-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileMain, labelAlignStyle]}>
                {docTypeLabel(doc.type, i18n)}
              </Text>
              <Text style={[styles.fileSub, labelAlignStyle]}>
                {i18n.openFile}
              </Text>
            </View>
            <View style={styles.fileAction}>
              <AppIcon name="download" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Linked Vehicles ── */}
        {doc.vehicles.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{i18n.linkedVehicles}</Text>
            <View style={styles.section}>
              {doc.vehicles.map((v, idx) => (
                <React.Fragment key={v.id}>
                  {idx > 0 && <View style={styles.rowDivider} />}
                  <View
                    style={[styles.linkRow, linkedVehicleRowDirectionStyle]}
                  >
                    <AppIcon
                      name="truck-outline"
                      size={18}
                      color={Colors.primary}
                    />
                    <View style={styles.linkInfo}>
                      <Text style={[styles.linkMain, labelAlignStyle]}>
                        {v.plateNumber}
                      </Text>
                      <Text style={[styles.linkSub, labelAlignStyle]}>
                        {v.make} {v.model} {v.year}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* ── Linked Drivers ── */}
        {doc.drivers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{i18n.linkedDrivers}</Text>
            <View style={styles.section}>
              {doc.drivers.map((d, idx) => (
                <React.Fragment key={d.id}>
                  {idx > 0 && <View style={styles.rowDivider} />}
                  <View style={[styles.linkRow, rowDirectionStyle]}>
                    <AppIcon
                      name="account-outline"
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={styles.linkMain}>{d.fullName}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

async function findReachableDocumentUrl(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: 'HEAD' });
      if (response.ok || response.status === 405) {
        return candidate;
      }
    } catch {
      // Try the next URL candidate.
    }
  }

  return candidates[0];
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.bg,
  },
  errorMsg: {
    ...Typography.bodyMd,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  goBackBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
  },
  goBackText: { color: Colors.primary, fontWeight: '700' },
  header: { backgroundColor: Colors.primary, paddingBottom: 16 },
  statusBarSpacer: { height: SB_H },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerActions: { minWidth: 84, gap: 8 },
  scrollContent: { padding: Spacing.lg, gap: 14 },
  identityCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: 14,
    alignItems: 'center',
    ...Shadow.sm,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: 18,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: { flex: 1, gap: 2 },
  fileMain: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  fileSub: { fontSize: 12, color: Colors.textMuted },
  fileAction: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityInfo: { flex: 1, gap: 6 },
  docTypeName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  refNumber: { ...Typography.caption, color: Colors.textMuted },

  // Dates
  datesRow: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    padding: Spacing.md,
    ...Shadow.sm,
  },
  datePair: { flex: 1 },
  dateDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  dateLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  dateValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },

  // Details section
  section: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
    width: 120,
  },
  infoValue: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 2,
  },

  // Linked items
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  linkInfo: { flex: 1, gap: 2 },
  linkMain: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  linkSub: { fontSize: 12, color: Colors.textMuted },
  bottomSpacer: { height: 40 },
});
