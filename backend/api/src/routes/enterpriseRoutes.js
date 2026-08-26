const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  loadOrganizationContext,
  requireBusinessRole,
  requireOrganizationRoles,
} = require('../middleware/rbacMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');
const { asyncHandler } = require('../utils/httpError');
const invitations = require('../controllers/invitationController');
const team = require('../controllers/teamController');
const operations = require('../controllers/operationsController');
const dispatch = require('../controllers/dispatchController');
const assignmentRecommendations = require('../controllers/assignmentRecommendationController');
const fleetAccess = require('../controllers/fleetAccessController');

const router = express.Router();

const publicInvitationLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  code: 'INVITATION_RATE_LIMITED',
  keyGenerator: (req) => `${req.ip}:invitation-accept`,
});
const invitationWriteLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  code: 'INVITATION_RATE_LIMITED',
  keyGenerator: (req) => `${req.organization?.id || 'none'}:${req.user?.user_id || req.ip}:invitation-write`,
});
const assignmentRecommendationLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  code: 'ASSIGNMENT_RECOMMENDATION_RATE_LIMITED',
  keyGenerator: (req) => `${req.organization?.id || 'none'}:${req.user?.user_id || req.ip}:assignment-recommendation`,
});
const fleetProvisionLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  code: 'FLEET_PROVISION_RATE_LIMITED',
  keyGenerator: (req) => `${req.organization?.id || 'none'}:${req.user?.user_id || req.ip}:fleet-provision`,
});

router.get('/invitations/accept/:token', publicInvitationLimit, asyncHandler(invitations.previewInvitation));
router.post('/invitations/accept/:token/new', publicInvitationLimit, asyncHandler(invitations.acceptNewInvitation));
router.post('/invitations/accept/:token/existing', publicInvitationLimit, protect, asyncHandler(invitations.acceptExistingInvitation));

router.use(protect, loadOrganizationContext);

router.get('/context', asyncHandler(team.getOrganizationContext));

router.get('/invitations', requireOrganizationRoles('owner', 'admin', 'dispatcher', 'viewer'), asyncHandler(invitations.listInvitations));
router.post('/invitations', requireBusinessRole, invitationWriteLimit, asyncHandler(invitations.createInvitation));
router.post('/invitations/:invitationId/resend', requireBusinessRole, invitationWriteLimit, asyncHandler(invitations.resendInvitation));
router.post('/invitations/:invitationId/revoke', requireBusinessRole, asyncHandler(invitations.revokeInvitation));

router.get('/team', requireOrganizationRoles('owner', 'admin', 'dispatcher', 'viewer'), asyncHandler(team.listTeam));
router.post('/team/drivers', requireBusinessRole, fleetProvisionLimit, asyncHandler(fleetAccess.provisionFleetDriver));
router.get('/team/drivers/:driverId/history', requireOrganizationRoles('owner', 'admin', 'dispatcher', 'viewer'), asyncHandler(team.getDriverHistory));
router.post('/team/drivers/:driverId/access-code', requireBusinessRole, fleetProvisionLimit, asyncHandler(fleetAccess.resetFleetDriverAccessCode));
router.patch('/team/drivers/:driverId', requireBusinessRole, asyncHandler(team.updateDriver));
router.delete('/team/drivers/:driverId', requireOrganizationRoles('owner', 'admin'), asyncHandler(team.removeDriver));
router.post('/routes/:routeId/change-requests', asyncHandler(team.requestRouteChange));

router.get('/assignments/mine', asyncHandler(operations.listMyAssignments));
router.post(
  '/assignment-recommendations',
  requireBusinessRole,
  assignmentRecommendationLimit,
  asyncHandler(assignmentRecommendations.generateRecommendations)
);
router.post(
  '/assignment-recommendations/:recommendationRunId/confirm',
  requireBusinessRole,
  asyncHandler(assignmentRecommendations.confirmRecommendations)
);
router.post('/routes/:routeId/assign', requireBusinessRole, asyncHandler(operations.assignRoute));
router.post('/routes/:routeId/accept', asyncHandler(operations.acceptAssignment));
router.post('/routes/:routeId/reject', asyncHandler(operations.rejectAssignment));
router.post('/routes/:routeId/start', asyncHandler(operations.startRoute));
router.post('/routes/:routeId/complete', asyncHandler(operations.completeRoute));
router.post('/routes/:routeId/cancel', requireBusinessRole, asyncHandler(operations.cancelRoute));

router.post('/stops/:orderId/arrive', asyncHandler(operations.markStopArrived));
router.post('/stops/:orderId/complete', operations.proofUpload, asyncHandler(operations.completeStop));
router.get('/proofs/:proofId/content', asyncHandler(operations.downloadProof));
router.post('/routes/:routeId/location', asyncHandler(operations.updateLocation));

router.get('/dashboard', requireOrganizationRoles('owner', 'admin', 'dispatcher', 'viewer'), asyncHandler(dispatch.getDashboard));
router.get('/routes/:routeId/detail', asyncHandler(dispatch.getRouteDetail));
router.get('/routes/:routeId/progress', asyncHandler(dispatch.getLiveProgress));
router.get('/reports/daily', requireOrganizationRoles('owner', 'admin', 'dispatcher', 'viewer'), asyncHandler(dispatch.getReport));
router.get('/reports/daily.csv', requireOrganizationRoles('owner', 'admin', 'dispatcher', 'viewer'), asyncHandler(dispatch.exportReportCsv));

module.exports = router;
