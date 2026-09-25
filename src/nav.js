// Shared navigation model. `id` doubles as the route path segment.
export const NAV = [
  {
    section: 'Operations',
    items: [
      { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
      { id: 'jobs-trips', icon: 'briefcase', label: 'Jobs & Trips' },
      { id: 'fleet', icon: 'truck', label: 'Fleet' },
      { id: 'drivers', icon: 'user', label: 'Drivers' },
      { id: 'maintenance', icon: 'wrench', label: 'Maintenance' },
      { id: 'documents', icon: 'file-text', label: 'Documents' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { id: 'earnings-wallet', icon: 'wallet', label: 'Earnings & Wallet' },
      { id: 'payouts', icon: 'banknote', label: 'Payouts' },
    ],
  },
  {
    section: 'Reputation',
    items: [
      { id: 'ratings-reviews', icon: 'star', label: 'Ratings & Reviews' },
    ],
  },
  {
    section: 'Communication',
    items: [
      { id: 'notifications', icon: 'bell', label: 'Notifications' },
      { id: 'support', icon: 'life-buoy', label: 'Support' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { id: 'company-settings', icon: 'settings', label: 'Company Settings' },
    ],
  },
];

export const SEARCH_PLACEHOLDER = {
  dashboard: 'Search jobs, trips, trucks, drivers...',
  'jobs-trips': 'Search by Job ID, route, cargo, forwarder...',
  fleet: 'Search trucks, trailers, registration no...',
  drivers: 'Search drivers by name, license, phone...',
  maintenance: 'Search maintenance records, trucks, service type...',
  documents: 'Search documents by truck, type, or driver...',
  'earnings-wallet': 'Search transactions, references...',
  payouts: 'Search payouts, trips, references...',
  'ratings-reviews': 'Search reviews by job, driver, forwarder...',
  notifications: 'Search notifications...',
  support: 'Search support tickets and help articles...',
  'company-settings': 'Search settings...',
  profile: 'Search settings and activity...',
};
