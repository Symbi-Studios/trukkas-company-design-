import '../ds/styles.css';
import { CompanyShell } from '../App';
import { StoreProvider } from '../store/StoreProvider';
import { DesktopOnlyNotice } from '../components/DesktopOnlyNotice';
import screenStyles from '../components/DesktopOnlyNotice.module.css';

export const metadata = {
  title: {
    default: 'Trukkas',
    template: '%s | Trukkas',
  },
  description: 'Manage jobs, trips, fleet, drivers, earnings, and payouts for your trucking company.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0 }}>
        <div className={screenStyles.experience}>
          <StoreProvider><CompanyShell>{children}</CompanyShell></StoreProvider>
        </div>
        <DesktopOnlyNotice />
      </body>
    </html>
  );
}
