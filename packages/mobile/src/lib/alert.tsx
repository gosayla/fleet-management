import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { isRTL, Locale } from './i18n';
import { Colors, Radius, Shadow, Spacing, Typography } from './theme';

type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
}

export interface AlertOptions {
  cancelable?: boolean;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

type AlertListener = (state: AlertState) => void;
type LocaleListener = (locale: Locale) => void;

let currentListener: AlertListener | null = null;
let currentLocale: Locale = 'ar';
let currentLocaleListener: LocaleListener | null = null;

function emitAlert(state: AlertState) {
  currentListener?.(state);
}

export function setAlertLocale(locale: Locale) {
  currentLocale = locale;
  currentLocaleListener?.(locale);
}

function normalizeButtons(buttons?: AlertButton[]): AlertButton[] {
  if (buttons && buttons.length > 0) {
    return buttons;
  }
  return [{ text: 'OK', style: 'default' }];
}

export const Alert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    emitAlert({
      visible: true,
      title,
      message,
      buttons: normalizeButtons(buttons),
      options,
    });
  },
};

function buttonTextStyle(style?: AlertButtonStyle) {
  if (style === 'destructive') {
    return styles.buttonTextDestructive;
  }
  if (style === 'cancel') {
    return styles.buttonTextCancel;
  }
  return styles.buttonTextDefault;
}

export function AppAlertHost() {
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  const rtl = isRTL(locale);

  useEffect(() => {
    currentListener = setState;
    currentLocaleListener = setLocale;
    return () => {
      if (currentListener === setState) {
        currentListener = null;
      }
      if (currentLocaleListener === setLocale) {
        currentLocaleListener = null;
      }
    };
  }, []);

  const buttons = useMemo(
    () => normalizeButtons(state.buttons),
    [state.buttons]
  );
  const textAlignStyle = rtl ? styles.textLeft : styles.textRight;

  function close(button?: AlertButton) {
    setState((prev) => ({ ...prev, visible: false }));
    button?.onPress?.();
  }

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      onRequestClose={() => {
        if (state.options?.cancelable !== false) {
          const cancelButton =
            buttons.find((button) => button.style === 'cancel') ??
            buttons[buttons.length - 1];
          close(cancelButton);
        }
      }}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (state.options?.cancelable !== false) {
            const cancelButton =
              buttons.find((button) => button.style === 'cancel') ??
              buttons[buttons.length - 1];
            close(cancelButton);
          }
        }}
      >
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, textAlignStyle]}>{state.title}</Text>
            {!!state.message && (
              <Text style={[styles.message, textAlignStyle]}>
                {state.message}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.actions,
              rtl ? styles.actionsRtl : styles.actionsLtr,
            ]}
          >
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={`${button.text ?? 'action'}-${index}`}
                style={[
                  styles.actionButton,
                  button.style === 'destructive' &&
                    styles.actionButtonDestructive,
                  button.style === 'cancel' && styles.actionButtonCancel,
                ]}
                activeOpacity={0.85}
                onPress={() => close(button)}
              >
                <Text
                  style={[styles.buttonText, buttonTextStyle(button.style)]}
                >
                  {button.text ?? 'OK'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.lg,
    ...Shadow.lg,
  },
  header: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  textLeft: {
    textAlign: 'left',
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  textRight: {
    textAlign: 'right',
  },
  actions: {
    gap: Spacing.sm,
  },
  actionsLtr: {
    flexDirection: 'row',
  },
  actionsRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  actionButtonCancel: {
    backgroundColor: Colors.primaryLight,
  },
  actionButtonDestructive: {
    backgroundColor: Colors.dangerLight,
  },
  buttonText: {
    ...Typography.btnSm,
  },
  buttonTextDefault: {
    color: Colors.white,
  },
  buttonTextCancel: {
    color: Colors.primaryDark,
  },
  buttonTextDestructive: {
    color: Colors.danger,
  },
});
