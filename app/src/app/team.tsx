import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  ActionButton,
  FormField,
  OperationsShell,
  SkeletonRows,
  StatePanel,
  StatusBadge,
} from '../components/operations/operations-ui';
import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../constants/theme';
import {
  DriverPermissions,
  DriverProfile,
  Invitation,
  OrganizationRole,
  TeamMember,
  enterpriseService,
} from '../services/api/enterprise';

const roles: Array<{ value: OrganizationRole; label: string; detail: string }> = [
  { value: 'driver', label: 'Driver', detail: 'Receives and executes assigned routes' },
  { value: 'dispatcher', label: 'Dispatcher', detail: 'Plans, assigns and monitors routes' },
  { value: 'viewer', label: 'View only', detail: 'Can view operations and reports' },
  { value: 'admin', label: 'Administrator', detail: 'Manages team and delivery operations' },
];

const permissionLabels: Array<{ key: keyof DriverPermissions; label: string; detail: string }> = [
  { key: 'reorderStops', label: 'Reorder stops', detail: 'Change the sequence before or during an assigned route' },
  { key: 'skipStops', label: 'Skip a stop', detail: 'Resolve a stop as skipped without dispatcher approval' },
  { key: 'addStops', label: 'Add stops', detail: 'Add a new stop to an assigned route' },
  { key: 'editStopDetails', label: 'Edit stop information', detail: 'Edit customer details before the route starts' },
  { key: 'requestRouteChange', label: 'Request route changes', detail: 'Send a change request to dispatch' },
];

const roleLabel = (role: OrganizationRole) => ({
  owner: 'Business owner',
  admin: 'Administrator',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  viewer: 'View only',
}[role]);

export default function TeamScreen() {
  const { width } = useWindowDimensions();
  const narrow = width < 720;
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ type: 'revoke'; invitation: Invitation } | { type: 'active' | 'remove'; driver: DriverProfile } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [fleetCredential, setFleetCredential] = useState<{ name: string; identifier: string; accessCode: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [team, invites] = await Promise.all([enterpriseService.getTeam(), enterpriseService.getInvitations()]);
    if (!team.success || !team.data) setError(team.error || 'Team data could not be loaded.');
    else {
      setDrivers(team.data.drivers || []);
      setMembers(team.data.members || []);
    }
    if (invites.success && invites.data) setInvitations(invites.data.invitations || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleDrivers = useMemo(() => drivers.filter((driver) => {
    const matchesSearch = !search.trim() || [driver.name, driver.email, driver.phone].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = status === 'all' || (status === 'active' ? driver.active : !driver.active);
    return matchesSearch && matchesStatus;
  }), [drivers, search, status]);
  const pending = invitations.filter((invitation) => ['pending', 'expired'].includes(invitation.status));

  const openDriver = async (driver: DriverProfile) => {
    setSelectedDriver(driver);
    setHistory([]);
    setHistoryLoading(true);
    const response = await enterpriseService.getDriverHistory(driver.driverId);
    if (response.success) setHistory(response.data?.routes || []);
    setHistoryLoading(false);
  };

  const updateDriver = async (driver: DriverProfile, patch: Parameters<typeof enterpriseService.updateDriver>[1]) => {
    setBusyId(driver.driverId);
    const response = await enterpriseService.updateDriver(driver.driverId, patch);
    setBusyId(null);
    if (!response.success || !response.data?.driver) {
      setNotice(response.error || 'The driver could not be updated.');
      return false;
    }
    setDrivers((items) => items.map((item) => item.driverId === driver.driverId ? response.data!.driver : item));
    setSelectedDriver((current) => current?.driverId === driver.driverId ? response.data!.driver : current);
    setNotice('Driver settings saved.');
    return true;
  };

  const performConfirmation = async () => {
    if (!confirm) return;
    if (confirm.type === 'revoke') {
      setBusyId(confirm.invitation.invitationId);
      const response = await enterpriseService.revokeInvitation(confirm.invitation.invitationId);
      setBusyId(null);
      setConfirm(null);
      if (!response.success) setNotice(response.error || 'Invitation could not be revoked.');
      else { setNotice('Invitation revoked.'); await load(); }
      return;
    }
    const driver = confirm.driver;
    if (confirm.type === 'active') {
      const okay = await updateDriver(driver, { active: !driver.active });
      if (okay) setConfirm(null);
      return;
    }
    setBusyId(driver.driverId);
    const response = await enterpriseService.removeDriver(driver.driverId);
    setBusyId(null);
    if (!response.success) setNotice(response.error || 'Driver could not be removed.');
    else {
      setConfirm(null);
      setSelectedDriver(null);
      setNotice('Driver removed. Route history and delivery proofs were preserved.');
      await load();
    }
  };

  return (
    <OperationsShell
      active="team"
      title="Team"
      subtitle="Create fleet-driver access, invite business teammates and manage assignments."
      actions={<ActionButton compact icon="user-plus" label="Add team member" onPress={() => setInviteOpen(true)} />}
    >
      {notice ? (
        <View accessibilityRole="alert" style={[styles.notice, /could not|before|unable/i.test(notice) && styles.noticeError]}>
          <Feather name={/could not|before|unable/i.test(notice) ? 'alert-circle' : 'check-circle'} size={17} color={/could not|before|unable/i.test(notice) ? C.danger : C.success} />
          <Text style={styles.noticeText}>{notice}</Text>
          <Pressable accessibilityLabel="Dismiss message" onPress={() => setNotice('')}><Feather name="x" size={18} color={C.inkMuted} /></Pressable>
        </View>
      ) : null}

      {loading ? <SkeletonRows count={5} /> : error ? (
        <StatePanel icon="users" title="Team data is unavailable" message={error} actionLabel="Try again" onAction={load} />
      ) : (
        <>
          {pending.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Pending invitations</Text><Text style={styles.sectionHint}>People appear as active team members after accepting.</Text></View><View style={styles.countPill}><Text style={styles.countText}>{pending.length}</Text></View></View>
              <ScrollView horizontal={narrow} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.invitationList}>
                {pending.map((invitation) => (
                  <View key={invitation.invitationId} style={[styles.invitationCard, narrow && styles.invitationCardNarrow]}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{invitation.name.slice(0, 1).toUpperCase()}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.nameRow}><Text numberOfLines={1} style={styles.personName}>{invitation.name}</Text><StatusBadge compact status={invitation.status} /></View>
                      <Text numberOfLines={1} style={styles.personMeta}>{invitation.email}</Text>
                      <Text style={styles.expires}>Expires {new Date(invitation.expiresAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={styles.rowActions}>
                      <ActionButton compact variant="quiet" loading={busyId === invitation.invitationId} label="Resend" icon="send" onPress={async () => {
                        setBusyId(invitation.invitationId);
                        const response = await enterpriseService.resendInvitation(invitation.invitationId);
                        setBusyId(null);
                        setNotice(response.success
                          ? response.message || 'A new invitation link was sent.'
                          : response.error || 'Invitation could not be resent.');
                        if (response.success) load();
                      }} />
                      <ActionButton compact variant="quiet" label="Revoke" icon="x-circle" onPress={() => setConfirm({ type: 'revoke', invitation })} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {members.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Business access</Text>
                  <Text style={styles.sectionHint}>Owners, administrators, dispatchers and view-only users.</Text>
                </View>
                <View style={styles.countPill}><Text style={styles.countText}>{members.length}</Text></View>
              </View>
              <View style={styles.driverList}>
                {members.map((member) => (
                  <View key={member.membershipId} style={styles.driverRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text></View>
                    <View style={styles.driverIdentity}>
                      <View style={styles.nameRow}>
                        <Text numberOfLines={1} style={styles.personName}>{member.name}</Text>
                        <StatusBadge compact status={member.status} />
                      </View>
                      <Text numberOfLines={1} style={styles.personMeta}>{member.email}{member.phone ? ` · ${member.phone}` : ''}</Text>
                    </View>
                    <View style={styles.assignment}>
                      <Text style={styles.cellLabel}>Role</Text>
                      <Text style={styles.cellValue}>{roleLabel(member.role)}</Text>
                    </View>
                    <View style={styles.historyCount}>
                      <Text style={styles.cellLabel}>Joined</Text>
                      <Text style={styles.cellValue}>{new Date(member.joinedAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Drivers</Text><Text style={styles.sectionHint}>{drivers.filter((driver) => driver.active).length} active · {drivers.filter((driver) => !driver.active).length} inactive</Text></View></View>
            <View style={styles.toolbar}>
              <View style={[styles.search, narrow && { width: '100%' }]}><Feather name="search" size={17} color={C.inkSubtle} /><TextInput accessibilityLabel="Search team" value={search} onChangeText={setSearch} placeholder="Search name, email or phone" placeholderTextColor={C.inkSubtle} style={styles.searchInput} /></View>
              <View accessibilityRole="tablist" style={styles.segmented}>{(['all', 'active', 'inactive'] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: status === item }} onPress={() => setStatus(item)} style={[styles.segment, status === item && styles.segmentActive]}><Text style={[styles.segmentText, status === item && styles.segmentTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}</View>
            </View>

            {visibleDrivers.length === 0 ? (
              <StatePanel icon="user-plus" title={drivers.length ? 'No drivers match' : 'Create your first fleet driver'} message={drivers.length ? 'Clear the search or choose another status.' : 'Create the driver account here, then share its private access code securely.'} actionLabel={drivers.length ? 'Clear filters' : 'Create driver'} onAction={() => drivers.length ? (setSearch(''), setStatus('all')) : setInviteOpen(true)} />
            ) : (
              <View style={styles.driverList}>
                {visibleDrivers.map((driver) => (
                  <Pressable key={driver.driverId} accessibilityRole="button" accessibilityLabel={`Open ${driver.name}`} onPress={() => openDriver(driver)} style={({ pressed, focused }: any) => [styles.driverRow, focused && { borderColor: C.focus, borderWidth: 2 }, pressed && { opacity: 0.86 }]}>
                    <View style={[styles.avatar, !driver.active && styles.avatarInactive]}><Text style={[styles.avatarText, !driver.active && { color: C.inkMuted }]}>{driver.name.slice(0, 1).toUpperCase()}</Text></View>
                    <View style={styles.driverIdentity}><View style={styles.nameRow}><Text numberOfLines={1} style={styles.personName}>{driver.name}</Text><StatusBadge compact status={driver.active ? 'active' : 'inactive'} /></View><Text numberOfLines={1} style={styles.personMeta}>{driver.email}{driver.phone ? ` · ${driver.phone}` : ''}</Text></View>
                    <View style={styles.assignment}><Text style={styles.cellLabel}>Current assignment</Text><Text numberOfLines={1} style={[styles.cellValue, !driver.currentAssignment && { color: C.inkMuted }]}>{driver.currentAssignment?.name || 'Available'}</Text></View>
                    <View style={styles.historyCount}><Text style={styles.cellLabel}>Route history</Text><Text style={styles.cellValue}>{driver.routeHistoryCount} routes</Text></View>
                    <Feather name="chevron-right" size={19} color={C.inkSubtle} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      <InviteModal visible={inviteOpen} onClose={() => setInviteOpen(false)} onSent={async (message, credential) => { setInviteOpen(false); setNotice(message); if (credential) setFleetCredential(credential); await load(); }} />

      <Modal visible={Boolean(selectedDriver)} transparent animationType="fade" onRequestClose={() => setSelectedDriver(null)}>
        <View style={styles.modalOverlay}>
          <Pressable accessibilityLabel="Close driver details" onPress={() => setSelectedDriver(null)} style={StyleSheet.absoluteFill} />
          {selectedDriver ? (
            <View accessibilityViewIsModal style={styles.detailPanel}>
              <View style={styles.modalHeader}><View style={{ flex: 1 }}><Text style={styles.modalTitle}>{selectedDriver.name}</Text><Text style={styles.modalSubtitle}>{selectedDriver.email}</Text></View><Pressable accessibilityLabel="Close" onPress={() => setSelectedDriver(null)} style={styles.close}><Feather name="x" size={21} color={C.inkMuted} /></Pressable></View>
              <ScrollView contentContainerStyle={{ gap: S.xl, paddingBottom: S.xl }}>
                <View style={styles.detailSummary}><StatusBadge status={selectedDriver.active ? 'active' : 'inactive'} /><Text style={styles.detailSummaryText}>{selectedDriver.currentAssignment ? `Assigned to ${selectedDriver.currentAssignment.name}` : 'No active assignment'}</Text></View>
                <AssignmentProfileEditor
                  driver={selectedDriver}
                  busy={busyId === selectedDriver.driverId}
                  onSave={(assignmentProfile) => updateDriver(selectedDriver, { assignmentProfile })}
                />
                <View><Text style={styles.detailSectionTitle}>Driver permissions</Text><Text style={styles.detailSectionHint}>Permissions are enforced by the server for every assigned route.</Text><View style={styles.permissionList}>{permissionLabels.map((permission) => <View key={permission.key} style={styles.permissionRow}><View style={{ flex: 1 }}><Text style={styles.permissionLabel}>{permission.label}</Text><Text style={styles.permissionDetail}>{permission.detail}</Text></View><Switch accessibilityLabel={permission.label} value={selectedDriver.permissions[permission.key]} disabled={busyId === selectedDriver.driverId || !selectedDriver.active} onValueChange={(value) => { void updateDriver(selectedDriver, { permissions: { [permission.key]: value } }); }} trackColor={{ false: '#CCD5E2', true: '#AFCBFF' }} thumbColor={selectedDriver.permissions[permission.key] ? C.primary : '#FFFFFF'} /></View>)}</View></View>
                <View><Text style={styles.detailSectionTitle}>Recent route history</Text>{historyLoading ? <SkeletonRows count={2} /> : history.length ? <View style={styles.historyList}>{history.slice(0, 8).map((route) => <View key={route.route_id} style={styles.historyRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.historyName}>{route.name}</Text><Text style={styles.historyMeta}>{new Date(route.start_datetime).toLocaleDateString()} · {route.total_stops} stops</Text></View><StatusBadge compact status={route.status} /></View>)}</View> : <Text style={styles.detailSectionHint}>Completed and cancelled routes will appear here.</Text>}</View>
                <View style={styles.destructiveActions}><ActionButton variant="secondary" icon="key" label="Reset access code" disabled={!selectedDriver.active} loading={busyId === selectedDriver.driverId} onPress={async () => { setBusyId(selectedDriver.driverId); const response = await enterpriseService.resetFleetDriverAccessCode(selectedDriver.driverId); setBusyId(null); if (!response.success || !response.data?.accessCode) setNotice(response.error || 'Access code could not be reset.'); else setFleetCredential({ name: selectedDriver.name, identifier: selectedDriver.email || selectedDriver.phone || 'the driver identifier', accessCode: response.data.accessCode }); }} /><ActionButton variant="secondary" icon={selectedDriver.active ? 'pause-circle' : 'play-circle'} label={selectedDriver.active ? 'Deactivate driver' : 'Activate driver'} onPress={() => setConfirm({ type: 'active', driver: selectedDriver })} /><ActionButton variant="danger" icon="user-minus" label="Remove from team" onPress={() => setConfirm({ type: 'remove', driver: selectedDriver })} /></View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <ConfirmationModal confirm={confirm} busy={busyId !== null} onCancel={() => setConfirm(null)} onConfirm={performConfirmation} />
      <AccessCodeModal credential={fleetCredential} onClose={() => setFleetCredential(null)} />
    </OperationsShell>
  );
}

function AssignmentProfileEditor({ driver, busy, onSave }: {
  driver: DriverProfile;
  busy: boolean;
  onSave: (profile: Partial<DriverProfile['assignmentProfile']>) => Promise<boolean>;
}) {
  const [skills, setSkills] = useState(driver.assignmentProfile.skills.join(', '));
  const [licenses, setLicenses] = useState(driver.assignmentProfile.licenseCategories.join(', '));
  const [maxHours, setMaxHours] = useState(String(driver.assignmentProfile.maxHoursPerDay));
  const [error, setError] = useState('');

  useEffect(() => {
    setSkills(driver.assignmentProfile.skills.join(', '));
    setLicenses(driver.assignmentProfile.licenseCategories.join(', '));
    setMaxHours(String(driver.assignmentProfile.maxHoursPerDay));
    setError('');
  }, [driver.assignmentProfile, driver.driverId]);

  const values = (input: string) => [...new Set(input.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean))];
  const save = async () => {
    const parsedHours = Number(maxHours);
    if (!Number.isFinite(parsedHours) || parsedHours < 1 || parsedHours > 24) {
      setError('Daily hours must be between 1 and 24.');
      return;
    }
    setError('');
    await onSave({
      skills: values(skills),
      licenseCategories: values(licenses),
      maxHoursPerDay: parsedHours,
    });
  };

  return (
    <View>
      <Text style={styles.detailSectionTitle}>Assignment profile</Text>
      <Text style={styles.detailSectionHint}>Gemini criteria and the assignment engine use these qualifications and limits.</Text>
      <View style={styles.profileFields}>
        <FormField label="Skills" value={skills} onChangeText={setSkills} placeholder="refrigerated, fragile goods" hint="Separate multiple skills with commas." />
        <FormField label="Licence categories" value={licenses} onChangeText={setLicenses} autoCapitalize="characters" placeholder="b, c, c+e" hint="Use the categories recorded on the driver’s licence." />
        <FormField label="Maximum driving hours per day" value={maxHours} onChangeText={setMaxHours} keyboardType="decimal-pad" placeholder="10" error={error || undefined} />
        <ActionButton compact variant="secondary" icon="save" label="Save assignment profile" loading={busy} onPress={save} style={{ alignSelf: 'flex-start' }} />
      </View>
    </View>
  );
}

function InviteModal({ visible, onClose, onSent }: {
  visible: boolean;
  onClose: () => void;
  onSent: (message: string, credential?: { name: string; identifier: string; accessCode: string }) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<OrganizationRole>('driver');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const submit = async () => {
    if (name.trim().length < 2) return setError('Enter the team member’s full name.');
    if (role === 'driver' && !email.trim() && !phone.trim()) return setError('Enter an email address or phone number for the driver.');
    if (email.trim() && !validEmail) return setError('Enter a valid email address.');
    if (role !== 'driver' && !validEmail) return setError('Enter a valid email address.');
    setSubmitting(true); setError('');
    if (role === 'driver') {
      const response = await enterpriseService.createFleetDriver({
        name: name.trim(),
        email: email.trim().toLowerCase() || undefined,
        phone: phone.trim() || undefined,
      });
      setSubmitting(false);
      if (!response.success || !response.data?.accessCode) return setError(response.error || 'The fleet driver could not be created.');
      const credential = {
        name: name.trim(),
        identifier: email.trim().toLowerCase() || phone.trim(),
        accessCode: response.data.accessCode,
      };
      setName(''); setEmail(''); setPhone(''); setRole('driver');
      onSent(response.message || 'Fleet driver created.', credential);
      return;
    }

    const response = await enterpriseService.invite({ name: name.trim(), email: email.trim().toLowerCase(), role });
    setSubmitting(false);
    if (!response.success) return setError(response.error || 'The invitation could not be sent.');
    setName(''); setEmail(''); setPhone(''); setRole('driver');
    onSent(response.message || `Invitation sent to ${email.trim().toLowerCase()}.`);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.inviteModal}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{role === 'driver' ? 'Create fleet driver' : 'Invite business teammate'}</Text>
              <Text style={styles.modalSubtitle}>{role === 'driver' ? 'We’ll create their account and show you a private access code.' : 'They’ll create a password from a secure invitation link.'}</Text>
            </View>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}><Feather name="x" size={21} color={C.inkMuted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: S.lg }} keyboardShouldPersistTaps="handled">
            <View><Text style={styles.permissionLabel}>Account type</Text><View style={styles.roleList}>{roles.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: role === item.value }} onPress={() => { setRole(item.value); setError(''); }} style={[styles.roleChoice, role === item.value && styles.roleChoiceSelected]}><View style={{ flex: 1 }}><Text style={styles.roleLabel}>{item.label}</Text><Text style={styles.roleDetail}>{item.detail}</Text></View>{role === item.value ? <Feather name="check-circle" size={19} color={C.primaryDark} /> : null}</Pressable>)}</View></View>
            <FormField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="e.g. Aisha Khan" />
            <FormField label={role === 'driver' ? 'Email (email or phone required)' : 'Email'} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="aisha@company.com" error={email.length > 3 && !validEmail ? 'Enter a valid email address.' : undefined} />
            {role === 'driver' ? <FormField label="Phone (email or phone required)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Driver’s mobile number" hint="This can be used to sign in instead of email." /> : null}
            {error ? <Text accessibilityRole="alert" style={styles.formError}>{error}</Text> : null}
            <View style={styles.modalActions}><ActionButton variant="secondary" label="Cancel" onPress={onClose} /><ActionButton icon={role === 'driver' ? 'key' : 'send'} label={role === 'driver' ? 'Create driver' : 'Send invitation'} loading={submitting} onPress={submit} /></View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AccessCodeModal({ credential, onClose }: {
  credential: { name: string; identifier: string; accessCode: string } | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={Boolean(credential)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {credential ? <View accessibilityViewIsModal style={styles.accessCodeCard}>
          <View style={styles.accessCodeIcon}><Feather name="key" size={25} color={C.primaryDark} /></View>
          <Text style={styles.accessCodeTitle}>Access code for {credential.name}</Text>
          <Text style={styles.accessCodeMessage}>Share this code securely. For safety, it is shown only now; you can reset it from the driver profile if needed.</Text>
          <View style={styles.credentialBlock}>
            <Text style={styles.credentialLabel}>Sign-in ID</Text>
            <Text selectable style={styles.credentialIdentifier}>{credential.identifier}</Text>
            <View style={styles.credentialDivider} />
            <Text style={styles.credentialLabel}>Access code</Text>
            <Text selectable style={styles.accessCodeValue}>{credential.accessCode}</Text>
          </View>
          <View style={styles.accessCodeWarning}><Feather name="shield" size={16} color={C.warning} /><Text style={styles.accessCodeWarningText}>Anyone with this code and sign-in ID can access the driver account.</Text></View>
          <ActionButton icon="check" label="I’ve saved the code" onPress={onClose} />
        </View> : null}
      </View>
    </Modal>
  );
}

function ConfirmationModal({ confirm, busy, onCancel, onConfirm }: { confirm: TeamScreenConfirm; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!confirm) return null;
  const revoke = confirm.type === 'revoke';
  const remove = confirm.type === 'remove';
  const driver = !revoke ? confirm.driver : null;
  const title = revoke ? 'Revoke invitation?' : remove ? 'Remove driver from team?' : driver?.active ? 'Deactivate driver?' : 'Activate driver?';
  const message = revoke ? 'The current invitation link will stop working immediately.' : remove ? 'The driver will lose access. Completed route history and proof of delivery remain available.' : driver?.active ? 'The driver will lose access to assigned routes. Active assignments must be reassigned first.' : 'The driver will regain access to new and existing assignments.';
  return <Modal visible transparent animationType="fade"><View style={styles.modalOverlay}><View accessibilityViewIsModal style={styles.confirmCard}><View style={[styles.confirmIcon, !remove && !revoke && !driver?.active && { backgroundColor: C.successSoft }]}><Feather name={remove || revoke || driver?.active ? 'alert-triangle' : 'user-check'} size={22} color={remove || revoke || driver?.active ? C.danger : C.success} /></View><Text style={styles.confirmTitle}>{title}</Text><Text style={styles.confirmMessage}>{message}</Text><View style={styles.modalActions}><ActionButton variant="secondary" label="Keep unchanged" disabled={busy} onPress={onCancel} /><ActionButton variant={remove || revoke || driver?.active ? 'danger' : 'primary'} label={revoke ? 'Revoke' : remove ? 'Remove driver' : driver?.active ? 'Deactivate' : 'Activate'} loading={busy} onPress={onConfirm} /></View></View></View></Modal>;
}

type TeamScreenConfirm = { type: 'revoke'; invitation: Invitation } | { type: 'active' | 'remove'; driver: DriverProfile } | null;

const styles = StyleSheet.create({
  notice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, borderRadius: R.md, borderWidth: 1, borderColor: '#A8DEC9', backgroundColor: C.successSoft, marginBottom: S.lg },
  noticeError: { borderColor: '#F0B6C0', backgroundColor: C.dangerSoft },
  noticeText: { flex: 1, color: C.ink, fontSize: 13, lineHeight: 19 },
  section: { marginBottom: S.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md },
  sectionTitle: { color: C.ink, fontSize: 18, fontWeight: '600' },
  sectionHint: { color: C.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  countPill: { minWidth: 30, height: 26, borderRadius: R.pill, backgroundColor: C.warningSoft, alignItems: 'center', justifyContent: 'center' },
  countText: { color: C.warning, fontSize: 12, fontWeight: '600' },
  invitationList: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  invitationCard: { minWidth: 340, flex: 1, maxWidth: 620, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.lg },
  invitationCardNarrow: { width: 330, flex: 0 },
  avatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarInactive: { backgroundColor: '#EDF1F6' },
  avatarText: { color: C.primaryDark, fontSize: 15, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: S.sm },
  personName: { color: C.ink, fontSize: 14, fontWeight: '600', maxWidth: 220 },
  personMeta: { color: C.inkMuted, fontSize: 12, marginTop: 3 },
  expires: { color: C.warning, fontSize: 11, marginTop: 4 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: S.md, marginBottom: S.md },
  search: { width: 360, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, borderRadius: R.md, paddingHorizontal: S.md },
  searchInput: { flex: 1, minWidth: 120, color: C.ink, fontSize: 14 },
  segmented: { flexDirection: 'row', padding: 3, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: R.md },
  segment: { minHeight: 36, justifyContent: 'center', paddingHorizontal: S.md, borderRadius: 9 },
  segmentActive: { backgroundColor: C.primarySoft },
  segmentText: { color: C.inkMuted, fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: C.primaryDark },
  driverList: { gap: S.sm },
  driverRow: { minHeight: 76, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.md, padding: S.lg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, backgroundColor: C.surface },
  driverIdentity: { flex: 2, minWidth: 210 },
  assignment: { flex: 1.2, minWidth: 150 },
  historyCount: { minWidth: 90 },
  cellLabel: { color: C.inkSubtle, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  cellValue: { color: C.ink, fontSize: 12, fontWeight: '600', marginTop: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(23,32,51,0.54)', alignItems: 'center', justifyContent: 'center', padding: S.lg },
  inviteModal: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl },
  accessCodeCard: { width: '100%', maxWidth: 480, backgroundColor: C.surface, borderRadius: 22, padding: S.xl, alignItems: 'center' },
  accessCodeIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: S.lg },
  accessCodeTitle: { color: C.ink, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  accessCodeMessage: { color: C.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: S.sm },
  credentialBlock: { width: '100%', borderRadius: R.lg, borderWidth: 1, borderColor: '#C6D9F5', backgroundColor: C.primarySoft, padding: S.lg, marginVertical: S.xl },
  credentialLabel: { color: C.inkSubtle, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  credentialIdentifier: { color: C.ink, fontSize: 14, fontWeight: '600', marginTop: 5 },
  credentialDivider: { height: 1, backgroundColor: '#C6D9F5', marginVertical: S.lg },
  accessCodeValue: { color: C.primaryDark, fontSize: 27, fontWeight: '800', letterSpacing: 2, marginTop: 5 },
  accessCodeWarning: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, padding: S.md, borderRadius: R.md, backgroundColor: C.warningSoft, marginBottom: S.xl },
  accessCodeWarningText: { flex: 1, color: C.warning, fontSize: 11, lineHeight: 17 },
  detailPanel: { width: '100%', maxWidth: 660, maxHeight: '92%', backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.md, marginBottom: S.xl },
  modalTitle: { color: C.ink, fontSize: 20, fontWeight: '600' },
  modalSubtitle: { color: C.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  roleList: { gap: S.sm, marginTop: S.sm },
  roleChoice: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderWidth: 1, borderColor: C.line, borderRadius: R.md },
  roleChoiceSelected: { borderColor: '#BBD2FF', backgroundColor: C.primarySoft },
  roleLabel: { color: C.ink, fontSize: 14, fontWeight: '600' },
  roleDetail: { color: C.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  formError: { color: C.danger, backgroundColor: C.dangerSoft, borderRadius: R.md, padding: S.md, fontSize: 13 },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: S.sm },
  detailSummary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: S.md, padding: S.lg, borderRadius: R.md, backgroundColor: C.surfaceMuted, borderWidth: 1, borderColor: C.line },
  detailSummaryText: { color: C.inkMuted, fontSize: 13, flex: 1 },
  detailSectionTitle: { color: C.ink, fontSize: 15, fontWeight: '600' },
  detailSectionHint: { color: C.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: S.md },
  profileFields: { gap: S.md },
  permissionList: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, overflow: 'hidden' },
  permissionRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  permissionLabel: { color: C.ink, fontSize: 13, fontWeight: '600' },
  permissionDetail: { color: C.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  historyList: { gap: S.sm },
  historyRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderWidth: 1, borderColor: C.line, borderRadius: R.md },
  historyName: { color: C.ink, fontSize: 13, fontWeight: '600' },
  historyMeta: { color: C.inkMuted, fontSize: 11, marginTop: 3 },
  destructiveActions: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingTop: S.lg, borderTopWidth: 1, borderTopColor: C.line },
  confirmCard: { width: '100%', maxWidth: 440, backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl, alignItems: 'center' },
  confirmIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: S.md },
  confirmTitle: { color: C.ink, fontSize: 19, fontWeight: '600', textAlign: 'center' },
  confirmMessage: { color: C.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: S.sm, marginBottom: S.xl },
});
