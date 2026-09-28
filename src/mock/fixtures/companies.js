// `myCompany` is the trucking company the signed-in account manages.
// `posters` are the forwarders/exporters who post job requests onto the
// marketplace — shown as "Posted by" / "Requested By" on jobs, never editable here.
export const myCompany = {
  id: 'CMP-SPEEDLINE',
  name: 'SpeedLine Logistics Limited',
  shortName: 'SpeedLine',
  industry: 'Haulage & Freight',
  rcNumber: 'RC 1483920',
  email: 'ops@speedlinelogistics.com',
  phone: '+234 803 555 0142',
  address: '14 Apapa–Oshodi Expressway, Lagos, Nigeria',
  founded: '2016',
  verification: 'Verified',
  rating: 4.7,
  reviewCount: 128,
  walletBalance: 2_450_000,
  logoTone: 'var(--tk-navy)',
  // The director who operates the account ("front person") for KYB checks.
  frontPerson: { name: 'Adekunle Adebayo', role: 'Managing Director', email: 'adekunle@speedlinelogistics.com', phone: '+234 803 555 0142' },
};

export const posters = [
  { id: 'ORG-BRIGHTWAY', name: 'Brightway Logistics Ltd', verified: true, rating: 4.8, jobsPosted: 36 },
  { id: 'ORG-WESTLINE', name: 'Westline Exports Ltd', verified: true, rating: 4.6, jobsPosted: 21 },
  { id: 'ORG-KANOGLOBAL', name: 'Kano Global Services', verified: true, rating: 4.5, jobsPosted: 14 },
  { id: 'ORG-OCEANIC', name: 'Oceanic Supplies Ltd', verified: true, rating: 4.9, jobsPosted: 52 },
  { id: 'ORG-ABARETAIL', name: 'Aba Retail Stores', verified: false, rating: 4.2, jobsPosted: 8 },
];
