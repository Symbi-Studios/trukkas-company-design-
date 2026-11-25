// Seeded credentials for the mock-gated login flow (see store/features/auth/authApi.js).
// No live auth endpoint is wired yet — see AGENTS.md before changing that.
export const MOCK_CREDENTIALS = {
  email: 'admin@speedlinelogistics.com',
  password: 'trukkas123',
};

// Example email pre-filled on the sign-up form so new-joiner demos start fast.
export const SIGNUP_DEMO_EMAIL = 'deecaulcrick@gmail.com';

export const account = {
  id: 'ACCT-0001',
  name: 'Adekunle Adebayo',
  email: MOCK_CREDENTIALS.email,
  phone: '+234 803 555 0142',
  role: 'Owner',
  roleId: 'owner',
  title: 'Managing Director',
  companyIds: ['CMP-SPEEDLINE'],
  emailVerified: true,
  phoneVerified: true,
};
