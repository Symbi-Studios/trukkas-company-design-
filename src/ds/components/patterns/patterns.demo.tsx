declare const React: typeof import('react');
declare const ReactDOM: typeof import('react-dom/client');

const NS = (function () {
  const keys = Object.keys(window).filter(k => { try { const o = (window as unknown as Record<string, any>)[k];
    return o && typeof o === 'object' && o.Button && o.Icon && o.Card; } catch (e) { return false; } });
  const key = keys.find(k => k !== 'TrukkasAdminPreview') || keys[0];
  return (key && (window as unknown as Record<string, any>)[key]) || {};
})();

const { EntityHeaderCard, QuickActionsCard, ListRow, AlertRow, ActivityFeed, NotificationItem, AttachmentCard, MessageBubble, PermissionRow, MapPanel, SectionCard, Badge, Button, Card } = NS;
function Demo() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <EntityHeaderCard name="Global Haulage Ltd" initials="GH" badges={<><Badge>Active</Badge><Badge tone="info">Forwarder</Badge></>}
        subtitle="Customer ID: FWD-000128" actions={<Button variant="outline" iconRight="chevron-down">More Actions</Button>}
        facts={[
          { label: 'Total Jobs', value: '128' },
          { label: 'Total Spend (₦)', value: '₦245,680,000' },
          { label: 'Current Balance (₦)', value: '₦12,450,000' },
          { label: 'Member Since', value: 'Jan 15, 2024' },
          { label: 'Last Activity', value: 'May 8, 2026', hint: '10:45 AM' },
        ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'start' }}>
        <SectionCard title="Alerts & Pending Actions" footer={<a href="#">View all</a>}>
          <AlertRow icon="wallet" title="Payouts awaiting release" description="Approved and ready for release"
            count={8} action={<Button size="sm" variant="outline">Review</Button>} />
          <AlertRow icon="wrench" tone="amber" title="Trucks due for maintenance" description="Within 7 days"
            count={12} action={<Button size="sm" variant="outline">View</Button>} />
          <AlertRow icon="shield-check" tone="blue" title="Exporter verifications" description="Documents pending review"
            count={7} action={<Button size="sm" variant="outline">Review</Button>} />
        </SectionCard>
        <QuickActionsCard items={[
          { icon: 'file-plus', label: 'Create Job for this Forwarder' },
          { icon: 'shield-check', label: 'Add Verification Request' },
          { icon: 'megaphone', label: 'Send Announcement' },
          { icon: 'download', label: 'Download Company Profile' },
        ]} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'start' }}>
        <SectionCard title="Maintenance Alerts" action={<a href="#">View all</a>}>
          <ListRow icon="truck" title="KJA-789-XE" subtitle="Engine oil change due" value="Aug 6, 2026" valueTone="var(--tk-danger)" caption="in 2 days" />
          <ListRow icon="truck" title="LND-342-YU" subtitle="Brake pad replacement" value="Aug 8, 2026" valueTone="var(--tk-warning)" caption="in 4 days" />
          <NotificationItem icon="megaphone" tone="orange" title="System Maintenance – May 25" preview="We will be performing scheduled maintenance..." meta="May 20, 2024" badge={<Badge>Published</Badge>} />
        </SectionCard>
        <SectionCard title="Activity Log" action={<a href="#">View All</a>}>
          <ActivityFeed items={[
            { text: 'Document "Operational License" is under review', actor: 'Mike Johnson', time: 'May 20, 2024 09:15 AM' },
            { text: 'Document "Bank Verification" approved', actor: 'Sarah Williams', time: 'May 18, 2024 03:45 PM', tone: 'var(--tk-success)' },
            { text: 'Application submitted by Jane Doe', time: 'May 18, 2024 10:24 AM' },
          ]} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <AttachmentCard kind="pdf" name="Error_Screenshot.pdf" size="245 KB" />
          </div>
        </SectionCard>
        <SectionCard title="Permissions" pad="none">
          <PermissionRow icon="layout-dashboard" module="Dashboard" value="full" />
          <PermissionRow icon="wallet" module="Finance" actions={6} value="custom" />
          <PermissionRow icon="shield-check" module="Verification" value="none" />
          <MessageBubble author="Sarah Johnson" role="Support Agent" time="11:05 AM">
            Could you try clearing your cache and cookies, then attempt to create the trip again?
          </MessageBubble>
        </SectionCard>
      </div>
      <MapPanel title="Live Map" status="687 active trips" height={140} onExpand={() => {}}
        legend={[{ label: 'In Transit', color: 'var(--tk-blue)' }, { label: 'Loading', color: 'var(--tk-warning)' }, { label: 'Unloading', color: 'var(--tk-success)' }]} />
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Demo />);
