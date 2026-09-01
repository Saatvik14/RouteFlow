import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../../constants/theme';
import { Sidebar } from '../sidebar';

type IconName = ComponentProps<typeof Feather>['name'];

export function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const normalized = String(status || 'unknown').toLowerCase().replace(/[ -]+/g, '_');
  const meta: Record<string, { label: string; color: string; background: string; icon: IconName }> = {
    draft: { label: 'Draft', color: C.inkMuted, background: '#EDF1F6', icon: 'edit-3' },
    assigned: { label: 'Assigned', color: C.info, background: C.infoSoft, icon: 'user-check' },
    accepted: { label: 'Accepted', color: '#6941C6', background: '#F1ECFE', icon: 'check-circle' },
    in_progress: { label: 'In progress', color: C.primaryDark, background: C.primarySoft, icon: 'navigation' },
    completed: { label: 'Completed', color: C.success, background: C.successSoft, icon: 'check-circle' },
    delivered: { label: 'Delivered', color: C.success, background: C.successSoft, icon: 'package' },
    failed: { label: 'Failed', color: C.danger, background: C.dangerSoft, icon: 'alert-circle' },
    cancelled: { label: 'Cancelled', color: C.inkMuted, background: '#EDF1F6', icon: 'slash' },
    pending: { label: 'Pending', color: C.warning, background: C.warningSoft, icon: 'clock' },
    arrived: { label: 'Arrived', color: C.primaryDark, background: C.primarySoft, icon: 'map-pin' },
    skipped: { label: 'Skipped', color: C.warning, background: C.warningSoft, icon: 'skip-forward' },
    reschedule_required: { label: 'Reschedule', color: C.warning, background: C.warningSoft, icon: 'calendar' },
    active: { label: 'Active', color: C.success, background: C.successSoft, icon: 'check-circle' },
    inactive: { label: 'Inactive', color: C.inkMuted, background: '#EDF1F6', icon: 'pause-circle' },
    expired: { label: 'Expired', color: C.warning, background: C.warningSoft, icon: 'clock' },
    open: { label: 'Open', color: C.success, background: C.successSoft, icon: 'globe' },
    awarded: { label: 'Awarded', color: '#6941C6', background: '#F1ECFE', icon: 'award' },
    withdrawn: { label: 'Withdrawn', color: C.inkMuted, background: '#EDF1F6', icon: 'slash' },
    revoked: { label: 'Revoked', color: C.danger, background: C.dangerSoft, icon: 'x-circle' },
    resent: { label: 'Resent', color: C.info, background: C.infoSoft, icon: 'send' },
  };
  const current = meta[normalized] || { label: normalized.replace(/_/g, ' '), color: C.inkMuted, background: '#EDF1F6', icon: 'circle' as IconName };
  return (
    <View accessible accessibilityLabel={`Status: ${current.label}`} style={[styles.badge, { backgroundColor: current.background }, compact && styles.badgeCompact]}>
      <Feather name={current.icon} size={compact ? 11 : 12} color={current.color} />
      <Text style={[styles.badgeText, { color: current.color }, compact && styles.badgeTextCompact]}>{current.label}</Text>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function ActionButton({ label, onPress, icon, variant = 'primary', disabled, loading, compact, style, accessibilityHint }: ButtonProps) {
  const palette = {
    primary: { background: C.primary, border: C.primary, text: '#FFFFFF' },
    secondary: { background: C.surface, border: C.lineStrong, text: C.ink },
    danger: { background: C.surface, border: '#F1B8C1', text: C.danger },
    quiet: { background: 'transparent', border: 'transparent', text: C.primaryDark },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed, focused }: any) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.background, borderColor: focused ? C.focus : palette.border },
        pressed && !disabled && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.text} /> : icon ? <Feather name={icon} size={compact ? 15 : 17} color={palette.text} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function FormField({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel || label}
        placeholderTextColor={C.inkSubtle}
        style={[styles.input, props.multiline && styles.inputMultiline, error && styles.inputError, props.style]}
      />
      {error ? <Text accessibilityRole="alert" style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function ProgressBar({ completed, total, tone = 'primary' }: { completed: number; total: number; tone?: 'primary' | 'success' | 'danger' }) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;
  const color = tone === 'success' ? C.success : tone === 'danger' ? C.danger : C.primary;
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: completed }} style={styles.progressTrack}>
      <View style={[styles.progressFill, { backgroundColor: color, width: `${percentage}%` }]} />
    </View>
  );
}

export function StatePanel({ icon, title, message, actionLabel, onAction, loading = false }: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.statePanel}>
      <View style={styles.stateIcon}>{loading ? <ActivityIndicator color={C.primary} /> : <Feather name={icon} size={22} color={C.primaryDark} />}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {actionLabel && onAction ? <ActionButton compact variant="secondary" icon="refresh-cw" label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: S.md }}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={[styles.skeleton, { width: `${65 - index * 4}%`, height: 14 }]} />
          <View style={[styles.skeleton, { width: '92%', height: 10 }]} />
          <View style={[styles.skeleton, { width: '48%', height: 10 }]} />
        </View>
      ))}
    </View>
  );
}

export function OperationsShell({ title, subtitle, active: _active, actions, children, scroll = true }: {
  title: string;
  subtitle?: string;
  active: 'dashboard' | 'team' | 'reports' | 'marketplace';
  actions?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const content = (
    <View style={[styles.shellContent, compact && styles.shellContentCompact]}>
      <View style={[styles.workspacePanel, compact && styles.workspacePanelCompact]}>
        <View style={styles.panelHandle} />
        <View style={styles.pageHeader}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={styles.pageTitle}>{title}</Text>
            {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
          </View>
          {actions ? <View style={styles.headerActions}>{actions}</View> : null}
        </View>
        {children}
      </View>
    </View>
  );
  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}> 
      <View style={styles.appBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={22} color={C.ink} />
        </Pressable>
        <Text style={styles.brandText}>Route<Text style={{ color: C.primary }}>Floww</Text></Text>
        <View style={styles.appBarSpacer} />
      </View>
      <View style={styles.shellBody}>
        {scroll ? <ScrollView style={styles.mainScroll} contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom + 24, 32) }}>{content}</ScrollView> : <View style={styles.mainScroll}>{content}</View>}
      </View>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.canvas },
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, paddingHorizontal: S.sm },
  menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill },
  appBarSpacer: { width: 44 },
  appBarDesktop: { height: 68, paddingHorizontal: S.xl },
  brand: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44 },
  brandMark: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary, marginRight: 10 },
  brandText: { flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '600', color: C.ink, letterSpacing: -0.3 },
  shellBody: { flex: 1, flexDirection: 'row' },
  sideNav: { width: 228, backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.line, padding: S.lg, gap: S.xs },
  navSection: { color: C.inkSubtle, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: S.md, marginVertical: S.sm },
  navItem: { minHeight: 46, flexDirection: 'row', gap: S.md, alignItems: 'center', paddingHorizontal: S.md, borderRadius: R.md },
  navItemActive: { backgroundColor: C.primarySoft },
  navText: { fontSize: 14, color: C.inkMuted, fontWeight: '500' },
  navTextActive: { color: C.primaryDark },
  navDivider: { height: 1, backgroundColor: C.line, marginVertical: S.md },
  mobileNav: { gap: S.xs, paddingBottom: S.sm },
  mobileNavItem: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.md, borderRadius: R.pill },
  mobileNavItemActive: { backgroundColor: C.primarySoft },
  mobileNavText: { fontSize: 13, fontWeight: '500', color: C.inkMuted },
  mobileNavTextActive: { color: C.primaryDark },
  mainScroll: { flex: 1 },
  shellContent: { width: '100%', maxWidth: 1440, flexGrow: 1, alignSelf: 'center', padding: S.lg },
  shellContentCompact: { paddingHorizontal: 0, paddingTop: S.sm },
  workspacePanel: { flexGrow: 1, minHeight: 420, backgroundColor: C.surface, borderWidth: 1, borderColor: '#E5EAF1', borderRadius: 28, paddingHorizontal: S.xl, paddingTop: 10, paddingBottom: S.xl, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 },
  workspacePanelCompact: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingHorizontal: S.lg, paddingBottom: S.lg },
  panelHandle: { width: 74, height: 4, borderRadius: R.pill, backgroundColor: '#D8DEE8', alignSelf: 'center', marginBottom: S.lg },
  shellContentDesktop: { padding: S.xxl },
  pageHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.lg, marginBottom: S.xl },
  pageHeaderMobile: { marginBottom: S.lg },
  pageTitle: { color: C.ink, fontSize: 22, lineHeight: 29, fontWeight: '500', letterSpacing: -0.25 },
  pageTitleMobile: { fontSize: 23, lineHeight: 30 },
  pageSubtitle: { color: C.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  badge: { minHeight: 28, paddingHorizontal: 9, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  badgeCompact: { minHeight: 23, paddingHorizontal: 7 },
  badgeText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  badgeTextCompact: { fontSize: 11 },
  button: { minHeight: 46, borderWidth: 1, borderRadius: R.md, paddingHorizontal: S.lg, flexDirection: 'row', gap: S.sm, alignItems: 'center', justifyContent: 'center' },
  buttonCompact: { minHeight: 38, paddingHorizontal: S.md },
  buttonText: { fontSize: 14, fontWeight: '500' },
  buttonTextCompact: { fontSize: 13 },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.5 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: C.ink, fontSize: 13, fontWeight: '500' },
  input: { minHeight: 46, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.md, color: C.ink, fontSize: 15 },
  inputMultiline: { minHeight: 96, paddingTop: S.md, textAlignVertical: 'top' },
  inputError: { borderColor: C.danger },
  fieldError: { color: C.danger, fontSize: 12, lineHeight: 17 },
  fieldHint: { color: C.inkMuted, fontSize: 12, lineHeight: 17 },
  progressTrack: { height: 7, borderRadius: R.pill, backgroundColor: '#E8EDF4', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: R.pill },
  statePanel: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, minHeight: 270, padding: S.xxl, alignItems: 'center', justifyContent: 'center' },
  stateIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: S.md },
  stateTitle: { fontSize: 17, fontWeight: '500', color: C.ink, textAlign: 'center' },
  stateMessage: { maxWidth: 460, color: C.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: S.sm, marginBottom: S.lg },
  skeletonCard: { borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, padding: S.lg, gap: S.md },
  skeleton: { backgroundColor: '#E9EEF5', borderRadius: R.pill },
});

