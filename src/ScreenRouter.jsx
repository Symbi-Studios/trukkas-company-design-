'use client';

import { Dashboard } from './screens/Dashboard.jsx';
import { Jobs } from './screens/Jobs.jsx';
import { MyJobs } from './screens/MyJobs.jsx';
import { Trips } from './screens/Trips.jsx';
import { Fleet } from './screens/Fleet.jsx';
import { Drivers } from './screens/Drivers.jsx';
import { Maintenance } from './screens/Maintenance.jsx';
import { Documents } from './screens/Documents.jsx';
import { EarningsWallet } from './screens/EarningsWallet.jsx';
import { Payouts } from './screens/Payouts.jsx';
import { RatingsReviews } from './screens/RatingsReviews.jsx';
import { NotificationCenter } from './screens/NotificationCenter.jsx';
import { Support } from './screens/Support.jsx';
import { CompanySettings } from './screens/CompanySettings.jsx';
import { Profile } from './screens/Profile.jsx';
import { SignedOut } from './screens/SignedOut.jsx';
import { ScreenPlaceholder } from './screens/ScreenPlaceholder.jsx';
import { NAV } from './nav.js';

const screens = {
  dashboard: Dashboard,
  jobs: Jobs,
  'my-jobs': MyJobs,
  trips: Trips,
  fleet: Fleet,
  drivers: Drivers,
  maintenance: Maintenance,
  documents: Documents,
  'earnings-wallet': EarningsWallet,
  payouts: Payouts,
  'ratings-reviews': RatingsReviews,
  notifications: NotificationCenter,
  support: Support,
  'company-settings': CompanySettings,
  profile: Profile,
  'signed-out': SignedOut,
};

export function ScreenRouter({ screen }) {
  const Screen = screens[screen];
  if (Screen) return <Screen />;
  const item = NAV.flatMap((group) => group.items).find((entry) => entry.id === screen);
  return <ScreenPlaceholder label={item?.label} />;
}
