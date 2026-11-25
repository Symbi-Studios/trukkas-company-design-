declare const React: typeof import('react');
declare const ReactDOM: typeof import('react-dom/client');

const NS = (function () {
  const keys = Object.keys(window).filter(k => { try { const o = (window as unknown as Record<string, any>)[k];
    return o && typeof o === 'object' && o.Button && o.Icon && o.Card; } catch (e) { return false; } });
  const key = keys.find(k => k !== 'TrukkasAdminPreview') || keys[0];
  return (key && (window as unknown as Record<string, any>)[key]) || {};
})();

const { Button, IconButton, SplitButton, Card, SectionCard, Badge, Tag, Avatar, Divider, LabelValue, CopyableId, Logo } = NS;
function Demo() {
  return (
    <div>
      <div className="grp"><span className="cap">Button — variants</span>
        <Button icon="plus">Add Truck</Button>
        <Button variant="accent" icon="plus">Add New User</Button>
        <Button variant="secondary" icon="pencil">Edit Fee Rule</Button>
        <Button variant="outline" iconRight="chevron-down">More Actions</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger" icon="trash-2">Cancel Verification</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="grp"><span className="cap">Size · icon-only · split</span>
        <Button size="sm" variant="outline">Review</Button>
        <Button size="lg">Approve Verification</Button>
        <IconButton icon="ellipsis-vertical" tone="ghost" />
        <IconButton icon="eye" tone="outline" />
        <IconButton icon="download" tone="sunk" />
        <IconButton icon="filter" tone="blue" />
        <SplitButton icon="upload">Upload Document</SplitButton>
      </div>
      <div className="grp"><span className="cap">Badge · Tag · Avatar</span>
        <Badge>Active</Badge><Badge>In Transit</Badge><Badge>Expiring Soon</Badge>
        <Badge>Expired</Badge><Badge>Draft</Badge><Badge dot>On Trip</Badge>
        <Tag tone="orange">Break-bulk</Tag><Tag tone="purple">Super Admin</Tag><Tag tone="teal">Warehousing</Tag>
        <Avatar name="Dee Caulcrick" size={32} /><Avatar name="Trukkas Admin" square size={32} tone="var(--tk-navy)" />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <SectionCard title="Rule Details" icon="file-text" style={{ flex: 1 }}
          tooltip="Applied automatically to every job matching this rule's criteria"
          footer={<a href="#">View full audit log</a>}>
          <LabelValue label="Calculation Type" value="Percentage of Job Value" />
          <Divider />
          <LabelValue label="Rate" value="2.5%" />
          <Divider />
          <LabelValue label="Minimum Fee" value="₦500" />
        </SectionCard>
        <Card style={{ width: 250, display: 'grid', gap: 12, alignContent: 'start' }}>
          <Logo size={32} />
          <CopyableId id="DEM-2026-000058" />
          <LabelValue layout="stack" label="Charge Amount" value="₦1,050,000.00" hint="₦75,000.00 / day" />
        </Card>
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Demo />);
