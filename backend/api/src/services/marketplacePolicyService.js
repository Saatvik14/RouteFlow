const { HttpError } = require('../utils/httpError');

const MARKETPLACE_CURRENCIES = Object.freeze(['GBP', 'INR']);
const MIN_PUBLIC_LEAD_MINUTES = 30;
const BIDDING_BUFFER_MINUTES = 15;
const MAX_ROUTE_HOURS = 24;
const MAX_DRIVER_COST = 1000000;

const parseMoney = (value, field = 'amount') => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_DRIVER_COST) {
    throw new HttpError(400, 'INVALID_MARKETPLACE_COST', `${field} must be greater than 0 and no more than ${MAX_DRIVER_COST}.`, { field });
  }
  const rounded = Math.round(parsed * 100) / 100;
  if (Math.abs(parsed - rounded) > Number.EPSILON) {
    throw new HttpError(400, 'INVALID_MARKETPLACE_COST', `${field} can have at most two decimal places.`, { field });
  }
  return rounded;
};

const normalizeCurrency = (value) => {
  const currency = String(value || 'GBP').trim().toUpperCase();
  if (!MARKETPLACE_CURRENCIES.includes(currency)) {
    throw new HttpError(400, 'INVALID_MARKETPLACE_CURRENCY', `Currency must be ${MARKETPLACE_CURRENCIES.join(' or ')}.`, { field: 'currency' });
  }
  return currency;
};

const validateRouteWindow = ({ startValue, endValue, requirePublicLeadTime = false, now = new Date() }) => {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpError(400, 'INVALID_ROUTE_TIME', 'Start and end times must be valid ISO-8601 timestamps.');
  }
  if (end.getTime() <= start.getTime()) {
    throw new HttpError(400, 'INVALID_ROUTE_TIME', 'End time must be after start time.');
  }
  if (end.getTime() - start.getTime() > MAX_ROUTE_HOURS * 60 * 60 * 1000) {
    throw new HttpError(400, 'ROUTE_WINDOW_TOO_LONG', `A route window cannot exceed ${MAX_ROUTE_HOURS} hours.`);
  }
  if (requirePublicLeadTime && start.getTime() < now.getTime() + MIN_PUBLIC_LEAD_MINUTES * 60 * 1000) {
    throw new HttpError(400, 'PUBLIC_ROUTE_TOO_SOON', `A public route must start at least ${MIN_PUBLIC_LEAD_MINUTES} minutes from now so drivers have time to bid.`);
  }
  return { start, end };
};

const buildPublicListing = ({ startValue, endValue, maxCost, currency, now = new Date() }) => {
  const { start, end } = validateRouteWindow({ startValue, endValue, requirePublicLeadTime: true, now });
  return {
    start,
    end,
    maxCost: parseMoney(maxCost, 'maxCost'),
    currency: normalizeCurrency(currency),
    biddingClosesAt: new Date(start.getTime() - BIDDING_BUFFER_MINUTES * 60 * 1000),
  };
};

const rangesOverlap = (firstStart, firstEnd, secondStart, secondEnd) =>
  new Date(firstStart).getTime() < new Date(secondEnd).getTime()
  && new Date(firstEnd).getTime() > new Date(secondStart).getTime();

module.exports = {
  BIDDING_BUFFER_MINUTES,
  MARKETPLACE_CURRENCIES,
  MAX_ROUTE_HOURS,
  MIN_PUBLIC_LEAD_MINUTES,
  buildPublicListing,
  normalizeCurrency,
  parseMoney,
  rangesOverlap,
  validateRouteWindow,
};
