import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OperationsColors as C, OperationsRadius as R, OperationsSpacing as S } from '../../constants/theme';
import {
  AssignmentCandidate,
  AssignmentRecommendation,
  DashboardRoute,
  enterpriseService,
} from '../../services/api/enterprise';
import { ActionButton, StatePanel } from './operations-ui';

type Props = {
  visible: boolean;
  routes: DashboardRoute[];
  onClose: () => void;
  onConfirmed: () => Promise<void> | void;
};

const defaultCriteria = 'Prefer nearby drivers, balance workload, avoid overtime, and consider successful route history.';

export function AiAssignmentModal({ visible, routes, onClose, onConfirmed }: Props) {
  const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
  const [criteria, setCriteria] = useState(defaultCriteria);
  const [recommendation, setRecommendation] = useState<AssignmentRecommendation | null>(null);
  const [chosenDrivers, setChosenDrivers] = useState<Record<number, number>>({});
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    const assignable = routes.filter((route) => ['draft', 'assigned', 'accepted'].includes(route.status));
    const preferred = assignable.filter((route) => !route.driver);
    setSelectedRouteIds((preferred.length ? preferred : assignable).slice(0, 25).map((route) => route.routeId));
    setRecommendation(null);
    setChosenDrivers({});
    setError('');
  }, [routes, visible]);

  const assignableRoutes = useMemo(
    () => routes.filter((route) => ['draft', 'assigned', 'accepted'].includes(route.status)),
    [routes],
  );

  const toggleRoute = (routeId: number) => {
    if (generating) return;
    setSelectedRouteIds((current) => current.includes(routeId)
      ? current.filter((id) => id !== routeId)
      : current.length < 25 ? [...current, routeId] : current);
  };

  const generate = async () => {
    if (!selectedRouteIds.length || generating) return;
    setGenerating(true);
    setError('');
    const response = await enterpriseService.generateAssignmentRecommendations(selectedRouteIds, criteria.trim());
    setGenerating(false);
    if (!response.success || !response.data?.recommendation) {
      setError(response.error || 'Driver recommendations could not be generated.');
      return;
    }
    const next = response.data.recommendation;
    setRecommendation(next);
    setChosenDrivers(Object.fromEntries(next.recommendations
      .filter((item) => item.selected)
      .map((item) => [item.routeId, item.selected!.driverId])));
  };

  const confirm = async () => {
    if (!recommendation || confirming) return;
    const assignments = recommendation.recommendations
      .filter((item) => chosenDrivers[item.routeId])
      .map((item) => ({ routeId: item.routeId, driverId: chosenDrivers[item.routeId] }));
    if (!assignments.length) {
      setError('Choose at least one recommended assignment to confirm.');
      return;
    }
    setConfirming(true);
    setError('');
    const response = await enterpriseService.confirmAssignmentRecommendations(
      recommendation.recommendationRunId,
      assignments,
    );
    setConfirming(false);
    if (!response.success) {
      setError(response.error || 'The assignments could not be confirmed. Generate a fresh recommendation and try again.');
      return;
    }
    await onConfirmed();
    onClose();
  };

  const close = () => {
    if (!generating && !confirming) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close AI assignment" onPress={close} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.aiIcon}><Feather name="zap" size={19} color={C.primaryDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>AI-assisted assignment</Text>
                <Text style={styles.subtitle}>Gemini interprets your criteria; RouteFloww validates every assignment.</Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Close" onPress={close} style={styles.closeButton}>
              <Feather name="x" size={21} color={C.inkMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            {!recommendation ? (
              <>
                <View>
                  <Text style={styles.sectionTitle}>1. Choose routes</Text>
                  <Text style={styles.sectionHint}>Select one route or create a coordinated plan for up to 25 routes.</Text>
                </View>
                {assignableRoutes.length === 0 ? (
                  <StatePanel icon="check-circle" title="Nothing to assign" message="There are no draft, assigned, or accepted routes in the current dashboard view." />
                ) : (
                  <View style={styles.routeChoices}>
                    {assignableRoutes.map((route) => {
                      const selected = selectedRouteIds.includes(route.routeId);
                      return (
                        <Pressable
                          key={route.routeId}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          onPress={() => toggleRoute(route.routeId)}
                          style={[styles.routeChoice, selected && styles.routeChoiceSelected]}
                        >
                          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                            {selected ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.routeName}>{route.name}</Text>
                            <Text style={styles.routeMeta}>Route #{route.routeId} · {route.driver?.name || 'Unassigned'}</Text>
                          </View>
                          <Text style={styles.routeTime}>{new Date(route.plannedStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View>
                  <Text style={styles.sectionTitle}>2. Describe your priorities</Text>
                  <Text style={styles.sectionHint}>Availability and schedule conflicts remain mandatory, regardless of the prompt.</Text>
                </View>
                <TextInput
                  value={criteria}
                  onChangeText={setCriteria}
                  editable={!generating}
                  multiline
                  maxLength={2000}
                  accessibilityLabel="Driver assignment criteria"
                  placeholder="Example: Prefer refrigerated-certified drivers near the depot and balance weekly hours."
                  placeholderTextColor={C.inkSubtle}
                  style={styles.criteriaInput}
                />
                <View style={styles.footerActions}>
                  <Text style={styles.selectionCount}>{selectedRouteIds.length} route{selectedRouteIds.length === 1 ? '' : 's'} selected</Text>
                  <ActionButton
                    icon="zap"
                    label={generating ? 'Analyzing drivers' : 'Generate recommendations'}
                    loading={generating}
                    disabled={!selectedRouteIds.length}
                    onPress={generate}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTitleRow}>
                    <Feather name={recommendation.llm.used ? 'zap' : 'cpu'} size={17} color={C.primaryDark} />
                    <Text style={styles.summaryTitle}>{recommendation.llm.used ? 'Gemini-assisted plan' : 'Validated fallback plan'}</Text>
                  </View>
                  <Text style={styles.summary}>{recommendation.summary}</Text>
                  <Text style={styles.interpretation}>{recommendation.interpretation}</Text>
                  {recommendation.llm.warning ? <Text style={styles.warning}>{recommendation.llm.warning}</Text> : null}
                </View>

                <View style={styles.results}>
                  {recommendation.recommendations.map((item) => {
                    const candidates = item.selected ? [item.selected, ...item.alternatives] : [];
                    return (
                      <View key={item.routeId} style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                          <View style={{ flex: 1 }}><Text style={styles.routeName}>{item.routeName}</Text><Text style={styles.routeMeta}>Route #{item.routeId}</Text></View>
                          {item.selected ? <View style={styles.scorePill}><Text style={styles.scoreText}>{item.selected.score}</Text></View> : null}
                        </View>
                        <Text style={styles.explanation}>{item.explanation}</Text>
                        {candidates.length ? candidates.map((candidate, index) => (
                          <CandidateChoice
                            key={candidate.driverId}
                            candidate={candidate}
                            recommended={index === 0}
                            selected={chosenDrivers[item.routeId] === candidate.driverId}
                            disabled={confirming}
                            onPress={() => setChosenDrivers((current) => ({ ...current, [item.routeId]: candidate.driverId }))}
                          />
                        )) : (
                          <View style={styles.noMatch}>
                            <Feather name="alert-circle" size={16} color={C.warning} />
                            <Text style={styles.noMatchText}>{item.noMatchReasons.join(' · ') || 'No active driver satisfies the route constraints.'}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.reviewNotice}>
                  <Feather name="shield" size={17} color={C.primaryDark} />
                  <Text style={styles.reviewText}>Nothing is assigned until you confirm. Route versions and driver availability are checked again at confirmation.</Text>
                </View>
                <View style={styles.footerActions}>
                  <ActionButton variant="secondary" label="Change criteria" disabled={confirming} onPress={() => { setRecommendation(null); setError(''); }} />
                  <ActionButton icon="user-check" label="Confirm assignments" loading={confirming} onPress={confirm} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CandidateChoice({ candidate, recommended, selected, disabled, onPress }: {
  candidate: AssignmentCandidate;
  recommended: boolean;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.candidate, selected && styles.candidateSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={{ flex: 1 }}>
        <View style={styles.candidateTitleRow}>
          <Text style={styles.candidateName}>{candidate.driverName}</Text>
          {recommended ? <Text style={styles.recommended}>Recommended</Text> : <Text style={styles.alternative}>Alternative · {candidate.score}</Text>}
        </View>
        <Text style={styles.candidateReason}>{candidate.reasons.slice(0, 2).join(' · ')}</Text>
        {candidate.warnings.length ? <Text style={styles.warning}>{candidate.warnings.join(' · ')}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(23,32,51,0.58)', justifyContent: 'center', alignItems: 'center', padding: S.lg },
  card: { width: '100%', maxWidth: 760, maxHeight: '92%', borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.xl, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.line },
  titleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: S.md },
  aiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  title: { color: C.ink, fontSize: 18, fontWeight: '600' },
  subtitle: { color: C.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { maxHeight: 720 },
  content: { padding: S.xl, gap: S.lg },
  error: { color: C.danger, backgroundColor: C.dangerSoft, borderRadius: R.md, padding: S.md, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: C.ink, fontSize: 15, fontWeight: '600' },
  sectionHint: { color: C.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  routeChoices: { gap: S.xs },
  routeChoice: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.md },
  routeChoiceSelected: { borderColor: '#B8D0FA', backgroundColor: C.primarySoft },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: C.lineStrong, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: C.primary, borderColor: C.primary },
  routeName: { color: C.ink, fontSize: 14, fontWeight: '600' },
  routeMeta: { color: C.inkMuted, fontSize: 11, marginTop: 2 },
  routeTime: { color: C.inkMuted, fontSize: 12, fontWeight: '500' },
  criteriaInput: { minHeight: 112, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md, padding: S.md, color: C.ink, fontSize: 14, lineHeight: 21, textAlignVertical: 'top', backgroundColor: C.surface },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: S.sm },
  selectionCount: { flex: 1, minWidth: 140, color: C.inkMuted, fontSize: 12 },
  summaryCard: { backgroundColor: C.primarySoft, borderWidth: 1, borderColor: '#C9DCFF', borderRadius: R.lg, padding: S.lg, gap: S.sm },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  summaryTitle: { color: C.primaryDark, fontSize: 13, fontWeight: '700' },
  summary: { color: C.ink, fontSize: 14, lineHeight: 21, fontWeight: '500' },
  interpretation: { color: C.inkMuted, fontSize: 12, lineHeight: 18 },
  warning: { color: C.warning, fontSize: 11, lineHeight: 16, marginTop: 3 },
  results: { gap: S.md },
  resultCard: { borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.lg, gap: S.md },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  scorePill: { minWidth: 42, height: 28, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.successSoft },
  scoreText: { color: C.success, fontSize: 12, fontWeight: '700' },
  explanation: { color: C.inkMuted, fontSize: 12, lineHeight: 18 },
  candidate: { minHeight: 60, flexDirection: 'row', alignItems: 'flex-start', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  candidateSelected: { borderColor: '#B8D0FA', backgroundColor: C.primarySoft },
  radio: { width: 18, height: 18, marginTop: 2, borderRadius: 9, borderWidth: 1.5, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: C.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary },
  candidateTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.sm },
  candidateName: { color: C.ink, fontSize: 13, fontWeight: '600' },
  recommended: { color: C.primaryDark, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  alternative: { color: C.inkMuted, fontSize: 10, fontWeight: '600' },
  candidateReason: { color: C.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  noMatch: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, padding: S.md, borderRadius: R.md, backgroundColor: C.warningSoft },
  noMatchText: { flex: 1, color: C.ink, fontSize: 12, lineHeight: 18 },
  reviewNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, padding: S.md, borderRadius: R.md, backgroundColor: C.surfaceMuted },
  reviewText: { flex: 1, color: C.inkMuted, fontSize: 12, lineHeight: 18 },
});
