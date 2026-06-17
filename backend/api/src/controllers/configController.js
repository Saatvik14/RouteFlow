const { runQuery } = require('../config/db');

// Helper functions to generate tokens
// Helper function to fetch user configurations
const fetchConfigurations = async (req, res) => {
  const user_id = req.user?.user_id;
  try {
    // Ensure every user has one config row
    await runQuery(
      `
      INSERT INTO config_model (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [user_id]
    );

    const result = await runQuery(
      `
      SELECT
        cm.config_id,
        cm.user_id,

        cm.default_start_address AS default_start_address_id,
        start_location.name AS default_start_address_name,
        start_location.full_address AS default_start_address_full_address,
        start_location.latitude AS default_start_address_latitude,
        start_location.longitude AS default_start_address_longitude,

        cm.default_end_address AS default_end_address_id,
        end_location.name AS default_end_address_name,
        end_location.full_address AS default_end_address_full_address,
        end_location.latitude AS default_end_address_latitude,
        end_location.longitude AS default_end_address_longitude,

        cm.break_time,
        cm.created_at,
        cm.updated_at

      FROM config_model cm

      LEFT JOIN locations start_location
        ON start_location.location_id = cm.default_start_address

      LEFT JOIN locations end_location
        ON end_location.location_id = cm.default_end_address

      WHERE cm.user_id = $1
      LIMIT 1
      `,
      [user_id]
    );

    const config = result.rows[0];

    return res.status(200).json({
      success: true,
      message: "Configurations fetched successfully",
      data: {
        configId: config.config_id,
        userId: config.user_id,

        defaultStartAddress: config.default_start_address_id
          ? {
              locationId: config.default_start_address_id,
              name: config.default_start_address_name,
              fullAddress: config.default_start_address_full_address,
              latitude: config.default_start_address_latitude,
              longitude: config.default_start_address_longitude,
            }
          : null,

        defaultEndAddress: config.default_end_address_id
          ? {
              locationId: config.default_end_address_id,
              name: config.default_end_address_name,
              fullAddress: config.default_end_address_full_address,
              latitude: config.default_end_address_latitude,
              longitude: config.default_end_address_longitude,
            }
          : null,

        breakTime: config.break_time,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching configurations:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch configurations",
      error: error.message,
    });
  }
};

module.exports = {
  fetchConfigurations,
};