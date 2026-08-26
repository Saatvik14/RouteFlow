const INDIA_ALLOWED_EMAILS = [
  'vai@gmail.com',
  'saatvikrawat8921@gmail.com',
];

const isIndiaAllowedUser = (email) => {
  if (!email) return false;
  return INDIA_ALLOWED_EMAILS.includes(String(email).toLowerCase().trim());
};

const isUkAddress = (loc) => {
  if (!loc) return true;
  const countryCode = (
    loc.countryCode ||
    loc.country_code ||
    loc.isoCountryCode ||
    ''
  ).toLowerCase();
  const countryName = (loc.country || '').toLowerCase();
  const fullAddress = (
    loc.full_address ||
    loc.address ||
    ''
  ).toLowerCase();

  return (
    countryCode === 'gb' ||
    countryCode === 'uk' ||
    countryName.includes('united kingdom') ||
    countryName === 'uk' ||
    countryName === 'great britain' ||
    fullAddress.includes('united kingdom') ||
    fullAddress.includes('great britain') ||
    fullAddress.includes(', uk') ||
    fullAddress.includes(', gb')
  );
};

const isIndiaAddress = (loc) => {
  if (!loc) return false;
  const countryCode = (
    loc.countryCode ||
    loc.country_code ||
    loc.isoCountryCode ||
    ''
  ).toLowerCase();
  const countryName = (loc.country || '').toLowerCase();
  const fullAddress = (
    loc.full_address ||
    loc.address ||
    ''
  ).toLowerCase();

  return (
    countryCode === 'in' ||
    countryName.includes('india') ||
    countryName === 'in' ||
    fullAddress.includes('india') ||
    fullAddress.includes(', in')
  );
};

const isAllowedAddress = (loc, userEmail) => {
  if (!loc) return true;
  if (isUkAddress(loc)) return true;
  if (isIndiaAllowedUser(userEmail) && isIndiaAddress(loc)) return true;
  return false;
};

const getCountryCodeFilter = (userEmail) => {
  return isIndiaAllowedUser(userEmail) ? 'countrycode:gb,in' : 'countrycode:gb';
};

const getAllowedCountryCodes = (userEmail) => {
  return isIndiaAllowedUser(userEmail) ? ['GB', 'IN'] : ['GB'];
};

module.exports = {
  INDIA_ALLOWED_EMAILS,
  isIndiaAllowedUser,
  isUkAddress,
  isIndiaAddress,
  isAllowedAddress,
  getAllowedCountryCodes,
  getCountryCodeFilter,
};
