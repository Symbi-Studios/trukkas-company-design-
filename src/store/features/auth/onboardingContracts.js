const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const fleetSizes = {
  '1–5 trucks': '1-5', '6–20 trucks': '6-20', '21–50 trucks': '21-50',
  '51–100 trucks': '51-100', '100+ trucks': '100+',
};

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
    // The API stores states; the screen's zone chips cannot represent them.
    // Keep those values separately and never clear them when resuming setup.
    operatingStates: Array.isArray(company?.operatingRegions) ? company.operatingRegions.filter((value) => text(value)) : null,
    regions: [],
  };
}

export function companyFormBody(form) {
  if (!text(form.name) || !text(form.rcNumber) || !text(form.address) || !text(form.state)) {
    throw new Error('Company name, RC/BN number, address and state are required.');
  }
  if (!text(form.directorName) || !/^\d{4}-\d{2}-\d{2}$/.test(form.directorDob ?? '')) {
    throw new Error('Enter the director’s full name and date of birth.');
  }
  const birth = new Date(`${form.directorDob}T00:00:00Z`);
  const adult = new Date();
  adult.setUTCFullYear(adult.getUTCFullYear() - 18);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== form.directorDob || birth > adult) {
    throw new Error('The director must be at least 18 years old.');
  }
  if (form.directorName.trim().length > 120 || (form.role ?? '').length > 80) throw new Error('The director’s name or role is too long.');
  if (form.regions?.length) {
    throw new Error('Operating zones and ECOWAS are not supported yet. Clear those selections to save the other company details.');
  }
  const body = {
    businessName: form.name.trim(), cacNumber: form.rcNumber.trim(),
    businessAddress: form.address.trim(), state: form.state,
    directorName: form.directorName.trim(), directorDateOfBirth: form.directorDob,
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
