const express = require('express');
const {
  upload,
  resolveAddressText,
  scanAddressImage,
  scanRouteManifestImage,
  importRouteManifest,
} = require('../controllers/routeManifestController');

const router = express.Router();

router.post('/address/resolve', resolveAddressText);
router.post('/address/scan', upload.single('image'), scanAddressImage);
router.post('/manifest/scan', upload.single('image'), scanRouteManifestImage);
router.post('/manifest/import', upload.single('file'), importRouteManifest);

module.exports = router;