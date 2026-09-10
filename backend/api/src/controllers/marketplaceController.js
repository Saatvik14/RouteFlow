const { runQuery, withTransaction } = require('../config/db');
const { BUSINESS_ROLES, DEFAULT_DRIVER_PERMISSIONS } = require('../constants/enterprise');
const { assignRouteWithClient } = require('../services/routeAssignmentService');
const { normalizeCurrency, parseMoney } = require('../services/marketplacePolicyService');
const { HttpError } = require('../utils/httpError');
const { positiveInteger, requireString } = require('../utils/validation');

const isIndependentDriver = (req) => String(req.user?.role || '').toUpperCase() === 'INDEPENDENT_DRIVER';

const assertIndependentDriver = (req) => {
  if (!isIndependentDriver(req)) {
    throw new HttpError(403, 'INDEPENDENT_DRIVER_REQUIRED', 'Only independent drivers can browse open listings and place bids.');
  }
};

const expireStartedListings = async () => {
  // 1. Expire past public bidding routes
  await runQuery(
    `WITH expired_routes AS (
       UPDATE routes
       SET is_public = FALSE, marketplace_status = 'closed',
           marketplace_closed_at = NOW(), updated_at = NOW()
       WHERE marketplace_status = 'open'
         AND marketplace_scope = 'public'
         AND start_datetime <= NOW()
       RETURNING route_id
     )
     UPDATE route_bids rb
     SET status = 'expired', decided_at = NOW(), updated_at = NOW()
     FROM expired_routes er
     WHERE rb.route_id = er.route_id AND rb.status = 'pending'`
  );

  // 2. Re-open any unassigned fleet pool routes that were prematurely closed by legacy cleanup
  await runQuery(
    `UPDATE routes
     SET marketplace_status = 'open', is_public = TRUE, updated_at = NOW()
     WHERE marketplace_scope = 'fleet'
       AND driver_id IS NULL
       AND status IN ('draft', 'optimized')
       AND marketplace_status = 'closed'
       AND (end_datetime IS NULL OR end_datetime >= NOW() - INTERVAL '2 days')`
  ).catch(() => {});
};

const assertBusinessListingAccess = async (queryable, routeId, userId, { lock = false } = {}) => {
  const result = await queryable.query(
    `SELECT r.*, o.name AS organization_name, om.role AS organization_role
     FROM routes r
     JOIN organizations o ON o.organization_id = r.organization_id
     JOIN organization_memberships om
       ON om.organization_id = r.organization_id
      AND om.user_id = $2
      AND om.status = 'active'
     WHERE r.route_id = $1
       AND om.role = ANY($3::text[])
     ${lock ? 'FOR UPDATE OF r' : ''}`,
    [routeId, userId, BUSINESS_ROLES]
  );
  if (!result.rows.length) throw new HttpError(404, 'LISTING_NOT_FOUND', 'Marketplace listing not found.');
  return result.rows[0];
};

const listingPayload = (row) => ({
  routeId: Number(row.route_id),
  organizationName: row.organization_name,
  name: row.name,
  startAddress: row.start_full_address,
  endAddress: row.end_full_address,
  plannedStart: row.start_datetime,
  plannedEnd: row.end_datetime,
  maxCost: row.max_driver_cost === null ? null : Number(row.max_driver_cost),
  currency: row.cost_currency?.trim() || null,
  biddingClosesAt: row.bidding_closes_at,
  marketplaceStatus: row.marketplace_status,
  bidCount: Number(row.bid_count || 0),
  pendingBidCount: Number(row.pending_bid_count || 0),
  awardedCost: row.awarded_cost === null ? null : Number(row.awarded_cost),
  myBid: row.my_bid_id ? {
    bidId: Number(row.my_bid_id),
    amount: Number(row.my_bid_amount),
    status: row.my_bid_status,
    message: row.my_bid_message,
    updatedAt: row.my_bid_updated_at,
  } : null,
});

const bidPayload = (row) => ({
  bidId: Number(row.bid_id),
  routeId: Number(row.route_id),
  amount: Number(row.amount),
  currency: row.currency?.trim(),
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  driver: row.bidder_user_id ? {
    userId: Number(row.bidder_user_id),
    name: row.driver_name,
    email: row.driver_email,
    phone: row.driver_phone,
    vehicleType: row.vehicle_type || null,
    completedRoutes: Number(row.completed_routes || 0),
    cancelledRoutes: Number(row.cancelled_routes || 0),
    completionRate: Number(row.completion_rate || 0),
  } : undefined,
  route: row.route_name ? {
    name: row.route_name,
    organizationName: row.organization_name,
    plannedStart: row.start_datetime,
    plannedEnd: row.end_datetime,
    startAddress: row.start_full_address,
    endAddress: row.end_full_address,
    maxCost: Number(row.max_driver_cost),
    marketplaceStatus: row.marketplace_status,
  } : undefined,
});

const getSummary = async (req, res) => {
  await expireStartedListings();
  if (isIndependentDriver(req)) {
    const result = await runQuery(
      `SELECT
         (SELECT COUNT(*) FROM routes r
          WHERE r.is_public = TRUE AND r.marketplace_status = 'open'
            AND r.status IN ('draft', 'optimized')
            AND r.driver_id IS NULL AND r.bidding_closes_at > NOW() AND r.start_datetime > NOW())::integer AS available,
         COUNT(*) FILTER (WHERE rb.status = 'pending')::integer AS pending,
         COUNT(*) FILTER (WHERE rb.status = 'accepted')::integer AS awarded
       FROM route_bids rb WHERE rb.bidder_user_id = $1`,
      [req.user.user_id]
    );
    return res.json({ success: true, role: 'driver', ...result.rows[0] });
  }

  const result = await runQuery(
    `SELECT
       COUNT(DISTINCT r.route_id) FILTER (WHERE r.marketplace_status = 'open')::integer AS open,
       COUNT(rb.bid_id) FILTER (WHERE rb.status = 'pending')::integer AS pending_bids
     FROM organization_memberships om
     JOIN routes r ON r.organization_id = om.organization_id AND r.marketplace_status <> 'private'
     LEFT JOIN route_bids rb ON rb.route_id = r.route_id
     WHERE om.user_id = $1 AND om.status = 'active' AND om.role = ANY($2::text[])`,
    [req.user.user_id, BUSINESS_ROLES]
  );
  return res.json({ success: true, role: 'business', ...result.rows[0] });
};

const listAvailableRoutes = async (req, res) => {
  assertIndependentDriver(req);
  await expireStartedListings();
  const result = await runQuery(
    `SELECT r.*, o.name AS organization_name,
            counts.bid_count, counts.pending_bid_count,
            mine.bid_id AS my_bid_id, mine.amount AS my_bid_amount,
            mine.status AS my_bid_status, mine.message AS my_bid_message,
            mine.updated_at AS my_bid_updated_at
     FROM routes r
     JOIN organizations o ON o.organization_id = r.organization_id
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::integer AS bid_count,
              COUNT(*) FILTER (WHERE status = 'pending')::integer AS pending_bid_count
       FROM route_bids WHERE route_id = r.route_id
     ) counts ON TRUE
     LEFT JOIN route_bids mine ON mine.route_id = r.route_id AND mine.bidder_user_id = $1
     WHERE r.is_public = TRUE AND r.marketplace_status = 'open'
       AND r.status IN ('draft', 'optimized')
       AND r.driver_id IS NULL AND r.bidding_closes_at > NOW() AND r.start_datetime > NOW()
     ORDER BY r.start_datetime ASC, r.marketplace_published_at DESC
     LIMIT 250`,
    [req.user.user_id]
  );
  return res.json({ success: true, routes: result.rows.map(listingPayload) });
};

const listMyBids = async (req, res) => {
  assertIndependentDriver(req);
  await expireStartedListings();
  const result = await runQuery(
    `SELECT rb.*, r.name AS route_name, r.start_datetime, r.end_datetime,
            r.start_full_address, r.end_full_address, r.max_driver_cost,
            r.marketplace_status, o.name AS organization_name
     FROM route_bids rb
     JOIN routes r ON r.route_id = rb.route_id
     JOIN organizations o ON o.organization_id = r.organization_id
     WHERE rb.bidder_user_id = $1
     ORDER BY CASE rb.status WHEN 'accepted' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
              r.start_datetime ASC, rb.updated_at DESC
     LIMIT 250`,
    [req.user.user_id]
  );
  return res.json({ success: true, bids: result.rows.map(bidPayload) });
};

const placeBid = async (req, res) => {
  assertIndependentDriver(req);
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const amount = parseMoney(req.body.amount, 'amount');
  const message = req.body.message ? requireString(req.body.message, 'Message', { min: 3, max: 500 }) : null;

  const bid = await withTransaction(async (client) => {
    const listingResult = await client.query(
      `SELECT r.* FROM routes r WHERE r.route_id = $1 FOR UPDATE`,
      [routeId]
    );
    const listing = listingResult.rows[0];
    if (!listing || !listing.is_public || listing.marketplace_status !== 'open' || listing.driver_id || !['draft', 'optimized'].includes(listing.status)) {
      throw new HttpError(404, 'LISTING_NOT_FOUND', 'This marketplace route is no longer available.');
    }
    if (new Date(listing.bidding_closes_at).getTime() <= Date.now() || new Date(listing.start_datetime).getTime() <= Date.now()) {
      throw new HttpError(409, 'BIDDING_CLOSED', 'Bidding has closed for this route.');
    }
    if (amount > Number(listing.max_driver_cost)) {
      throw new HttpError(400, 'BID_OVER_BUDGET', `Your bid cannot exceed the business budget of ${listing.cost_currency.trim()} ${Number(listing.max_driver_cost).toFixed(2)}.`);
    }
    const ownBusiness = await client.query(
      `SELECT 1 FROM organization_memberships
       WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
         AND role = ANY($3::text[]) LIMIT 1`,
      [listing.organization_id, req.user.user_id, BUSINESS_ROLES]
    );
    if (ownBusiness.rows.length) {
      throw new HttpError(403, 'BID_ON_OWN_BUSINESS', 'You cannot bid on a route owned by a business you manage.');
    }
    const activeConflict = await client.query(
      `SELECT r.route_id, r.name, r.start_datetime, r.end_datetime
       FROM routes r JOIN drivers d ON d.driver_id = r.driver_id
       WHERE d.account_user_id = $1
         AND r.status IN ('assigned', 'accepted', 'in_progress')
         AND r.start_datetime < $3::timestamptz
         AND r.end_datetime > $2::timestamptz
       ORDER BY r.start_datetime LIMIT 1`,
      [req.user.user_id, listing.start_datetime, listing.end_datetime]
    );
    if (activeConflict.rows.length) {
      throw new HttpError(409, 'DRIVER_TIME_CONFLICT', 'You already have an assigned route that overlaps this time window.', {
        conflictingRoute: activeConflict.rows[0],
      });
    }
    const currency = normalizeCurrency(listing.cost_currency);
    const result = await client.query(
      `INSERT INTO route_bids (route_id, bidder_user_id, amount, currency, message, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (route_id, bidder_user_id) DO UPDATE
       SET amount = EXCLUDED.amount, currency = EXCLUDED.currency,
           message = EXCLUDED.message, status = 'pending', updated_at = NOW(),
           withdrawn_at = NULL, decided_at = NULL, decided_by_user_id = NULL
       WHERE route_bids.status IN ('pending', 'withdrawn', 'rejected', 'expired')
       RETURNING *`,
      [routeId, req.user.user_id, amount, currency, message]
    );
    if (!result.rows.length) throw new HttpError(409, 'BID_ALREADY_ACCEPTED', 'An accepted bid cannot be changed.');
    return result.rows[0];
  });
  return res.status(201).json({ success: true, bid: bidPayload(bid), message: 'Bid submitted. You can update or withdraw it until bidding closes.' });
};

const withdrawBid = async (req, res) => {
  assertIndependentDriver(req);
  const bidId = positiveInteger(req.params.bidId, 'bidId');
  const result = await runQuery(
    `UPDATE route_bids rb SET status = 'withdrawn', withdrawn_at = NOW(), updated_at = NOW()
     FROM routes r
     WHERE rb.bid_id = $1 AND rb.bidder_user_id = $2 AND rb.route_id = r.route_id
       AND rb.status = 'pending' AND r.marketplace_status = 'open'
       AND r.bidding_closes_at > NOW()
     RETURNING rb.*`,
    [bidId, req.user.user_id]
  );
  if (!result.rows.length) throw new HttpError(409, 'BID_NOT_WITHDRAWABLE', 'This bid can no longer be withdrawn.');
  return res.json({ success: true, bid: bidPayload(result.rows[0]), message: 'Bid withdrawn.' });
};

const listBusinessListings = async (req, res) => {
  await expireStartedListings();
  const result = await runQuery(
    `SELECT r.*, o.name AS organization_name,
            COUNT(rb.bid_id)::integer AS bid_count,
            COUNT(rb.bid_id) FILTER (WHERE rb.status = 'pending')::integer AS pending_bid_count
     FROM organization_memberships om
     JOIN organizations o ON o.organization_id = om.organization_id
     JOIN routes r ON r.organization_id = om.organization_id AND r.marketplace_status <> 'private'
     LEFT JOIN route_bids rb ON rb.route_id = r.route_id
     WHERE om.user_id = $1 AND om.status = 'active' AND om.role = ANY($2::text[])
     GROUP BY r.route_id, o.name
     ORDER BY CASE r.marketplace_status WHEN 'open' THEN 1 WHEN 'awarded' THEN 2 ELSE 3 END,
              r.start_datetime ASC
     LIMIT 250`,
    [req.user.user_id, BUSINESS_ROLES]
  );
  return res.json({ success: true, routes: result.rows.map(listingPayload) });
};

const listRouteBids = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  await expireStartedListings();
  await assertBusinessListingAccess({ query: runQuery }, routeId, req.user.user_id);
  const result = await runQuery(
    `SELECT rb.*, u.name AS driver_name, u.email AS driver_email,
            u.phone_no AS driver_phone, u.vehicle_type,
            stats.completed_routes, stats.cancelled_routes, stats.completion_rate
     FROM route_bids rb
     JOIN users u ON u.user_id = rb.bidder_user_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(DISTINCT r.route_id) FILTER (WHERE r.status = 'completed')::integer AS completed_routes,
         COUNT(DISTINCT r.route_id) FILTER (WHERE r.status = 'cancelled')::integer AS cancelled_routes,
         CASE WHEN COUNT(DISTINCT r.route_id) FILTER (WHERE r.status IN ('completed','failed','cancelled')) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(DISTINCT r.route_id) FILTER (WHERE r.status = 'completed')
                   / COUNT(DISTINCT r.route_id) FILTER (WHERE r.status IN ('completed','failed','cancelled')))::integer END AS completion_rate
       FROM routes r
       WHERE r.user_id = rb.bidder_user_id
          OR r.driver_id IN (
            SELECT d.driver_id FROM drivers d WHERE d.account_user_id = rb.bidder_user_id
          )
     ) stats ON TRUE
     WHERE rb.route_id = $1
     ORDER BY CASE rb.status WHEN 'pending' THEN 1 WHEN 'accepted' THEN 2 ELSE 3 END,
              rb.amount ASC, rb.created_at ASC`,
    [routeId]
  );
  return res.json({ success: true, bids: result.rows.map(bidPayload) });
};

const acceptBid = async (req, res) => {
  const bidId = positiveInteger(req.params.bidId, 'bidId');
  const accepted = await withTransaction(async (client) => {
    const bidLookup = await client.query(
      `SELECT route_id FROM route_bids WHERE bid_id = $1`,
      [bidId]
    );
    if (!bidLookup.rows.length) throw new HttpError(404, 'BID_NOT_FOUND', 'Bid not found.');
    const lockedRoute = await assertBusinessListingAccess(
      client,
      bidLookup.rows[0].route_id,
      req.user.user_id,
      { lock: true }
    );
    const bidResult = await client.query(
      `SELECT rb.*, u.name AS driver_name, u.email AS driver_email, u.phone_no AS driver_phone
       FROM route_bids rb
       JOIN users u ON u.user_id = rb.bidder_user_id
       WHERE rb.bid_id = $1 FOR UPDATE OF rb`,
      [bidId]
    );
    const bid = { ...lockedRoute, ...bidResult.rows[0] };
    if (bid.marketplace_status !== 'open' || bid.driver_id || bid.status !== 'pending' || !['draft', 'optimized'].includes(lockedRoute.status)) {
      throw new HttpError(409, 'LISTING_NOT_OPEN', 'This listing or bid is no longer available.');
    }
    if (new Date(bid.start_datetime).getTime() <= Date.now()) {
      throw new HttpError(409, 'ROUTE_ALREADY_STARTED', 'This route can no longer be awarded because its scheduled start time has passed.');
    }
    if (Number(bid.amount) > Number(bid.max_driver_cost)) {
      throw new HttpError(409, 'BID_OVER_BUDGET', 'This bid is above the current route budget.');
    }

    // All awards for one driver share a transaction-scoped lock. This closes
    // the race where two businesses accept overlapping bids at the same time.
    await client.query('SELECT pg_advisory_xact_lock($1)', [bid.bidder_user_id]);

    const conflict = await client.query(
      `SELECT r.route_id, r.name, r.start_datetime, r.end_datetime
       FROM routes r JOIN drivers d ON d.driver_id = r.driver_id
       WHERE d.account_user_id = $1
         AND r.route_id <> $2
         AND r.status IN ('assigned', 'accepted', 'in_progress')
         AND r.start_datetime < $4::timestamptz
         AND r.end_datetime > $3::timestamptz
       ORDER BY r.start_datetime LIMIT 1`,
      [bid.bidder_user_id, bid.route_id, bid.start_datetime, bid.end_datetime]
    );
    if (conflict.rows.length) {
      throw new HttpError(409, 'DRIVER_TIME_CONFLICT', 'This driver has already been awarded an overlapping route.', {
        conflictingRoute: conflict.rows[0],
      });
    }

    let driverResult = await client.query(
      `SELECT driver_id FROM drivers
       WHERE organization_id = $1 AND account_user_id = $2 AND removed_at IS NULL
       FOR UPDATE`,
      [bid.organization_id, bid.bidder_user_id]
    );
    if (!driverResult.rows.length) {
      driverResult = await client.query(
        `INSERT INTO drivers (
           user_id, organization_id, account_user_id,
           name, phone, email, is_active, permissions
         ) VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)
         RETURNING driver_id`,
        [
          req.user.user_id, bid.organization_id, bid.bidder_user_id,
          bid.driver_name, bid.driver_phone || null, bid.driver_email || null,
          DEFAULT_DRIVER_PERMISSIONS,
        ]
      );
    } else {
      await client.query(
        `UPDATE drivers SET is_active = TRUE, removed_at = NULL,
                            deactivated_at = NULL, updated_at = NOW()
         WHERE driver_id = $1`,
        [driverResult.rows[0].driver_id]
      );
    }

    const route = await assignRouteWithClient(client, {
      organizationId: Number(bid.organization_id),
      routeId: Number(bid.route_id),
      driverId: Number(driverResult.rows[0].driver_id),
      actorUserId: req.user.user_id,
      marketplaceBidId: bidId,
      auditMetadata: { marketplaceBidId: bidId, agreedCost: Number(bid.amount), currency: bid.cost_currency.trim() },
    });
    await client.query(
      `UPDATE route_bids
       SET status = CASE WHEN bid_id = $1 THEN 'accepted' ELSE 'rejected' END,
           decided_at = NOW(), decided_by_user_id = $2, updated_at = NOW()
       WHERE route_id = $3 AND status = 'pending'`,
      [bidId, req.user.user_id, bid.route_id]
    );
    await client.query(
      `UPDATE routes SET is_public = FALSE, marketplace_status = 'awarded',
                         marketplace_closed_at = NOW(), awarded_bid_id = $1,
                         awarded_cost = $2, updated_at = NOW()
       WHERE route_id = $3`,
      [bidId, bid.amount, bid.route_id]
    );
    return { bid, route };
  });
  return res.json({ success: true, routeId: Number(accepted.bid.route_id), bidId, message: 'Driver selected and route assigned.' });
};

const closeListing = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  await withTransaction(async (client) => {
    const route = await assertBusinessListingAccess(client, routeId, req.user.user_id, { lock: true });
    if (route.marketplace_status !== 'open') throw new HttpError(409, 'LISTING_NOT_OPEN', 'Only an open listing can be closed.');
    await client.query(
      `UPDATE routes SET is_public = FALSE, marketplace_status = 'withdrawn',
                         marketplace_closed_at = NOW(), updated_at = NOW()
       WHERE route_id = $1`,
      [routeId]
    );
    await client.query(
      `UPDATE route_bids SET status = 'expired', decided_at = NOW(),
                             decided_by_user_id = $1, updated_at = NOW()
       WHERE route_id = $2 AND status = 'pending'`,
      [req.user.user_id, routeId]
    );
  });
  return res.json({ success: true, message: 'Listing closed. The route remains unassigned.' });
};

// ==========================================
// Fleet Driver Pool & Opt-In Controller Methods
// ==========================================

const listFleetPoolRoutes = async (req, res) => {
  await expireStartedListings();
  const result = await runQuery(
    `SELECT r.*, o.name AS organization_name,
            counts.opt_in_count, counts.opt_out_count,
            mine.response AS my_response, mine.notes AS my_notes,
            mine.updated_at AS my_response_at
     FROM organizations o
     JOIN routes r ON r.organization_id = o.organization_id
     LEFT JOIN LATERAL (
       SELECT COUNT(*) FILTER (WHERE response = 'opt_in')::integer AS opt_in_count,
              COUNT(*) FILTER (WHERE response = 'opt_out')::integer AS opt_out_count
       FROM route_opt_ins WHERE route_id = r.route_id
     ) counts ON TRUE
     LEFT JOIN route_opt_ins mine ON mine.route_id = r.route_id AND mine.driver_user_id = $1
     WHERE (
       EXISTS (
         SELECT 1 FROM organization_memberships om
         WHERE om.organization_id = o.organization_id
           AND om.user_id = $1
           AND om.status = 'active'
       )
       OR EXISTS (
         SELECT 1 FROM drivers d
         WHERE d.organization_id = o.organization_id
           AND (
             d.account_user_id = $1
             OR (d.email IS NOT NULL AND LOWER(d.email) = (SELECT LOWER(email) FROM users WHERE user_id = $1))
           )
           AND d.is_active = TRUE
           AND d.removed_at IS NULL
       )
     )
       AND r.marketplace_status = 'open'
       AND r.marketplace_scope = 'fleet'
       AND r.status IN ('draft', 'optimized')
       AND r.driver_id IS NULL
       AND (r.end_datetime IS NULL OR r.end_datetime >= NOW() - INTERVAL '2 days')
     ORDER BY r.start_datetime ASC, r.created_at DESC
     LIMIT 250`,
    [req.user.user_id]
  );

  return res.json({
    success: true,
    routes: result.rows.map((row) => ({
      routeId: Number(row.route_id),
      organizationId: Number(row.organization_id),
      organizationName: row.organization_name,
      name: row.name,
      routeName: row.name,
      startAddress: row.start_full_address,
      endAddress: row.end_full_address,
      plannedStart: row.start_datetime,
      plannedEnd: row.end_datetime,
      optInDeadline: row.opt_in_deadline,
      marketplaceStatus: row.marketplace_status,
      optInCount: Number(row.opt_in_count || 0),
      optOutCount: Number(row.opt_out_count || 0),
      myResponse: row.my_response ? {
        response: row.my_response,
        notes: row.my_notes || null,
        respondedAt: row.my_response_at,
      } : null,
    })),
  });
};

const respondToFleetRoute = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const response = requireString(req.body.response, 'Response', { min: 6, max: 7 }).toLowerCase();
  if (!['opt_in', 'opt_out'].includes(response)) {
    throw new HttpError(400, 'INVALID_RESPONSE', 'Response must be either "opt_in" or "opt_out".');
  }
  const notes = req.body.notes ? requireString(req.body.notes, 'Notes', { min: 0, max: 500 }) : null;

  const optIn = await withTransaction(async (client) => {
    const routeResult = await client.query(
      `SELECT r.*, o.organization_id AS driver_org_id
       FROM routes r
       JOIN organizations o ON o.organization_id = r.organization_id
       WHERE r.route_id = $1
         AND (
           EXISTS (
             SELECT 1 FROM organization_memberships om
             WHERE om.organization_id = o.organization_id
               AND om.user_id = $2
               AND om.status = 'active'
           )
           OR EXISTS (
             SELECT 1 FROM drivers d
             WHERE d.organization_id = o.organization_id
               AND (
                 d.account_user_id = $2
                 OR (d.email IS NOT NULL AND LOWER(d.email) = (SELECT LOWER(email) FROM users WHERE user_id = $2))
               )
               AND d.is_active = TRUE
               AND d.removed_at IS NULL
           )
         )
       FOR UPDATE OF r`,
      [routeId, req.user.user_id]
    );
    const route = routeResult.rows[0];
    if (!route || route.marketplace_status !== 'open' || route.driver_id || !['draft', 'optimized'].includes(route.status)) {
      throw new HttpError(404, 'ROUTE_NOT_AVAILABLE', 'This route pool listing is no longer open.');
    }
    if (route.opt_in_deadline && new Date(route.opt_in_deadline).getTime() <= Date.now()) {
      throw new HttpError(409, 'DEADLINE_PASSED', 'The opt-in deadline for this route has passed.');
    }
    if (route.end_datetime && new Date(route.end_datetime).getTime() <= Date.now() - 86400000) {
      throw new HttpError(409, 'ROUTE_ALREADY_ENDED', 'This route has already ended.');
    }

    const upsertResult = await client.query(
      `INSERT INTO route_opt_ins (route_id, driver_user_id, organization_id, response, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (route_id, driver_user_id) DO UPDATE
       SET response = EXCLUDED.response, notes = EXCLUDED.notes, updated_at = NOW()
       RETURNING *`,
      [routeId, req.user.user_id, route.organization_id, response, notes]
    );

    return upsertResult.rows[0];
  });

  return res.json({
    success: true,
    message: response === 'opt_in' ? 'You have opted in for this route.' : 'You have opted out of this route.',
    optIn: {
      optInId: Number(optIn.opt_in_id),
      routeId: Number(optIn.route_id),
      response: optIn.response,
      notes: optIn.notes,
      updatedAt: optIn.updated_at,
    },
  });
};

const listBusinessFleetListings = async (req, res) => {
  await expireStartedListings();
  const result = await runQuery(
    `SELECT r.*, o.name AS organization_name,
            u.name AS awarded_driver_name,
            counts.opt_in_count, counts.opt_out_count
     FROM organization_memberships om
     JOIN organizations o ON o.organization_id = om.organization_id
     JOIN routes r ON r.organization_id = om.organization_id AND r.marketplace_status <> 'private' AND r.marketplace_scope = 'fleet'
     LEFT JOIN users u ON u.user_id = r.awarded_driver_id
     LEFT JOIN LATERAL (
       SELECT COUNT(*) FILTER (WHERE response = 'opt_in')::integer AS opt_in_count,
              COUNT(*) FILTER (WHERE response = 'opt_out')::integer AS opt_out_count
       FROM route_opt_ins WHERE route_id = r.route_id
     ) counts ON TRUE
     WHERE om.user_id = $1 AND om.status = 'active' AND om.role = ANY($2::text[])
     ORDER BY CASE r.marketplace_status WHEN 'open' THEN 1 WHEN 'awarded' THEN 2 ELSE 3 END,
              r.start_datetime ASC
     LIMIT 250`,
    [req.user.user_id, BUSINESS_ROLES]
  );

  return res.json({
    success: true,
    routes: result.rows.map((row) => ({
      routeId: Number(row.route_id),
      organizationName: row.organization_name,
      name: row.name,
      startAddress: row.start_full_address,
      endAddress: row.end_full_address,
      plannedStart: row.start_datetime,
      plannedEnd: row.end_datetime,
      optInDeadline: row.opt_in_deadline,
      marketplaceStatus: row.marketplace_status,
      optInCount: Number(row.opt_in_count || 0),
      optOutCount: Number(row.opt_out_count || 0),
      awardedDriverName: row.awarded_driver_name || null,
      driverId: row.driver_id ? Number(row.driver_id) : null,
    })),
  });
};

const listRouteOptIns = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  await expireStartedListings();
  await assertBusinessListingAccess({ query: runQuery }, routeId, req.user.user_id);

  const result = await runQuery(
    `SELECT roi.*, u.name AS driver_name, u.email AS driver_email, u.phone_no AS driver_phone,
            d.driver_id, d.is_active AS driver_is_active,
            stats.completed_routes, stats.active_routes
     FROM route_opt_ins roi
     JOIN users u ON u.user_id = roi.driver_user_id
     LEFT JOIN drivers d ON d.account_user_id = roi.driver_user_id AND d.organization_id = roi.organization_id
     LEFT JOIN LATERAL (
       SELECT
         COUNT(DISTINCT r.route_id) FILTER (WHERE r.status = 'completed')::integer AS completed_routes,
         COUNT(DISTINCT r.route_id) FILTER (WHERE r.status IN ('assigned', 'accepted', 'in_progress'))::integer AS active_routes
       FROM routes r
       WHERE r.driver_id = d.driver_id
     ) stats ON TRUE
     WHERE roi.route_id = $1
     ORDER BY CASE roi.response WHEN 'opt_in' THEN 1 ELSE 2 END,
              roi.is_selected DESC, roi.created_at ASC`,
    [routeId]
  );

  return res.json({
    success: true,
    optIns: result.rows.map((row) => ({
      optInId: Number(row.opt_in_id),
      routeId: Number(row.route_id),
      driverUserId: Number(row.driver_user_id),
      driverId: row.driver_id ? Number(row.driver_id) : null,
      driverName: row.driver_name,
      driverEmail: row.driver_email,
      driverPhone: row.driver_phone,
      response: row.response,
      notes: row.notes,
      isSelected: Boolean(row.is_selected),
      completedRoutes: Number(row.completed_routes || 0),
      activeRoutes: Number(row.active_routes || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
};

const selectDriverForRoute = async (req, res) => {
  const routeId = positiveInteger(req.params.routeId, 'routeId');
  const driverUserId = positiveInteger(req.body.driverUserId, 'driverUserId');

  const selected = await withTransaction(async (client) => {
    const lockedRoute = await assertBusinessListingAccess(
      client,
      routeId,
      req.user.user_id,
      { lock: true }
    );

    if (lockedRoute.marketplace_status !== 'open' || lockedRoute.driver_id || !['draft', 'optimized'].includes(lockedRoute.status)) {
      throw new HttpError(409, 'LISTING_NOT_OPEN', 'This route pool listing is no longer open.');
    }

    if (new Date(lockedRoute.start_datetime).getTime() <= Date.now()) {
      throw new HttpError(409, 'ROUTE_ALREADY_STARTED', 'This route cannot be assigned because its start time has passed.');
    }

    // Verify the driver belongs to the organization
    const memberResult = await client.query(
      `SELECT om.*, u.name, u.email, u.phone_no
       FROM organization_memberships om
       JOIN users u ON u.user_id = om.user_id
       WHERE om.organization_id = $1 AND om.user_id = $2 AND om.status = 'active' AND om.role = 'driver'`,
      [lockedRoute.organization_id, driverUserId]
    );
    if (!memberResult.rows.length) {
      throw new HttpError(404, 'DRIVER_NOT_IN_FLEET', 'The selected driver is not an active fleet driver in your organization.');
    }

    // Find or create driver profile in drivers table
    let driverResult = await client.query(
      `SELECT * FROM drivers
       WHERE organization_id = $1 AND account_user_id = $2 AND removed_at IS NULL
       FOR UPDATE`,
      [lockedRoute.organization_id, driverUserId]
    );

    if (!driverResult.rows.length) {
      const member = memberResult.rows[0];
      driverResult = await client.query(
        `INSERT INTO drivers (
           organization_id, membership_id, account_user_id,
           name, email, phone, is_active, permissions,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7::jsonb, NOW(), NOW())
         RETURNING *`,
        [
          lockedRoute.organization_id,
          member.membership_id,
          driverUserId,
          member.name,
          member.email,
          member.phone_no,
          JSON.stringify(DEFAULT_DRIVER_PERMISSIONS),
        ]
      );
    } else {
      await client.query(
        `UPDATE drivers SET is_active = TRUE, removed_at = NULL, deactivated_at = NULL, updated_at = NOW()
         WHERE driver_id = $1`,
        [driverResult.rows[0].driver_id]
      );
    }

    const assignedDriverId = Number(driverResult.rows[0].driver_id);

    const route = await assignRouteWithClient(client, {
      organizationId: Number(lockedRoute.organization_id),
      routeId: Number(routeId),
      driverId: assignedDriverId,
      actorUserId: req.user.user_id,
      allowPoolSelection: true,
      auditMetadata: { poolSelection: true, selectedDriverUserId: driverUserId },
    });

    await client.query(
      `UPDATE route_opt_ins
       SET is_selected = (driver_user_id = $1), updated_at = NOW()
       WHERE route_id = $2`,
      [driverUserId, routeId]
    );

    await client.query(
      `UPDATE routes
       SET marketplace_status = 'awarded', awarded_driver_id = $1,
           marketplace_closed_at = NOW(), updated_at = NOW()
       WHERE route_id = $2`,
      [driverUserId, routeId]
    );

    return { route, driverName: memberResult.rows[0].name };
  });

  return res.json({
    success: true,
    routeId,
    driverUserId,
    driverName: selected.driverName,
    message: `${selected.driverName} has been assigned to the route.`,
  });
};

module.exports = {
  acceptBid,
  closeListing,
  getSummary,
  listAvailableRoutes,
  listBusinessListings,
  listMyBids,
  listRouteBids,
  placeBid,
  withdrawBid,
  listFleetPoolRoutes,
  respondToFleetRoute,
  listBusinessFleetListings,
  listRouteOptIns,
  selectDriverForRoute,
};

