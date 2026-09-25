import '../ds/styles.css';
import { CompanyShell } from '../App.jsx';
import { StoreProvider } from '../store/StoreProvider.jsx';
import { DesktopOnlyNotice } from '../components/DesktopOnlyNotice.jsx';
import screenStyles from '../components/DesktopOnlyNotice.module.css';

export const metadata = {
  title: {
    default: 'Trukkas',
    template: '%s | Trukkas',
  },
  description: 'Manage jobs, trips, fleet, drivers, earnings, and payouts for your trucking company.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div className={screenStyles.experience}>
          <StoreProvider><CompanyShell>{children}</CompanyShell></StoreProvider>
        </div>
        <DesktopOnlyNotice />
      </body>
    </html>
  );
}
