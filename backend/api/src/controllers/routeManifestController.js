const multer = require('multer');
const xlsx = require('xlsx');
const Tesseract = require('tesseract.js');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

const normalizeGeoapifyResult = result => {
  if (!result) return null;

  const address =
    result.formatted ||
    result.address_line1 ||
    [result.name, result.street, result.city, result.postcode, result.country]
      .filter(Boolean)
      .join(', ');

  if (!address || result.lat === undefined || result.lon === undefined) {
    return null;
  }

  return {
    title: result.name || result.address_line1 || address.split(',')[0],
    address,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    location: {
      mode: 'manual_address',
      address,
      selectedFromSuggestion: true,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      details: {
        placeId: result.place_id || '',
        housenumber: result.housenumber || '',
        street: result.street || result.address_line1 || '',
        addressLine1: result.address_line1 || result.street || '',
        addressLine2: result.address_line2 || '',
        city: result.city || result.county || '',
        district: result.district || result.county || '',
        state: result.state || '',
        country: result.country || '',
        countryCode: result.country_code || '',
        postalCode: result.postcode || '',
        latitude: Number(result.lat),
        longitude: Number(result.lon),
      },
    },
  };
};

const geocodeText = async text => {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    throw new Error('GEOAPIFY_API_KEY is missing');
  }

  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.searchParams.append('text', text);
  url.searchParams.append('limit', '5');
  url.searchParams.append('format', 'json');
  url.searchParams.append('apiKey', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  return (data.results || [])
    .map(normalizeGeoapifyResult)
    .filter(Boolean);
};

const cleanOcrText = text => {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
};

const getBestAddressCandidates = text => {
  const cleaned = cleanOcrText(text);

  const lines = cleaned
    .split(/\n|(?=Order\s*ID)|(?=Customer)|(?=Address)/i)
    .map(line => line.trim())
    .filter(Boolean);

  const candidates = [];

  for (const line of lines) {
    const looksLikeAddress =
      /\d/.test(line) &&
      /(road|rd|street|st|lane|ln|sector|nagar|colony|apartment|apt|house|h\.?no|pin|postcode|zip|city|uttar|delhi|mumbai|muzaffarnagar|india)/i.test(line);

    if (looksLikeAddress) {
      candidates.push(line);
    }
  }

  if (candidates.length === 0 && cleaned.length > 10) {
    candidates.push(cleaned);
  }

  return [...new Set(candidates)].slice(0, 10);
};

const parseManifestRowsFromText = text => {
  const cleaned = cleanOcrText(text);

  return cleaned
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 12)
    .map((line, index) => ({
      row_no: index + 1,
      customer_name: '',
      phone: '',
      address: line,
      notes: '',
      packages: 1,
      raw: { ocr_line: line },
    }));
};

const extractAddressFromRow = row => {
  return (
    row.address ||
    row.full_address ||
    row.delivery_address ||
    row.customer_address ||
    row['Delivery Address'] ||
    row['Full Address'] ||
    row['Address'] ||
    ''
  ).toString().trim();
};

const normalizeManifestRow = (row, index) => {
  const address = extractAddressFromRow(row);

  return {
    row_no: index + 1,
    customer_name:
      row.customer_name ||
      row.name ||
      row.customer ||
      row['Customer Name'] ||
      row['Name'] ||
      '',
    phone:
      row.phone ||
      row.mobile ||
      row.contact ||
      row['Phone'] ||
      row['Mobile'] ||
      '',
    address,
    notes: row.notes || row.remark || row.remarks || row['Notes'] || '',
    packages: Number(row.packages || row.package_count || row.qty || 1),
    raw: row,
  };
};

const resolveRows = async rows => {
  const resolved = [];

  for (const row of rows) {
    if (!row.address) {
      resolved.push({
        ...row,
        valid: false,
        error: 'Address missing',
      });
      continue;
    }

    try {
      const suggestions = await geocodeText(row.address);
      const best = suggestions[0];

      if (!best) {
        resolved.push({
          ...row,
          valid: false,
          error: 'Address could not be geocoded',
        });
        continue;
      }

      resolved.push({
        ...row,
        valid: true,
        title: row.customer_name || best.title,
        address: best.address,
        latitude: best.latitude,
        longitude: best.longitude,
        location: best.location,
      });
    } catch (error) {
      resolved.push({
        ...row,
        valid: false,
        error: error.message || 'Geocoding failed',
      });
    }
  }

  return resolved;
};

// POST /route/address/resolve
const resolveAddressText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 3) {
      return res.status(400).json({ message: 'Address text is required' });
    }

    const suggestions = await geocodeText(text.trim());

    res.status(200).json({
      input: text,
      suggestions,
    });
  } catch (error) {
    console.error('Resolve Address Text Error:', error);
    res.status(500).json({ message: error.message || 'Failed to resolve address' });
  }
};

// POST /route/address/scan
const scanAddressImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const result = await Tesseract.recognize(req.file.buffer, 'eng');
    const ocrText = cleanOcrText(result.data.text);
    const candidates = getBestAddressCandidates(ocrText);

    const suggestions = [];

    for (const candidate of candidates) {
      const matches = await geocodeText(candidate);
      suggestions.push(...matches);
    }

    res.status(200).json({
      ocrText,
      candidates,
      suggestions: suggestions.slice(0, 5),
    });
  } catch (error) {
    console.error('Scan Address Error:', error);
    res.status(500).json({ message: error.message || 'Address scan failed' });
  }
};

// POST /route/manifest/scan
const scanRouteManifestImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Manifest image is required' });
    }

    const result = await Tesseract.recognize(req.file.buffer, 'eng');
    const ocrText = cleanOcrText(result.data.text);
    const rows = parseManifestRowsFromText(ocrText);
    const resolvedRows = await resolveRows(rows);

    res.status(200).json({
      ocrText,
      total: resolvedRows.length,
      valid: resolvedRows.filter(row => row.valid).length,
      invalid: resolvedRows.filter(row => !row.valid).length,
      rows: resolvedRows,
    });
  } catch (error) {
    console.error('Scan Route Manifest Error:', error);
    res.status(500).json({ message: error.message || 'Manifest scan failed' });
  }
};

// POST /route/manifest/import
const importRouteManifest = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Manifest file is required' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({ message: 'No sheet found in manifest' });
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const rows = jsonRows
      .map(normalizeManifestRow)
      .filter(row => row.address);

    const resolvedRows = await resolveRows(rows);

    res.status(200).json({
      total: resolvedRows.length,
      valid: resolvedRows.filter(row => row.valid).length,
      invalid: resolvedRows.filter(row => !row.valid).length,
      rows: resolvedRows,
    });
  } catch (error) {
    console.error('Import Route Manifest Error:', error);
    res.status(500).json({ message: error.message || 'Manifest import failed' });
  }
};

module.exports = {
  upload,
  resolveAddressText,
  scanAddressImage,
  scanRouteManifestImage,
  importRouteManifest,
};