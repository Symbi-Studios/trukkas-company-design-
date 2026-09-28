// Team members of the signed-in company, the roles they hold (see
// domain/access.js), per-account security settings, and the admin profile.
// Security rows never hold plain secrets: the PIN is a salted SHA-256 hash and
// the TOTP secret exists only while 2FA is enabled (server-side in production).
import { DEFAULT_ROLES } from '../../domain/access.js';

export const roles = DEFAULT_ROLES.map((r) => ({ ...r }));

export const teamMembers = [
  { id: 'USR-001', accountId: 'ACCT-0001', name: 'Adekunle Adebayo', email: 'admin@speedlinelogistics.com', phone: '+234 803 555 0142', roleId: 'owner', status: 'Active', twoFactor: false, lastActive: 'Now', joined: 'Mar 2, 2021' },
  { id: 'USR-002', name: 'Funmilayo Bakare', email: 'funmi@speedlinelogistics.com', phone: '+234 809 112 7780', roleId: 'admin', status: 'Active', twoFactor: true, lastActive: '2 hours ago', joined: 'Jun 14, 2021' },
  { id: 'USR-003', name: 'Tunde Olaniyan', email: 'tunde@speedlinelogistics.com', phone: '+234 802 667 1043', roleId: 'fleet-manager', status: 'Active', twoFactor: true, lastActive: 'Yesterday', joined: 'Jan 9, 2022' },
  { id: 'USR-004', name: 'Grace Nwosu', email: 'grace@speedlinelogistics.com', phone: '+234 816 402 3391', roleId: 'finance', status: 'Active', twoFactor: false, lastActive: '3 days ago', joined: 'Aug 22, 2023' },
  { id: 'USR-005', name: 'Kelechi Obi', email: 'kelechi@speedlinelogistics.com', phone: '+234 705 228 9014', roleId: 'dispatcher', status: 'Invited', twoFactor: false, lastActive: '—', joined: 'Invited May 29, 2026' },
];

export function defaultSecurity(accountId, overrides = {}) {
  return {
    accountId,
    passwordUpdatedOn: 'Mar 2, 2021',
    twoFactor: { enabled: false, method: null, secret: null, enabledOn: null, backupCodes: [], phone: null },
    pin: { set: false, salt: null, hash: null, updatedOn: null, failedAttempts: 0, lockedUntil: null },
    loginAlerts: true,
    sessions: [],
    ...overrides,
  };
}

export const securitySettings = [
  defaultSecurity('ACCT-0001', {
    passwordUpdatedOn: 'Jan 14, 2026',
    sessions: [
      { id: 'SES-1', device: 'Chrome on macOS', location: 'Lagos, NG', ip: '102.89.xx.xx', lastActive: 'Now', current: true },
      { id: 'SES-2', device: 'Trukkas iOS app · iPhone 14', location: 'Lagos, NG', ip: '105.112.xx.xx', lastActive: '3 hours ago' },
      { id: 'SES-3', device: 'Edge on Windows', location: 'Abuja, NG', ip: '197.210.xx.xx', lastActive: 'May 27, 2026' },
    ],
  }),
];

export const adminProfiles = [
  {
    accountId: 'ACCT-0001',
    name: 'Adekunle Adebayo',
    title: 'Managing Director',
    email: 'admin@speedlinelogistics.com',
    emailVerified: true,
    phone: '+234 803 555 0142',
    phoneVerified: true,
    photoUrl: null,
    bio: 'Runs SpeedLine’s long-haul container operations out of Apapa.',
    language: 'English',
    timezone: 'Africa/Lagos (WAT, UTC+1)',
    dateFormat: 'MMM D, YYYY',
    joined: 'Mar 2, 2021',
    loginHistory: [
      { time: 'Today, 9:12 AM', device: 'Chrome on macOS', location: 'Lagos, NG', result: 'Success' },
      { time: 'Yesterday, 6:40 PM', device: 'Trukkas iOS app', location: 'Lagos, NG', result: 'Success' },
      { time: 'May 27, 2026, 11:02 AM', device: 'Edge on Windows', location: 'Abuja, NG', result: 'Success' },
      { time: 'May 25, 2026, 8:15 PM', device: 'Unknown browser', location: 'Accra, GH', result: 'Blocked · wrong password' },
    ],
  },
];
