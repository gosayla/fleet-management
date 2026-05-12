import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Locale} from '../../lib/i18n';
import {Colors, Spacing} from '../../lib/theme';

const WHEEL_H = 44;
const VISIBLE = 5;

const MONTH_NAMES: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  hi: ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नवं', 'दिस'],
  bn: ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুল', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
  ur: ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
};

const MONTH_NUMS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const HOURS = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));

function makeDays(month: number, year: number): string[] {
  const count = new Date(year, month, 0).getDate();
  return Array.from({length: count}, (_, i) => String(i + 1).padStart(2, '0'));
}

function makeYears(): string[] {
  const cur = new Date().getFullYear();
  return Array.from({length: 21}, (_, i) => String(cur - 2 + i));
}

interface WheelProps {
  items: string[];
  labels?: string[];
  initialIndex: number;
  onChange: (index: number) => void;
  width?: number;
  resetKey?: string;
}

function Wheel({items, labels, initialIndex, onChange, width, resetKey}: WheelProps) {
  const ref = useRef<ScrollView>(null);
  const idxRef = useRef(initialIndex);

  useEffect(() => {
    setTimeout(() => ref.current?.scrollTo({y: Math.max(0, initialIndex) * WHEEL_H, animated: false}), 80);
  }, [initialIndex, items.length, resetKey]);

  function snap(e: any) {
    const raw = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(Math.round(raw / WHEEL_H), items.length - 1));
    if (idx !== idxRef.current) {
      idxRef.current = idx;
      onChange(idx);
    }
    ref.current?.scrollTo({y: idx * WHEEL_H, animated: true});
  }

  return (
    <View style={[styles.col, width != null && {width, flex: 0}]}>
      <View style={styles.highlight} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_H}
        decelerationRate="fast"
        contentContainerStyle={{paddingVertical: WHEEL_H * Math.floor(VISIBLE / 2)}}
        onMomentumScrollEnd={snap}
        onScrollEndDrag={snap}
        style={{height: WHEEL_H * VISIBLE}}>
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemText}>{labels ? labels[i] : item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export interface DateTimeWheelModalProps {
  visible: boolean;
  value: string;
  label: string;
  confirmLabel: string;
  cancelLabel: string;
  locale: Locale;
  onConfirm: (val: string) => void;
  onClose: () => void;
}

export function DateTimeWheelModal({
  visible,
  value,
  label,
  confirmLabel,
  cancelLabel,
  locale,
  onConfirm,
  onClose,
}: DateTimeWheelModalProps) {
  const years = useMemo(() => makeYears(), []);
  const today = new Date();
  const isRTL = locale === 'ar' || locale === 'ur';
  const monthLabels = MONTH_NAMES[locale] ?? MONTH_NAMES.en;

  function parseVal(v: string): {d: number; mo: number; y: number; h: number; mi: number} {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
    if (m) return {y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) - 1, h: Number(m[4] ?? 8), mi: Number(m[5] ?? 0)};
    return {y: today.getFullYear(), mo: today.getMonth(), d: today.getDate() - 1, h: 8, mi: 0};
  }

  const [selDay, setSelDay] = useState(0);
  const [selMon, setSelMon] = useState(0);
  const [selYear, setSelYear] = useState(0);
  const [selHour, setSelHour] = useState(8);
  const [selMin, setSelMin] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const p = parseVal(value);
    const yi = Math.max(0, years.indexOf(String(p.y)));
    setSelDay(p.d);
    setSelMon(p.mo);
    setSelYear(yi);
    setSelHour(p.h);
    setSelMin(p.mi);
  }, [visible, value, years]);

  const days = useMemo(
    () => makeDays(selMon + 1, Number(years[selYear] ?? today.getFullYear())),
    [selMon, selYear, years, today],
  );

  useEffect(() => {
    if (selDay >= days.length) setSelDay(days.length - 1);
  }, [days.length, selDay]);

  function handleConfirm() {
    const y = years[selYear] ?? String(today.getFullYear());
    const mo = String(selMon + 1).padStart(2, '0');
    const d = String(selDay + 1).padStart(2, '0');
    const h = String(selHour).padStart(2, '0');
    const mi = String(selMin).padStart(2, '0');
    onConfirm(`${y}-${mo}-${d} ${h}:${mi}`);
    onClose();
  }

  const wheelResetKey = `${visible}-${value}-${label}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={[styles.header, isRTL && {flexDirection: 'row-reverse'}]}>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.cancelTxt}>{cancelLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.titleTxt}>{label}</Text>
          <TouchableOpacity onPress={handleConfirm} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.confirmTxt}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.wheels, isRTL && {flexDirection: 'row-reverse'}]}>
          <Wheel key={`d-${wheelResetKey}`} resetKey={wheelResetKey} items={days} initialIndex={selDay} onChange={setSelDay} width={48} />
          <Text style={styles.sep}>/</Text>
          <Wheel key={`mo-${wheelResetKey}`} resetKey={wheelResetKey} items={MONTH_NUMS} labels={monthLabels} initialIndex={selMon} onChange={setSelMon} width={52} />
          <Text style={styles.sep}>/</Text>
          <Wheel key={`y-${wheelResetKey}`} resetKey={wheelResetKey} items={years} initialIndex={selYear} onChange={setSelYear} width={66} />
          <View style={styles.timeSep} />
          <Wheel key={`h-${wheelResetKey}`} resetKey={wheelResetKey} items={HOURS} initialIndex={selHour} onChange={setSelHour} width={48} />
          <Text style={styles.sep}>:</Text>
          <Wheel key={`mi-${wheelResetKey}`} resetKey={wheelResetKey} items={MINUTES} initialIndex={selMin} onChange={setSelMin} width={48} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  titleTxt: {fontSize: 16, fontWeight: '700', color: Colors.textPrimary},
  cancelTxt: {fontSize: 15, color: Colors.textMuted, minWidth: 52},
  confirmTxt: {fontSize: 15, color: Colors.primary, fontWeight: '700', minWidth: 52, textAlign: 'right'},
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  col: {flex: 1, position: 'relative'},
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_H * Math.floor(VISIBLE / 2),
    height: WHEEL_H,
    backgroundColor: Colors.primary + '18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  item: {height: WHEEL_H, justifyContent: 'center', alignItems: 'center'},
  itemText: {fontSize: 17, color: Colors.textPrimary, fontWeight: '500'},
  sep: {fontSize: 20, color: Colors.textMuted, paddingHorizontal: 2, marginTop: -4},
  timeSep: {width: 1, height: WHEEL_H * 3, backgroundColor: Colors.borderLight, marginHorizontal: 8},
});
