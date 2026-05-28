module.exports = {
    PROJECT_NAME: process.env.PROJECT_NAME,
    PORT: process.env.PORT || 5000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'access_secret_key',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh_secret_key',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};