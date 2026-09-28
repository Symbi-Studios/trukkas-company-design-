// Roles & permissions for company team members. The UI uses these to show or
// hide actions, but that is presentation only — the backend must enforce every
// permission on its own (see AGENTS.md, "Configuration and security").
export const PERMISSION_GROUPS = [
  {
    group: 'Jobs & Trips', icon: 'briefcase', permissions: [
      { key: 'jobs.view', label: 'View jobs and trips' },
      { key: 'jobs.bid', label: 'Place and withdraw bids' },
      { key: 'jobs.dispatch', label: 'Dispatch trucks and update trip status' },
    ],
  },
  {
    group: 'Fleet & Drivers', icon: 'truck', permissions: [
      { key: 'fleet.view', label: 'View vehicles and drivers' },
      { key: 'fleet.manage', label: 'Add, edit and assign vehicles and drivers' },
      { key: 'documents.manage', label: 'Upload and renew compliance documents' },
    ],
  },
  {
    group: 'Finance', icon: 'wallet', permissions: [
      { key: 'finance.view', label: 'View earnings, payouts and receipts' },
      { key: 'finance.payout', label: 'Request payouts', pin: true },
      { key: 'finance.withdraw', label: 'Withdraw wallet funds', pin: true },
      { key: 'finance.bank', label: 'Change payout bank details', pin: true },
    ],
  },
  {
    group: 'Administration', icon: 'settings', permissions: [
      { key: 'team.manage', label: 'Invite and manage team members' },
      { key: 'roles.manage', label: 'Create and edit roles' },
      { key: 'settings.manage', label: 'Edit company profile and settings' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export const DEFAULT_ROLES = [
  { id: 'owner', name: 'Owner', description: 'Full access, including roles and ownership. Cannot be edited.', system: true, locked: true, permissions: ALL_PERMISSIONS },
  { id: 'admin', name: 'Admin', description: 'Everything except managing roles.', system: true, permissions: ALL_PERMISSIONS.filter((p) => p !== 'roles.manage') },
  { id: 'fleet-manager', name: 'Fleet Manager', description: 'Runs jobs, trips, fleet, drivers and documents.', system: true, permissions: ['jobs.view', 'jobs.bid', 'jobs.dispatch', 'fleet.view', 'fleet.manage', 'documents.manage', 'finance.view'] },
  { id: 'dispatcher', name: 'Dispatcher', description: 'Dispatches trucks and keeps trips updated.', system: true, permissions: ['jobs.view', 'jobs.dispatch', 'fleet.view'] },
  { id: 'finance', name: 'Finance', description: 'Handles earnings, payouts and withdrawals.', system: true, permissions: ['jobs.view', 'finance.view', 'finance.payout', 'finance.withdraw', 'finance.bank'] },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access to operations.', system: true, permissions: ['jobs.view', 'fleet.view', 'finance.view'] },
];

export function roleById(roles, id) {
  return roles.find((r) => r.id === id) || null;
}

export function can(roles, roleId, permission) {
  return !!roleById(roles, roleId)?.permissions.includes(permission);
}

export function grantsFinance(permissions = []) {
  return permissions.some((p) => ['finance.payout', 'finance.withdraw', 'finance.bank'].includes(p));
}
