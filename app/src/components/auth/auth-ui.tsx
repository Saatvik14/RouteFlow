import { Feather } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import { IMAGES, OperationsColors as C } from '../../constants/theme';

type IconName = keyof typeof Feather.glyphMap;

// A softer, more humanist stack than the app's default display font. Each
// platform uses a bundled system face so authentication never waits on a font
// download.
export const AUTH_FONT = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  web: 'Trebuchet MS, Segoe UI, sans-serif',
  default: 'sans-serif',
});

export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { height, width } = useWindowDimensions();
  const compact = width < 480;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View pointerEvents="none" style={styles.background}>
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />
          <View style={styles.routeLine} />
          <View style={styles.routeDot} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.scroll, { minHeight: height }]}
        >
          <View style={[styles.card, wide && styles.cardWide, compact && styles.cardCompact]}>
            <View style={styles.brandRow}>
              <Image source={IMAGES.LOGO} style={styles.logo} />
              <Text style={styles.brand}>Route<Text style={styles.brandAccent}>Floww</Text></Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.heading}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View accessibilityLabel={`Step ${current} of ${total}`} style={styles.steps}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} style={[styles.step, index < current && styles.stepActive]} />
      ))}
    </View>
  );
}

export function AuthField({
  label,
  icon,
  hint,
  trailing,
  error,
  ...props
}: TextInputProps & {
  label: string;
  icon: IconName;
  hint?: string;
  trailing?: ReactNode;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, focused && styles.inputBoxFocused, error && styles.inputBoxError]}>
        <Feather name={icon} size={18} color={focused ? C.primary : C.inkSubtle} />
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          placeholderTextColor={C.inkSubtle}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[styles.input, Platform.OS === 'web' && styles.webInput, props.style]}
        />
        {trailing}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  icon = 'arrow-right',
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed, focused }: any) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'quiet' && styles.buttonQuiet,
        focused && styles.buttonFocused,
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : C.primaryDark} />
      ) : (
        <>
          <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextSecondary]}>{label}</Text>
          <Feather name={icon} size={18} color={variant === 'primary' ? '#FFFFFF' : C.primaryDark} />
        </>
      )}
    </Pressable>
  );
}

export function AuthMessage({ message, tone = 'error' }: { message: string; tone?: 'error' | 'info' | 'success' }) {
  const icon: IconName = tone === 'error' ? 'alert-circle' : tone === 'success' ? 'check-circle' : 'info';
  return (
    <View accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[
      styles.message,
      tone === 'info' && styles.messageInfo,
      tone === 'success' && styles.messageSuccess,
    ]}>
      <Feather name={icon} size={17} color={tone === 'error' ? C.danger : tone === 'success' ? C.success : C.info} />
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={10} onPress={onPress} style={({ pressed }) => pressed && styles.linkPressed}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F8FD' },
  keyboardRoot: { flex: 1 },
  background: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glowTop: { position: 'absolute', width: 420, height: 420, borderRadius: 210, right: -190, top: -210, backgroundColor: '#DCEBFF' },
  glowBottom: { position: 'absolute', width: 360, height: 360, borderRadius: 180, left: -190, bottom: -210, backgroundColor: '#E7F1FF' },
  routeLine: { position: 'absolute', height: 2, width: '75%', left: '-8%', top: '34%', backgroundColor: '#D3E1F2', transform: [{ rotate: '-11deg' }] },
  routeDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, left: '60%', top: '27%', backgroundColor: '#8CB8FF', borderWidth: 3, borderColor: '#F4F8FD' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  card: { width: '100%', maxWidth: 480, borderRadius: 28, padding: 30, backgroundColor: C.surface, borderWidth: 1, borderColor: '#E1E9F3', shadowColor: '#5A7190', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 8 },
  cardWide: { maxWidth: 760 },
  cardCompact: { borderRadius: 24, paddingHorizontal: 22, paddingVertical: 26 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  logo: { width: 42, height: 42, borderRadius: 10, marginRight: 9 },
  brand: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 22, fontWeight: '600', letterSpacing: -0.3 },
  brandAccent: { color: C.primary },
  heading: { marginBottom: 24 },
  eyebrow: { color: C.primaryDark, fontFamily: AUTH_FONT, fontSize: 11, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 8 },
  title: { color: C.ink, fontFamily: AUTH_FONT, fontSize: 26, lineHeight: 33, fontWeight: '600', letterSpacing: -0.35 },
  subtitle: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 14, lineHeight: 21, marginTop: 8 },
  steps: { flexDirection: 'row', gap: 7, marginBottom: 22 },
  step: { flex: 1, height: 4, borderRadius: 999, backgroundColor: '#E4EBF4' },
  stepActive: { backgroundColor: C.primary },
  fieldWrap: { marginBottom: 17 },
  label: { color: '#24334A', fontFamily: AUTH_FONT, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  inputBox: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 15, borderWidth: 1.2, borderColor: '#D5E0EC', backgroundColor: '#FBFDFF', paddingHorizontal: 15 },
  inputBoxFocused: { borderColor: C.primary, backgroundColor: C.surface, shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  inputBoxError: { borderColor: '#E69AA7' },
  input: { flex: 1, minWidth: 0, height: 52, color: C.ink, fontFamily: AUTH_FONT, fontSize: 15, paddingVertical: 0 },
  webInput: { outlineStyle: 'none' } as any,
  hint: { color: C.inkMuted, fontFamily: AUTH_FONT, fontSize: 12, lineHeight: 17, marginTop: 6 },
  fieldError: { color: C.danger, fontFamily: AUTH_FONT, fontSize: 12, lineHeight: 17, marginTop: 6 },
  button: { minHeight: 54, borderRadius: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.primary, borderWidth: 1, borderColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 5 },
  buttonSecondary: { backgroundColor: C.surface, borderColor: '#CAD7E6', shadowOpacity: 0, elevation: 0 },
  buttonQuiet: { minHeight: 44, backgroundColor: 'transparent', borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  buttonFocused: { borderColor: '#0B4EBB', borderWidth: 2 },
  buttonPressed: { transform: [{ translateY: 1 }], opacity: 0.88 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#FFFFFF', fontFamily: AUTH_FONT, fontSize: 14, fontWeight: '600' },
  buttonTextSecondary: { color: C.primaryDark },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 13, padding: 12, backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: '#F2C5CD', marginBottom: 18 },
  messageInfo: { backgroundColor: C.infoSoft, borderColor: '#C3D8F1' },
  messageSuccess: { backgroundColor: C.successSoft, borderColor: '#B8E1D1' },
  messageText: { flex: 1, color: C.ink, fontFamily: AUTH_FONT, fontSize: 13, lineHeight: 19 },
  linkText: { color: C.primaryDark, fontFamily: AUTH_FONT, fontSize: 13, fontWeight: '600' },
  linkPressed: { opacity: 0.65 },
});
