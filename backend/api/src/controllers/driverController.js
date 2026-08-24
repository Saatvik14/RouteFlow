const { runQuery } = require('../config/db');
const invitationController = require('./invitationController');
const teamController = require('./teamController');

// Legacy driver endpoints are retained for older clients, but now use the
// organization model and the secure invitation workflow.
const fetchAllDrivers = async (req, res) => {
  const result = await runQuery(
    `SELECT
       d.driver_id, d.user_id, d.account_user_id, d.organization_id,
       d.name, d.phone, d.email, d.is_active, d.permissions,
       d.created_at, d.updated_at
     FROM drivers d
     WHERE d.organization_id = $1 AND d.removed_at IS NULL
     ORDER BY d.is_active DESC, d.name ASC`,
    [req.organization.id]
  );
  return res.json(result.rows);
};

const createDriver = async (req, res, next) => {
  req.body.role = 'driver';
  return invitationController.createInvitation(req, res, next);
};

const editDriver = async (req, res, next) => {
  req.params.driverId = String(req.body.driver_id || '');
  req.body.active = req.body.is_active;
  return teamController.updateDriver(req, res, next);
};

const deleteDriver = async (req, res, next) => {
  req.params.driverId = String(req.query.driver_id || '');
  return teamController.removeDriver(req, res, next);
};

module.exports = { fetchAllDrivers, createDriver, editDriver, deleteDriver };
