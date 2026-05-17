/**
 * SignaturePad — WebView-based handwritten signature capture.
 * Opens a full-screen modal so scroll conflicts are avoided on the drawing canvas.
 * Parent receives a server fileUrl via onSave after upload.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import WebView from 'react-native-webview';
import { api } from '../../lib/api';
import { Colors } from '../../lib/theme';
import { Locale, t } from '../../lib/i18n';
import { AppIcon } from './AppIcon';

interface Props {
  label: string;
  locale: Locale;
  rtl?: boolean;
  onSave: (fileUrl: string) => void;
}

const SB_H = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

// ── HTML canvas injected into WebView ─────────────────────────────────────────

const SIG_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#f9fafb;}
#c{display:block;width:100%;height:100vh;background:#fff;touch-action:none;cursor:crosshair;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),drawing=false,empty=true;
c.width=1000;c.height=Math.round(1000*(window.innerHeight/window.innerWidth));
function getPos(e){
  var r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e;
  return{x:(s.clientX-r.left)*(c.width/r.width),y:(s.clientY-r.top)*(c.height/r.height)};
}
function onStart(e){e.preventDefault();drawing=true;var p=getPos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);}
function onMove(e){if(!drawing)return;e.preventDefault();var p=getPos(e);ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';ctx.lineTo(p.x,p.y);ctx.stroke();empty=false;}
function onEnd(){drawing=false;}
c.addEventListener('touchstart',onStart,{passive:false});
c.addEventListener('touchmove',onMove,{passive:false});
c.addEventListener('touchend',onEnd);
c.addEventListener('mousedown',onStart);
c.addEventListener('mousemove',onMove);
c.addEventListener('mouseup',onEnd);
function rnCmd(cmd){
  if(cmd==='CLEAR'){ctx.clearRect(0,0,c.width,c.height);empty=true;window.ReactNativeWebView.postMessage(JSON.stringify({type:'cleared'}));}
  else if(cmd==='SAVE'){
    if(empty){window.ReactNativeWebView.postMessage(JSON.stringify({type:'empty'}));}
    else{window.ReactNativeWebView.postMessage(JSON.stringify({type:'data',base64:c.toDataURL('image/png')}));}
  }
}
document.addEventListener('message',function(e){rnCmd(e.data);});
window.addEventListener('message',function(e){rnCmd(e.data);});
</script>
</body>
</html>`;

// ── Component ─────────────────────────────────────────────────────────────────

export function SignaturePad({ label, locale, rtl, onSave }: Props) {
  const webRef = useRef<WebView>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const i18n = t(locale) as any;

  function sendCmd(cmd: string) {
    webRef.current?.injectJavaScript(`rnCmd('${cmd}'); true;`);
  }

  function handleClear() {
    setErr('');
    sendCmd('CLEAR');
  }

  function handleCancel() {
    setErr('');
    setModalOpen(false);
  }

  async function handleMessage(event: { nativeEvent: { data: string } }) {
    const msg = JSON.parse(event.nativeEvent.data) as {
      type: string;
      base64?: string;
    };

    if (msg.type === 'empty') {
      setErr(i18n.signatureEmptyError ?? 'Draw a signature first');
      return;
    }
    if (msg.type === 'data' && msg.base64) {
      setSaving(true);
      setErr('');
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: msg.base64,
          type: 'image/png',
          name: 'signature.png',
        } as any);
        const res: any = await api.upload('/documents/files', formData);
        onSave(res.fileUrl);
        setSaved(true);
        setModalOpen(false);
      } catch {
        setErr(i18n.signatureUploadFailed ?? 'Upload failed, please retry');
      } finally {
        setSaving(false);
      }
    }
  }

  // ── Saved state (shown inline in form) ───────────────────────────────────────
  if (saved) {
    return (
      <View style={styles.savedRow}>
        <Text style={styles.savedText}>
          ✓ {i18n.signatureSaved ?? 'Signature saved'}
        </Text>
        <TouchableOpacity
          onPress={() => { setSaved(false); setModalOpen(true); }}
          style={styles.changeBtn}
        >
          <Text style={styles.changeBtnText}>{i18n.changeSig ?? 'Change'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Tap-to-sign area (shown inline in form) ───────────────────────────────────
  return (
    <>
      <TouchableOpacity
        style={styles.tapArea}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.7}
      >
        <AppIcon name="draw" size={22} color={Colors.textMuted} />
        <Text style={styles.tapText}>
          {rtl ? 'اضغط للتوقيع' : 'Tap to sign'}
        </Text>
      </TouchableOpacity>

      {/* Full-screen signature modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleCancel}
      >
        <View style={styles.modalRoot}>
          {/* Modal header */}
          <View style={[styles.modalHeader, { flexDirection: rtl ? 'row' : 'row-reverse' }]}>
            <TouchableOpacity style={styles.modalClose} onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <AppIcon name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Canvas */}
          <View style={styles.canvasWrap}>
            <WebView
              ref={webRef}
              source={{ html: SIG_HTML }}
              style={styles.webview}
              onMessage={handleMessage}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              originWhitelist={['*']}
              javaScriptEnabled
            />
          </View>

          {/* Error */}
          {!!err && (
            <Text style={styles.errText}>{err}</Text>
          )}

          {/* Buttons */}
          <View style={[styles.btnRow, rtl ? null : styles.btnRowRtl]}>
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} disabled={saving}>
              <Text style={styles.clearBtnText}>{i18n.clearSignature ?? 'مسح'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => sendCmd('SAVE')}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{i18n.saveSignature ?? 'حفظ التوقيع'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Tap-to-sign area shown in form
  tapArea: {
    height: 80,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fafafa',
  },
  tapText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },

  // Full-screen modal
  modalRoot: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    paddingTop: SB_H + 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalClose: { width: 40, alignItems: 'center' },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  canvasWrap: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  webview: { flex: 1 },

  errText: {
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  btnRowRtl: { flexDirection: 'row-reverse' },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' as const },

  // Saved confirmation (shown in form after signing)
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.successLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  savedText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600' as const,
  },
  changeBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeBtnText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600' as const,
  },
});
