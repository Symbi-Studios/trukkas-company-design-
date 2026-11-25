'use client';

import { Dashboard } from './screens/Dashboard';
import { Jobs } from './screens/Jobs';
import { MyJobs } from './screens/MyJobs';
import { Trips } from './screens/Trips';
import { Fleet } from './screens/Fleet';
import { Drivers } from './screens/Drivers';
import { Maintenance } from './screens/Maintenance';
import { Documents } from './screens/Documents';
import { EarningsWallet } from './screens/EarningsWallet';
import { Payouts } from './screens/Payouts';
import { RatingsReviews } from './screens/RatingsReviews';
import { NotificationCenter } from './screens/NotificationCenter';
import { Support } from './screens/Support';
import { CompanySettings } from './screens/CompanySettings';
import { Profile } from './screens/Profile';
import { SignedOut } from './screens/SignedOut';
import { ScreenPlaceholder } from './screens/ScreenPlaceholder';
import { NAV } from './nav';

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

export function ScreenRouter({ screen }: { screen: string }) {
  const Screen = screens[screen as keyof typeof screens];
  if (Screen) return <Screen />;
  const item = NAV.flatMap((group) => group.items).find((entry) => entry.id === screen);
  return <ScreenPlaceholder label={item?.label} />;
}
