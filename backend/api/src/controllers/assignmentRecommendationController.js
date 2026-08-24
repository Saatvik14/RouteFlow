const {
  confirmRecommendation,
  createRecommendation,
} = require('../services/assignmentRecommendationService');
const { HttpError } = require('../utils/httpError');
const { positiveInteger } = require('../utils/validation');

const validateRouteIds = (value) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 25) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Select between 1 and 25 routes.');
  }
  const routeIds = [...new Set(value.map((item) => positiveInteger(item, 'routeId')))];
  if (routeIds.length !== value.length) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Each selected route must be unique.');
  }
  return routeIds;
};

const generateRecommendations = async (req, res) => {
  const routeIds = validateRouteIds(req.body.routeIds);
  const criteriaText = String(req.body.criteria || '').trim();
  if (criteriaText.length > 2000) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Assignment criteria must be 2,000 characters or fewer.');
  }
  const recommendation = await createRecommendation({
    organizationId: req.organization.id,
    userId: req.user.user_id,
    routeIds,
    criteriaText,
  });
  return res.status(201).json({
    success: true,
    recommendation,
    message: 'Draft assignment recommendation created. Review it before confirming.',
  });
};

const confirmRecommendations = async (req, res) => {
  const recommendationRunId = positiveInteger(req.params.recommendationRunId, 'recommendationRunId');
  let assignments;
  if (req.body.assignments !== undefined) {
    if (!Array.isArray(req.body.assignments) || req.body.assignments.length > 25) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'assignments must be an array with at most 25 items.');
    }
    assignments = req.body.assignments.map((item) => ({
      routeId: positiveInteger(item?.routeId, 'routeId'),
      driverId: positiveInteger(item?.driverId, 'driverId'),
    }));
  }
  const result = await confirmRecommendation({
    organizationId: req.organization.id,
    userId: req.user.user_id,
    recommendationRunId,
    assignments,
  });
  return res.json({
    success: true,
    ...result,
    message: `${result.assignments.length} route${result.assignments.length === 1 ? '' : 's'} assigned.`,
  });
};

module.exports = {
  confirmRecommendations,
  generateRecommendations,
  validateRouteIds,
};
