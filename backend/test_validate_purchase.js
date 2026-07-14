const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getGoogleSubscription } = require('./api/src/services/googlePlaySubscriptionServices');

const productId = process.argv[2];
const purchaseToken = process.argv[3];

if (!productId || !purchaseToken) {
  console.log('\nUsage: node test_validate_purchase.js <productId> <purchaseToken>');
  console.log('Example: node test_validate_purchase.js routeflow_standard_monthly GPA.3364-xxxx-xxxx-xxxxx\n');
  
  console.log('Current configuration check:');
  console.log('- GOOGLE_PLAY_PACKAGE_NAME:', process.env.GOOGLE_PLAY_PACKAGE_NAME || '❌ NOT CONFIGURED');
  console.log('- GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ? '✅ CONFIGURED' : '❌ NOT CONFIGURED');
  process.exit(1);
}

async function run() {
  console.log(`\nVerifying subscription product: ${productId}`);
  console.log(`Purchase Token: ${purchaseToken}\n`);
  
  try {
    const result = await getGoogleSubscription({ purchaseToken, expectedProductId: productId });
    console.log('=== VERIFICATION RESULT ===');
    console.log('Active Status:', result.active ? '✅ ACTIVE' : '❌ INACTIVE');
    console.log('Product ID:', result.productId);
    console.log('Started At:', result.startedAt);
    console.log('Expires At:', result.expiresAt);
    console.log('Subscription State:', result.status);
    console.log('Auto Renewing:', result.autoRenew);
    console.log('Latest Order ID:', result.latestOrderId);
    console.log('===========================\n');
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    if (error.statusCode) {
      console.log('Status Code:', error.statusCode);
    }
  }
}

run();
