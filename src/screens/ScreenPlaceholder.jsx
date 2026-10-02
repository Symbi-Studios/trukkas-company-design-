import { Button, Card, EmptyState, PageHeader } from '../ds.js';
import { useNavigate } from '../router.js';

/** Stand-in for a nav destination with no screen yet (`label`), or for an address that doesn't exist. */
export function ScreenPlaceholder({ label }) {
  const navigate = useNavigate();
  const action = <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>;
  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title={label || 'Page not found'} />
      <Card>
        {label ? (
          <EmptyState icon="hammer" title={`${label} is coming soon`}
            description="We're still working on this page. Check back shortly." action={action} />
        ) : (
          <EmptyState icon="search-x" title="We couldn't find that page"
            description="The link may be out of date, or the page may have moved." action={action} />
        )}
      </Card>
    </div>
  );
}
