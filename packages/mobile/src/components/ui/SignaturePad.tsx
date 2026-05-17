/**
 * SignaturePad — WebView-based handwritten signature capture.
 * Uses an HTML5 canvas injected into a WebView.
 * Parent receives a server fileUrl via onSave after upload.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import WebView from 'react-native-webview';
import { api } from '../../lib/api';
import { Colors } from '../../lib/theme';
import { Locale, t } from '../../lib/i18n';

interface Props {
  label: string;
  locale: Locale;
  rtl?: boolean;
  onSave: (fileUrl: string) => void;
}

// ── HTML canvas injected into WebView ─────────────────────────────────────────

const SIG_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#f9fafb;}
#c{display:block;width:100%;height:160px;background:#fff;touch-action:none;cursor:crosshair;border:1.5px solid #e5e7eb;border-radius:8px;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d'),drawing=false,empty=true;
c.width=1000;c.height=320;
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

export function SignaturePad({ label: _label, locale, rtl, onSave }: Props) {
  const webRef = useRef<WebView>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const i18n = t(locale) as any;

  function sendCmd(cmd: string) {
    webRef.current?.injectJavaScript(`rnCmd('${cmd}'); true;`);
  }

  function handleClear() {
    setSaved(false);
    setErr('');
    sendCmd('CLEAR');
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
      } catch {
        setErr(i18n.signatureUploadFailed ?? 'Upload failed, please retry');
      } finally {
        setSaving(false);
      }
    }
  }

  if (saved) {
    return (
      <View style={styles.savedRow}>
        <Text style={styles.savedText}>
          ✓ {i18n.signatureSaved ?? 'Signature saved'}
        </Text>
        <TouchableOpacity onPress={handleClear} style={styles.changeBtn}>
          <Text style={styles.changeBtnText}>{i18n.changeSig ?? 'Change'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
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
      {!!err && <Text style={styles.errText}>{err}</Text>}
      <View style={[styles.btnRow, rtl && styles.btnRowRtl]}>
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearBtn}
          disabled={saving}
        >
          <Text style={styles.clearBtnText}>
            {i18n.clearSignature ?? 'Clear'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => sendCmd('SAVE')}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {i18n.saveSignature ?? 'Save Signature'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  webview: {
    height: 172,
    borderRadius: 8,
    overflow: 'hidden',
  },
  errText: { fontSize: 12, color: Colors.danger, marginTop: 4 },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnRowRtl: { flexDirection: 'row-reverse' },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' as const },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
