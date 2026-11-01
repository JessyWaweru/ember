import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dialog } from '@/components/dialog';
import { Button, Field, Segmented, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || password.length < 6) {
      dialog('Check your details', 'Enter your email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === 'signin' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
    setBusy(false);
    if (error) dialog(mode === 'signin' ? 'Sign in failed' : 'Sign up failed', error.message);
    else if (mode === 'signup' && !data.session) {
      dialog('Confirm your email', 'We sent you a link. Tap it, then come back and sign in.');
      setMode('signin');
    }
    // On success, the auth listener swaps the screen to the app automatically.
  }

  async function forgot() {
    if (!email.trim()) return dialog('Enter your email first');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    dialog(error ? 'Could not send reset email' : 'Check your inbox', error?.message ?? 'We sent a password reset link.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: Space.xl, gap: Space.lg }}>
          <View style={{ gap: Space.xs, marginBottom: Space.xl }}>
            <Txt style={{ fontSize: 56 }}>🔥</Txt>
            <Txt variant="title" style={{ fontSize: 36 }}>Ember</Txt>
            <Txt color={C.textDim}>Calories, training and habits — synced to your account, on every phone.</Txt>
          </View>

          <Segmented
            value={mode}
            onChange={setMode}
            options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]}
          />
          <Field
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            placeholder="Password"
            secureTextEntry
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
          <Button title={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
          {mode === 'signin' ? <Button title="Forgot password?" variant="ghost" onPress={forgot} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
