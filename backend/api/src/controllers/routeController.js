const { runQuery } = require('../config/db');

// @desc    Create new route
// @route   POST /route/create
// @access  Private
const createRoute = async (req, res) => {
  const { name, start_location, end_location, start_datetime, end_datetime } = req.body;
  const user_id = req.user?.user_id; // Match the column name in users.sql

  if (!user_id) {
    return res.status(401).json({ message: 'User authentication failed' });
  }

  if (!name || !start_location || !end_location || !start_datetime || !end_datetime) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }

  try {
    const insertQuery = `
      INSERT INTO routes (name, start_location, end_location, start_datetime, end_datetime, user_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await runQuery(insertQuery, [
      name, 
      start_location, 
      end_location, 
      start_datetime, 
      end_datetime, 
      user_id, 
      'active'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create Route Error:', error);
    res.status(500).json({ message: 'Server error during route creation' });
  }
};

// @desc    Fetch all routes for current user
// @route   GET /route/fetch/all
// @access  Private
const fetchAllRoutes = async (req, res) => {
  const user_id = req.user?.user_id;

  try {
    const result = await runQuery('SELECT * FROM routes WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching routes' });
  }
};

// @desc    Fetch specific route by ID
// @route   GET /route/fetch?id=...
// @access  Private
const fetchRouteById = async (req, res) => {
  const { id } = req.query;
  const user_id = req.user?.user_id;

  if (!id) return res.status(400).json({ message: 'Route ID is required in query parameters' });

  try {
    const result = await runQuery('SELECT * FROM routes WHERE route_id = $1 AND user_id = $2', [id, user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found or unauthorized' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching route' });
  }
};

// @desc    Edit route
// @route   PUT /route/edit
// @access  Private
const editRoute = async (req, res) => {
  const { route_id, name, start_location, end_location, start_datetime, end_datetime, status } = req.body;
  const user_id = req.user?.user_id;

  if (!user_id) {
    return res.status(401).json({ message: 'User authentication failed' });
  }

  if (!route_id) return res.status(400).json({ message: 'Route ID is required' });

  try {
    const updateQuery = `
      UPDATE routes 
      SET name = COALESCE($1, name), 
          start_location = COALESCE($2, start_location), 
          end_location = COALESCE($3, end_location), 
          start_datetime = COALESCE($4, start_datetime), 
          end_datetime = COALESCE($5, end_datetime),
          status = COALESCE($6, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE route_id = $7 AND user_id = $8
      RETURNING *
    `;
    
    const result = await runQuery(updateQuery, [name, start_location, end_location, start_datetime, end_datetime, status, route_id, user_id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Route not found or unauthorized' });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating route' });
  }
};

module.exports = { createRoute, fetchAllRoutes, fetchRouteById, editRoute };