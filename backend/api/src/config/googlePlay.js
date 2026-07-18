const { google } = require("googleapis");

let androidPublisherClient = null;

function parseServiceAccountCredentials() {
  let rawCredentials = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  if (!rawCredentials) {
    return undefined;
  }

  // Strip wrapping single or double quotes if present
  rawCredentials = rawCredentials.trim();
  if (
    (rawCredentials.startsWith("'") && rawCredentials.endsWith("'")) ||
    (rawCredentials.startsWith('"') && rawCredentials.endsWith('"'))
  ) {
    rawCredentials = rawCredentials.slice(1, -1).trim();
  }

  const credentials = JSON.parse(rawCredentials);

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  return credentials;
}

function getAndroidPublisherClient() {
  if (androidPublisherClient) {
    return androidPublisherClient;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: parseServiceAccountCredentials(),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  androidPublisherClient = google.androidpublisher({
    version: "v3",
    auth,
  });

  return androidPublisherClient;
}

module.exports = {
  getAndroidPublisherClient,
};
