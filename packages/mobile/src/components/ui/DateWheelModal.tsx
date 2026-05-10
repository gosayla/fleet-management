/**
 * DateWheelModal — drum-roll date picker (no external deps)
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  FlatList,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../../lib/theme';

const ITEM_H = 46;
const PAD = 2; // rows visible above/below selection

// ── Wheel column ──────────────────────────────────────────────────────────────
interface WheelProps {
  items: string[];
  initialIndex: number;
  onChange: (idx: number) => void;
  width: number;
  resetKey?: string | number;
}

function Wheel({items, initialIndex, onChange, width, resetKey}: WheelProps) {
  const ref = useRef<FlatList>(null);
  const [sel, setSel] = useState(initialIndex);

  // Scroll to initial position after mount
  useEffect(() => {
    const t = setTimeout(() => {
      const idx = Math.max(0, Math.min(initialIndex, items.length - 1));
      ref.current?.scrollToIndex({index: idx, animated: false});
      setSel(idx);
    }, 60);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      setSel(clamped);
      onChange(clamped);
    },
    [items.length, onChange],
  );

  return (
    <View style={[styles.wheelWrap, {width}]}>
      {/* Selection highlight band */}
      <View pointerEvents="none" style={styles.selBand} />
      <FlatList
        ref={ref}
        data={items}
        keyExtractor={(_, i) => String(i)}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingVertical: ITEM_H * PAD}}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({length: ITEM_H, offset: ITEM_H * index, index})}
        renderItem={({item, index}) => (
          <View style={styles.wheelItem}>
            <Text style={[styles.wheelText, index === sel && styles.wheelTextSel]}>
              {item}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

// ── Month labels ──────────────────────────────────────────────────────────────
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDate(value: string, now: Date): [number, number, number] {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return [y, m, d];
  }
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface DateWheelModalProps {
  visible: boolean;
  value: string; // 'YYYY-MM-DD' or ''
  onConfirm: (date: string) => void;
  onClose: () => void;
  label?: string;
  minYear?: number;
  maxYear?: number;
}

export function DateWheelModal({
  visible,
  value,
  onConfirm,
  onClose,
  label,
  minYear = 2020,
  maxYear = 2035,
}: DateWheelModalProps) {
  const now = new Date();
  const [initY, initM, initD] = parseDate(value, now);

  const [year, setYear]   = useState(initY);
  const [month, setMonth] = useState(initM);
  const [day, setDay]     = useState(initD);

  // Sync state whenever modal opens with a new value
  useEffect(() => {
    if (visible) {
      const [y, m, d] = parseDate(value, now);
      setYear(y);
      setMonth(m);
      setDay(d);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const years  = Array.from({length: maxYear - minYear + 1}, (_, i) => String(minYear + i));
  const months = MONTH_LABELS.map((name, i) => `${pad(i + 1)} ${name}`);
  const numDays = daysInMonth(year, month);
  const days  = Array.from({length: numDays}, (_, i) => pad(i + 1));
  const safeDay = Math.min(day, numDays);

  function handleConfirm() {
    onConfirm(`${year}-${pad(month)}-${pad(safeDay)}`);
  }

  const openKey = visible ? 'open' : 'closed';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerSide}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{label ?? 'Select Date'}</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.headerSide}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Column labels */}
          <View style={styles.colLabels}>
            <Text style={[styles.colLabel, {width: 80}]}>Year</Text>
            <Text style={[styles.colLabel, {width: 110}]}>Month</Text>
            <Text style={[styles.colLabel, {width: 60}]}>Day</Text>
          </View>

          {/* Wheels */}
          <View style={styles.wheelsRow}>
            <Wheel
              resetKey={openKey}
              items={years}
              initialIndex={Math.max(0, year - minYear)}
              onChange={i => setYear(minYear + i)}
              width={80}
            />
            <Wheel
              resetKey={openKey}
              items={months}
              initialIndex={Math.max(0, month - 1)}
              onChange={i => setMonth(i + 1)}
              width={110}
            />
            <Wheel
              key={`day-${numDays}-${openKey}`}
              resetKey={`${numDays}-${openKey}`}
              items={days}
              initialIndex={Math.max(0, safeDay - 1)}
              onChange={i => setDay(i + 1)}
              width={60}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerSide: {minWidth: 64},
  headerTitle: {flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: Colors.textPrimary},
  cancelText: {fontSize: 15, color: Colors.textMuted},
  doneText: {fontSize: 15, fontWeight: '700', color: Colors.primary, textAlign: 'right'},
  colLabels: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 0,
  },
  colLabel: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wheelsRow: {
    flexDirection: 'row',
    height: ITEM_H * (PAD * 2 + 1),
    paddingHorizontal: 8,
  },
  wheelWrap: {overflow: 'hidden', position: 'relative'},
  wheelItem: {height: ITEM_H, justifyContent: 'center', alignItems: 'center'},
  wheelText: {fontSize: 15, color: Colors.textMuted},
  wheelTextSel: {fontSize: 18, fontWeight: '700', color: Colors.textPrimary},
  selBand: {
    position: 'absolute',
    top: ITEM_H * PAD,
    left: 4,
    right: 4,
    height: ITEM_H,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
});
