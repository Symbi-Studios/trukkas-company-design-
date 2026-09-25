// Seeded credentials for the mock-gated login flow (see store/features/auth/authApi.js).
// No live auth endpoint is wired yet — see AGENTS.md before changing that.
export const MOCK_CREDENTIALS = {
  email: 'admin@speedlinelogistics.com',
  password: 'trukkas123',
};

export const account = {
  id: 'ACCT-0001',
  name: 'SpeedLine Admin',
  email: MOCK_CREDENTIALS.email,
  phone: '+234 803 555 0142',
  role: 'Company Admin',
  companyIds: ['CMP-SPEEDLINE'],
};
