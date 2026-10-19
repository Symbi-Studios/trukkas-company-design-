const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const fleetSizes = {
  '1–5 trucks': '1-5', '6–20 trucks': '6-20', '21–50 trucks': '21-50',
  '51–100 trucks': '51-100', '100+ trucks': '100+',
};
const operatingZones = {
  'South West': 'SOUTH_WEST', 'South South': 'SOUTH_SOUTH', 'South East': 'SOUTH_EAST',
  'North Central': 'NORTH_CENTRAL', 'North West': 'NORTH_WEST', 'North East': 'NORTH_EAST',
  'Cross-border (ECOWAS)': 'ECOWAS',
};

export function isAdultDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birth = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  const cutoff = Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate());
  return Number.isFinite(birth.getTime()) && birth.toISOString().slice(0, 10) === value && birth.getTime() <= cutoff;
}

export function companyFormView(user, companyProfile) {
  const company = companyProfile ?? user?.companyProfile;
  const founded = company?.yearFounded;
  return {
    name: text(user?.businessName) ?? '', rcNumber: text(user?.cacNumber) ?? '',
    entity: text(user?.businessType) ?? '', address: text(user?.businessAddress) ?? '',
    founded: Number.isInteger(founded) && founded >= 1900 ? String(founded) : '',
    state: text(company?.state) ?? '',
    fleetSize: Object.entries(fleetSizes).find(([, value]) => value === company?.fleetSizeRange)?.[0] ?? '',
    email: text(company?.companyEmail) ?? '', phone: text(company?.companyPhone) ?? '',
    directorName: text(company?.director?.name) ?? '',
    directorDob: text(company?.director?.dateOfBirth)?.slice(0, 10) ?? '',
    role: text(company?.director?.role) ?? '',
    // Preserve state selections separately from the existing zone chips.
    operatingStates: Array.isArray(company?.operatingRegions) ? company.operatingRegions.filter((value) => text(value)) : null,
    operatingZonesKnown: Array.isArray(company?.operatingZones),
    regions: Array.isArray(company?.operatingZones)
      ? Object.entries(operatingZones).filter(([, value]) => company.operatingZones.includes(value)).map(([label]) => label) : [],
  };
}

export function companyFormBody(form) {
  if (!text(form.name) || !text(form.rcNumber) || !text(form.address) || !text(form.state)) {
    throw new Error('Company name, RC/BN number, address and state are required.');
  }
  if (!text(form.directorName) || !/^\d{4}-\d{2}-\d{2}$/.test(form.directorDob ?? '')) {
    throw new Error('Enter the director’s full name and date of birth.');
  }
  if (!isAdultDate(form.directorDob)) {
    throw new Error('The director must be at least 18 years old.');
  }
  if (form.directorName.trim().length > 120 || (form.role ?? '').length > 80) throw new Error('The director’s name or role is too long.');
  if (!Array.isArray(form.regions) || form.regions.some((region) => !Object.hasOwn(operatingZones, region))) {
    throw new Error('Choose supported operating areas.');
  }
  const body = {
    businessName: form.name.trim(), cacNumber: form.rcNumber.trim(),
    businessAddress: form.address.trim(), state: form.state,
    directorName: form.directorName.trim(), directorDateOfBirth: form.directorDob,
    ...(form.operatingZonesKnown !== false || form.regions.length > 0
      ? { operatingZones: [...new Set(form.regions.map((region) => operatingZones[region]))] } : {}),
    ...(text(form.role) ? { directorRole: form.role.trim() } : {}),
  };
  if (text(form.founded)) {
    const year = Number(form.founded);
    if (!/^\d{4}$/.test(form.founded) || !Number.isInteger(year) || year < 1900 || year > new Date().getUTCFullYear()) {
      throw new Error('Enter a year founded between 1900 and this year.');
    }
    body.yearFounded = year;
  }
  if (text(form.fleetSize)) {
    if (!Object.hasOwn(fleetSizes, form.fleetSize)) throw new Error('Choose a supported fleet size.');
    body.fleetSizeRange = fleetSizes[form.fleetSize];
  }
  if (text(form.email)) {
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) throw new Error('Enter a valid company email.');
    body.companyEmail = form.email.trim();
  }
  if (text(form.phone)) body.companyPhone = form.phone.replace(/\s/g, '');
  if (Array.isArray(form.operatingStates)) body.operatingRegions = form.operatingStates;
  return body;
}
