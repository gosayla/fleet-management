/**
 * DocumentDetailScreen — View a single FleetDocument with edit + delete actions
 */
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
  Alert,
  Linking,
} from 'react-native';
import {api} from '../lib/api';
import {Colors, Radius, Shadow, Spacing, Typography} from '../lib/theme';
import {AppIcon} from '../components/ui/AppIcon';
import {Locale, t, isRTL as isRTLFn} from '../lib/i18n';
import {formatDateSmart} from '../lib/dates';

const SB_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

// ── Types ─────────────────────────────────────────────────────────────────────

interface LinkedVehicle {id: string; plateNumber: string; make: string; model: string; year: number}
interface LinkedDriver  {id: string; fullName: string}

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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function docTypeLabel(type: string, i18n: ReturnType<typeof t>): string {
  const map: Record<string, string> = {
    DRIVER_LICENSE: i18n.docTypeDriverLicense,
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
  i18n: ReturnType<typeof t>,
): {label: string; color: string; bg: string} {
  const now = new Date();
  const exp = new Date(expiryDate);
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (exp < now) return {label: i18n.statusExpired,  color: '#fff', bg: Colors.danger};
  if (exp <= soon) return {label: i18n.statusExpiring, color: '#fff', bg: Colors.warning};
  return {label: i18n.statusValid, color: '#fff', bg: Colors.success};
}

function InfoRow({label, value, locale}: {label: string; value: string | null | undefined; locale: Locale}) {
  const isRTL = isRTLFn(locale);
  if (!value) return null;
  return (
    <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
      <Text style={[styles.infoLabel, isRTL && styles.rtlText]}>{label}</Text>
      <Text style={[styles.infoValue, isRTL && styles.rtlText]}>{value}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DocumentDetailScreen({documentId, locale, onBack, onEdit, onDeleted}: Props) {
  const i18n = t(locale);
  const isRTL = isRTLFn(locale);

  const [doc, setDoc] = useState<FleetDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<FleetDocument>(`/documents/${documentId}`)
      .then(setDoc)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  function confirmDelete() {
    Alert.alert(
      i18n.deleteDocument,
      i18n.deleteDocConfirm,
      [
        {text: i18n.cancel, style: 'cancel'},
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
      ],
    );
  }

  async function openFile() {
    if (!doc?.fileUrl) return;
    try {
      const url = doc.fileUrl.startsWith('http')
        ? doc.fileUrl
        : `${(api as any).baseURL ?? ''}${doc.fileUrl}`;
      await Linking.openURL(url);
    } catch {
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
        <View style={{height: SB_H}} />
        <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
            <AppIcon name={isRTL ? 'arrow-right' : 'arrow-left'} size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{i18n.viewDocument}</Text>
          <View style={[styles.headerActions, isRTL && styles.rowReverse]}>
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit} activeOpacity={0.7}>
              <AppIcon name="pencil-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={confirmDelete} disabled={deleting} activeOpacity={0.7}>
              {deleting
                ? <ActivityIndicator size="small" color="#fff" />
                : <AppIcon name="trash-can-outline" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Identity card ── */}
        <View style={styles.identityCard}>
          <View style={styles.identityIconWrap}>
            <AppIcon name="file-document-outline" size={32} color={Colors.primary} />
          </View>
          <View style={styles.identityInfo}>
            <Text style={[styles.docTypeName, isRTL && styles.rtlText]}>
              {docTypeLabel(doc.type, i18n)}
            </Text>
            <View style={[styles.badgeRow, isRTL && styles.rowReverse]}>
              <View style={[styles.badge, {backgroundColor: badge.bg}]}>
                <Text style={[styles.badgeText, {color: badge.color}]}>{badge.label}</Text>
              </View>
              {!!doc.referenceNumber && (
                <Text style={styles.refNumber}>#{doc.referenceNumber}</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Dates ── */}
        <View style={styles.datesRow}>
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.issueDateLabel}</Text>
            <Text style={styles.dateValue}>{formatDateSmart(doc.issueDate, locale)}</Text>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.datePair}>
            <Text style={styles.dateLabel}>{i18n.expiryLabel}</Text>
            <Text style={[styles.dateValue, badge.bg !== Colors.success && {color: badge.bg}]}>
              {formatDateSmart(doc.expiryDate, locale)}
            </Text>
          </View>
        </View>

        {/* ── Details ── */}
        {(doc.issuingAuthority || doc.notes) && (
          <View style={styles.section}>
            <InfoRow label={i18n.issuingAuthorityLabel} value={doc.issuingAuthority} locale={locale} />
            {!!doc.issuingAuthority && !!doc.notes && <View style={styles.rowDivider} />}
            <InfoRow label={i18n.notesLabel} value={doc.notes} locale={locale} />
          </View>
        )}

        {/* ── Open file ── */}
        {!!doc.fileUrl && (
          <TouchableOpacity style={[styles.fileBtn, isRTL && styles.rowReverse]} onPress={openFile} activeOpacity={0.8}>
            <AppIcon name="open-in-new" size={18} color={Colors.primary} />
            <Text style={styles.fileBtnText}>{i18n.openFile}</Text>
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
                  <View style={[styles.linkRow, isRTL && styles.rowReverse]}>
                    <AppIcon name="truck-outline" size={18} color={Colors.primary} />
                    <View style={styles.linkInfo}>
                      <Text style={[styles.linkMain, isRTL && styles.rtlText]}>{v.plateNumber}</Text>
                      <Text style={[styles.linkSub, isRTL && styles.rtlText]}>{v.make} {v.model} {v.year}</Text>
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
                  <View style={[styles.linkRow, isRTL && styles.rowReverse]}>
                    <AppIcon name="account-outline" size={18} color={Colors.primary} />
                    <Text style={[styles.linkMain, isRTL && styles.rtlText]}>{d.fullName}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.bg},
  loader: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: Colors.bg},
  errorMsg: {...Typography.bodyMd, color: Colors.textMuted, textAlign: 'center'},
  goBackBtn: {paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg},
  goBackText: {color: Colors.primary, fontWeight: '700'},
  header: {backgroundColor: Colors.primary, paddingBottom: 16},
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  headerTitle: {flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center'},
  headerActions: {flexDirection: 'row', gap: 8},
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: {padding: Spacing.md, gap: 12},

  // Identity card
  identityCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  identityIconWrap: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  identityInfo: {flex: 1, gap: 6},
  docTypeName: {fontSize: 18, fontWeight: '700', color: Colors.textPrimary},
  badgeRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  badge: {borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3},
  badgeText: {fontSize: 11, fontWeight: '700'},
  refNumber: {...Typography.caption, color: Colors.textMuted},

  // Dates
  datesRow: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    padding: Spacing.md,
    ...Shadow.sm,
  },
  datePair: {flex: 1},
  dateDivider: {width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.sm},
  dateLabel: {...Typography.caption, color: Colors.textMuted, marginBottom: 4},
  dateValue: {fontSize: 15, fontWeight: '600', color: Colors.textPrimary},

  // Details section
  section: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    gap: 12,
  },
  infoLabel: {fontSize: 13, color: Colors.textMuted, fontWeight: '600', width: 120},
  infoValue: {flex: 1, fontSize: 14, color: Colors.textPrimary},
  rowDivider: {height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.md},
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 4, marginBottom: 2,
  },

  // File button
  fileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg, padding: Spacing.md,
  },
  fileBtnText: {color: Colors.primary, fontWeight: '700', fontSize: 15},

  // Linked items
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  linkInfo: {flex: 1, gap: 2},
  linkMain: {fontSize: 15, fontWeight: '600', color: Colors.textPrimary},
  linkSub: {fontSize: 12, color: Colors.textMuted},
  rowReverse: {flexDirection: 'row-reverse'},
  rtlText: {textAlign: 'right'},
});
