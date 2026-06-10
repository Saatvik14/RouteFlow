import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  completionTopBar: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 30,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },

  completionTopTextBox: {
    flex: 1,
    minWidth: 0,
  },

  completionTopTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    color: '#334155',
  },

  completionTopSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: '#94A3B8',
  },

  completionIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  completionContent: {
    paddingHorizontal: 30,
    paddingTop: 0,
    backgroundColor: '#F8FAFC',
  },

  completionTimelineBlock: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: -30,
    paddingHorizontal: 30,
    paddingTop: 2,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  completionTimelineItem: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  completionTimeBox: {
    width: 58,
    paddingTop: 22,
    alignItems: 'flex-start',
  },

  completionTimeText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: '#64748B',
  },

  completionTimeActiveText: {
    color: '#2563EB',
    fontWeight: '500',
  },

  completionMarkerColumn: {
    width: 28,
    alignItems: 'center',
  },

  completionMarker: {
    width: 19,
    height: 19,
    borderRadius: 10,
    marginTop: 22,
    backgroundColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  completionMarkerStart: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#BFDBFE',
  },

  completionMarkerEnd: {
    width: 28,
    height: 28,
    borderRadius: 9,
    marginTop: 17,
    backgroundColor: '#2563EB',
  },

  completionMarkerSuccess: {
    backgroundColor: '#22C55E',
  },

  completionMarkerDanger: {
    backgroundColor: '#EF4444',
  },

  completionMarkerText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  completionMarkerLine: {
    flex: 1,
    width: 3,
    marginTop: 0,
    backgroundColor: '#BFDBFE',
  },

  completionTimelineCard: {
    flex: 1,
    minHeight: 72,
    marginLeft: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },

  completionTimelineCardActive: {
    borderBottomWidth: 0,
  },

  completionTimelineTextBox: {
    flex: 1,
    minWidth: 0,
  },

  completionTimelineTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '500',
    color: '#94A3B8',
  },

  completionTimelineTitleActive: {
    color: '#111827',
  },

  completionTimelineSubtitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: '#64748B',
  },

  completionStatusBadge: {
    minWidth: 70,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  completionStatusSuccess: {
    backgroundColor: '#F0FDF4',
  },

  completionStatusFailed: {
    backgroundColor: '#FEF2F2',
  },

  completionStatusText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  completionStatusSuccessText: {
    color: '#16A34A',
  },

  completionStatusFailedText: {
    color: '#DC2626',
  },

  completionEndIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  markRouteCompletedButton: {
    marginTop: 24,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  markRouteCompletedText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    color: '#2563EB',
  },

  routeCompletedContent: {
    paddingHorizontal: 30,
    paddingTop: 22,
    backgroundColor: '#FFFFFF',
  },

  routeCompletedHeroCard: {
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
  },

  routeCompletedIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  routeCompletedTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },

  routeCompletedSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
  },

  routeCompletedStatsRow: {
    width: '100%',
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  routeCompletedStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  routeCompletedStatsText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    color: '#334155',
  },

  routeCompletedStatusText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    color: '#94A3B8',
  },

  copyRouteButton: {
    marginTop: 32,
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },

  copyRouteButtonText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
    color: '#2563EB',
    textAlign: 'center',
  },

  createRouteButton: {
    marginTop: 14,
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  createRouteButtonText: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  draggableTransitSheetWeb: {
    left: 24,
    right: undefined,
    bottom: 24,
    width: 460,
    maxWidth: 460,
    borderRadius: 30,
  },

  transitSheetContent: {
    paddingHorizontal: 30,
    paddingTop: 4,
    backgroundColor: '#FFFFFF',
  },

  transitHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  transitHeaderTextBox: {
    flex: 1,
    paddingRight: 16,
    minWidth: 0,
  },

  transitTitle: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '500',
    color: '#111827',
    letterSpacing: -0.4,
  },

  transitProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  transitBlueDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#2F76F6',
    marginRight: 9,
  },

  transitProgressText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
    color: '#64748B',
  },

  transitCloseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  transitActionsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 26,
  },

  transitActionCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E0EC',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  transitNavigateCard: {
    backgroundColor: '#2F76F6',
    borderColor: '#2F76F6',
  },

  transitActionText: {
    marginTop: 7,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },

  transitNavigateText: {
    color: '#FFFFFF',
  },

  packageActionIconWrap: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  packageActionBadge: {
    position: 'absolute',
    right: 1,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },

  packageActionBadgeSuccess: {
    backgroundColor: '#22C55E',
  },

  packageActionBadgeDanger: {
    backgroundColor: '#EF4444',
  },

  stopRowsBlock: {
    backgroundColor: '#FFFFFF',
    marginBottom: 0,
  },

  stopDetailRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },

  rowIconBox: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },

  stopMainText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '400',
    color: '#111827',
  },

  stopMutedText: {
    flex: 1,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '400',
    color: '#94A3B8',
  },

  stopMutedInlineText: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '400',
    color: '#94A3B8',
  },

  stopIdIcon: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
    color: '#475569',
  },

  transitOptionsBlock: {
    backgroundColor: '#F1F5F9',
    marginHorizontal: -30,
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 8,
  },

  transitOptionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  transitOptionText: {
    flex: 1,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '400',
    color: '#111827',
  },

  transitCompleteCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  transitCompleteIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    marginBottom: 18,
  },

  transitCompleteTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },

  transitCompleteText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    elevation: 30,
    minHeight: '43%',
    maxHeight: '58%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  panelWeb: {
    minHeight: 330,
    maxHeight: '48%',
  },
  panelLarge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '15%',
    zIndex: 90,
    elevation: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  panelSearchWeb: {
    top: '18%',
  },
  panelDetailsWeb: {
    top: '12%',
  },
  draggableSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
    elevation: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  draggableSheetWeb: {
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  dragHandleZone: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    alignSelf: 'center',
    width: 72,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginTop: 8,
    marginBottom: 10,
  },
  previewHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    flexShrink: 1,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#64748B',
  },
  statusChip: {
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  optimizedChip: {
    backgroundColor: '#DBEAFE',
  },
  optimizedChipText: {
    color: '#1D4ED8',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 24,
    color: '#334155',
  },
  summaryGrid: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryGridWeb: {
    paddingHorizontal: 28,
    gap: 14,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 155,
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBlue: {
    backgroundColor: '#EFF6FF',
  },
  summaryIconGreen: {
    backgroundColor: '#DCFCE7',
  },
  summaryIconPurple: {
    backgroundColor: '#F3E8FF',
  },
  summaryIconOrange: {
    backgroundColor: '#FFEDD5',
  },
  summaryIconText: {
    fontSize: 20,
    color: '#2563EB',
  },
  summaryTextBox: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  previewMain: {
    gap: 12,
  },
  previewMainWeb: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 16,
  },
  previewColumn: {
    flex: 1,
  },
  routeSetupCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  stopsCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  sectionTitleRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  roundTripChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
  },
  roundTripChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  locationCard: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMarker: {
    backgroundColor: '#22C55E',
  },
  endMarker: {
    backgroundColor: '#EF4444',
  },
  locationMarkerText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationTextBox: {
    flex: 1,
    minWidth: 0,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  timePill: {
    minWidth: 66,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  locationConnector: {
    width: 2,
    height: 18,
    marginLeft: 31,
    backgroundColor: '#CBD5E1',
  },
  stopListItem: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopDragDots: {
    fontSize: 17,
    color: '#94A3B8',
  },
  stopNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stopListTextBox: {
    flex: 1,
    minWidth: 0,
  },
  stopListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  stopListSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  stopEtaText: {
    fontSize: 12,
    color: '#64748B',
  },
  stopChevron: {
    fontSize: 24,
    fontWeight: '300',
    color: '#94A3B8',
  },
  noStopsCard: {
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  noStopsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  noStopsSubtitle: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
  },
  previewFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  previewFooterWeb: {
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryActionButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  actionButtonWeb: {
    flex: 1,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmSummaryPill: {
    minWidth: 96,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmSummaryLabel: {
    fontSize: 11,
    color: '#16A34A',
  },
  confirmSummaryValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
  },
  refineActionButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  confirmActionWeb: {
    flex: 1,
  },
  searchRow: {
    marginHorizontal: 28,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  searchInputBox: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchFocused: {
    borderColor: '#2F76F6',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    fontSize: 22,
    color: '#94A3B8',
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#475569',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  searchSideIcon: {
    fontSize: 18,
    color: '#94A3B8',
    marginLeft: 14,
  },
  moreText: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 14,
  },
  closeButton: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#94A3B8',
  },
  clearText: {
    fontSize: 30,
    fontWeight: '300',
    color: '#94A3B8',
  },
  emptyBody: {
    flex: 1,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    color: '#94A3B8',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#94A3B8',
  },
  emptyFooter: {
    paddingHorizontal: 28,
    gap: 12,
  },
  primaryFullButton: {
    height: 56,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryFullButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  secondaryFullButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryFullButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#2F76F6',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  quickAction: {
    flex: 1,
    height: 86,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    color: '#2F76F6',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 16,
    color: '#2F76F6',
  },
  searchSectionTitle: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: '#475569',
  },
  suggestionRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  suggestionIcon: {
    width: 46,
    fontSize: 24,
    color: '#94A3B8',
  },
  suggestionTextBox: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111827',
  },
  suggestionSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: '#64748B',
  },
  rowArrow: {
    fontSize: 30,
    fontWeight: '300',
    color: '#94A3B8',
  },
  detailsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stopCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2F76F6',
  },
  tagText: {
    fontSize: 13,
    color: '#111827',
  },
  addedTag: {
    marginLeft: 'auto',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
  },
  addedTagText: {
    fontSize: 13,
    color: '#15803D',
  },
  detailsTitle: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  detailsSubtitle: {
    marginTop: 4,
    fontSize: 16,
    color: '#64748B',
  },
  disabledButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  disabledButtonText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  detailsRow: {
    marginTop: 16,
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsRowIcon: {
    fontSize: 22,
    color: '#64748B',
  },
  notesInput: {
    flex: 1,
    marginHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  optionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 42,
    fontSize: 22,
    color: '#475569',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  optionValue: {
    fontSize: 15,
    color: '#94A3B8',
  },
  counter: {
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  counterButton: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: 22,
    color: '#64748B',
  },
  counterNumber: {
    width: 44,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    color: '#64748B',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  segment: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
    flexDirection: 'row',
  },
  segmentItem: {
    minWidth: 74,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  segmentItemActive: {
    backgroundColor: '#EFF6FF',
  },
  segmentText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  segmentTextActive: {
    color: '#2F76F6',
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  addStopConfirmButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  addStopConfirmText: {
    fontSize: 17,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  setupHeader: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setupHeaderText: {
    flex: 1,
    fontSize: 15,
    color: '#475569',
  },
  setupHeaderIcon: {
    fontSize: 26,
    color: '#64748B',
    marginLeft: 24,
  },
  sectionHeader: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: '#475569',
  },
  setupItem: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  setupTimeBox: {
    width: 74,
    alignItems: 'flex-start',
  },
  setupTime: {
    fontSize: 14,
    color: '#475569',
  },
  setupDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
    marginLeft: 8,
  },
  setupTextBox: {
    flex: 1,
  },
  setupTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111827',
  },
  setupSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: '#475569',
  },
  setupIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupIconText: {
    fontSize: 20,
    color: '#2F76F6',
  },
  badge: {
    minWidth: 48,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 16,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  confirmFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerDuration: {
    width: 96,
    fontSize: 22,
    fontWeight: '600',
    color: '#16A34A',
  },
  refineButton: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineText: {
    fontSize: 16,
    color: '#111827',
  },
  confirmButton: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2F76F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});