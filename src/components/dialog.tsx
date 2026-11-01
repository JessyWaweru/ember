import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, View, type AlertButton } from 'react-native';

import { C, Radius, Space } from '@/constants/theme';

import { Txt } from './ui';

// React Native's Alert.alert silently does nothing on web, so every alert in the app goes
// through dialog(): native alerts on iOS/Android; a browser alert or an in-app sheet on web.

type Request = { title: string; message?: string; buttons: AlertButton[] };
let show: ((r: Request | null) => void) | null = null;

export function dialog(title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) {
  if (Platform.OS !== 'web') return Alert.alert(title, message, buttons);

  // Plain notices use the browser alert; anything with a choice gets the in-app sheet,
  // so buttons keep their labels ("Skip day", "Delete") instead of a generic OK/Cancel.
  if (buttons.length === 1) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return buttons[0].onPress?.();
  }
  show?.({ title, message, buttons });
}

/** Mount once at the root. Only renders anything on web. */
export function DialogHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    show = setReq;
    return () => {
      show = null;
    };
  }, []);

  if (!req) return null;
  const close = (b?: AlertButton) => {
    setReq(null);
    b?.onPress?.();
  };
  const cancel = req.buttons.find((b) => b.style === 'cancel');

  return (
    <Modal transparent animationType="fade" onRequestClose={() => close(cancel)}>
      <Pressable onPress={() => close(cancel)} style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end', padding: Space.lg }}>
        <Pressable style={{ backgroundColor: C.card, borderRadius: Radius.lg, padding: Space.lg, gap: Space.sm, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <Txt variant="heading" style={{ textAlign: 'center' }}>{req.title}</Txt>
          {req.message ? <Txt color={C.textDim} style={{ textAlign: 'center', marginBottom: Space.sm }}>{req.message}</Txt> : null}
          {req.buttons.map((b) => (
            <Pressable
              key={b.text}
              onPress={() => close(b)}
              style={({ pressed }) => ({ backgroundColor: C.cardHigh, borderRadius: Radius.md, paddingVertical: Space.md, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ alignItems: 'center' }}>
                <Txt
                  style={{ fontWeight: b.style === 'cancel' ? '500' : '700' }}
                  color={b.style === 'destructive' ? C.danger : b.style === 'cancel' ? C.textDim : C.text}>
                  {b.text}
                </Txt>
              </View>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
