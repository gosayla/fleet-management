/**
 * TimeWheelModal — drum-roll hour:minute picker
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Colors } from '../../lib/theme';

const ITEM_H = 46;
const PAD = 2;

// ── Wheel column ──────────────────────────────────────────────────────────────
interface WheelProps {
  items: string[];
  initialIndex: number;
  onChange: (idx: number) => void;
  width: number;
  resetKey?: string | number;
}

function Wheel({ items, initialIndex, onChange, width, resetKey }: WheelProps) {
  const ref = useRef<FlatList>(null);
  const [sel, setSel] = useState(initialIndex);

  useEffect(() => {
    const t = setTimeout(() => {
      const idx = Math.max(0, Math.min(initialIndex, items.length - 1));
      ref.current?.scrollToIndex({ index: idx, animated: false });
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
    [items.length, onChange]
  );

  return (
    <View style={[styles.wheelWrap, { width }]}>
      <View pointerEvents="none" style={styles.selBand} />
      <FlatList
        ref={ref}
        data={items}
        keyExtractor={(_, i) => String(i)}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ITEM_H * PAD }}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: ITEM_H,
          offset: ITEM_H * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View style={styles.wheelItem}>
            <Text
              style={[styles.wheelText, index === sel && styles.wheelTextSel]}
            >
              {item}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseTime(value: string): [number, number] {
  if (value && /^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    return [Math.min(h, 23), Math.min(m, 59)];
  }
  return [8, 0];
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface TimeWheelModalProps {
  visible: boolean;
  value: string; // 'HH:MM' or ''
  onConfirm: (time: string) => void;
  onClose: () => void;
  label?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

export function TimeWheelModal({
  visible,
  value,
  onConfirm,
  onClose,
  label,
}: TimeWheelModalProps) {
  const [initH, initM] = parseTime(value);
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);

  useEffect(() => {
    if (visible) {
      const [h, m] = parseTime(value);
      setHour(h);
      setMinute(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const openKey = visible ? 'open' : 'closed';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerSide}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{label ?? 'Select Time'}</Text>
            <TouchableOpacity
              onPress={() => onConfirm(`${pad(hour)}:${pad(minute)}`)}
              style={styles.headerSide}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Column labels */}
          <View style={styles.colLabels}>
            <Text style={[styles.colLabel, styles.hourLabel]}>Hour</Text>
            <Text style={[styles.colLabel, styles.colonLabel]}> </Text>
            <Text style={[styles.colLabel, styles.minuteLabel]}>Minute</Text>
          </View>

          {/* Wheels */}
          <View style={styles.wheelsRow}>
            <Wheel
              resetKey={openKey}
              items={HOURS}
              initialIndex={hour}
              onChange={setHour}
              width={100}
            />
            <View style={styles.colon}>
              <Text style={styles.colonText}>:</Text>
            </View>
            <Wheel
              resetKey={openKey}
              items={MINUTES}
              initialIndex={minute}
              onChange={setMinute}
              width={100}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
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
  headerSide: { minWidth: 64 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cancelText: { fontSize: 15, color: Colors.textMuted },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },
  colLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  hourLabel: { width: 100 },
  colonLabel: { width: 20 },
  minuteLabel: { width: 100 },
  wheelsRow: {
    flexDirection: 'row',
    height: ITEM_H * (PAD * 2 + 1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelWrap: { overflow: 'hidden', position: 'relative' },
  wheelItem: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  wheelText: { fontSize: 18, color: Colors.textMuted },
  wheelTextSel: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
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
  colon: { width: 20, alignItems: 'center', paddingTop: 2 },
  colonText: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
});
