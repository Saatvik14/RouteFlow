import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const theme = useTheme();

  const handleReset = () => {
    if (phone) setSubmitted(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Reset Password</ThemedText>
          <ThemedText themeColor="textSecondary">Enter your phone number to receive a reset code</ThemedText>
        </ThemedView>

        {!submitted ? (
          <ThemedView style={styles.form}>
            <ThemedText type="smallBold">Phone Number</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <ThemedText style={styles.resetButtonText}>Send Reset Code</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView style={styles.form}>
            <ThemedText style={{ textAlign: 'center' }}>Check your phone for a reset code.</ThemedText>
          </ThemedView>
        )}

        <Link href="/login" style={styles.footerLink}>
          <ThemedText type="linkPrimary">Back to Login</ThemedText>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.six,
  },
  form: {
    gap: Spacing.two,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  resetButton: {
    backgroundColor: '#3c87f7',
    height: 50,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  resetButtonText: { color: 'white', fontWeight: 'bold' },
  footerLink: {
    marginTop: Spacing.six,
    textAlign: 'center',
  },
});