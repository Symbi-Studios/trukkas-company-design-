declare const React: typeof import('react');
declare const ReactDOM: typeof import('react-dom/client');

const NS = (function () {
  const keys = Object.keys(window).filter((k) => {
    try {
      const o = (window as unknown as Record<string, any>)[k];
      return o && typeof o === "object" && o.Button && o.Icon && o.Card;
    } catch (e) {
      return false;
    }
  });
  const key = keys.find((k) => k !== "TrukkasAdminPreview") || keys[0];
  return (key && (window as unknown as Record<string, any>)[key]) || {};
})();

const {
  Banner,
  DropdownMenu,
  StatusDot,
  CountBadge,
  Tooltip,
  EmptyState,
  Timeline,
  Skeleton,
  SkeletonRow,
  Card,
  Button,
  Icon,
} = NS;
function Demo() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Banner tone="info">
        This rule will be automatically applied to all jobs that match the
        criteria below.
      </Banner>
      <Banner tone="danger" title="Maintenance Overdue">
        Truck KJA-123-XD is overdue for maintenance by 5 days (due May 25,
        2026).
      </Banner>
      <div className="grp">
        <span className="cap">Status markers</span>
        <StatusDot tone="success" label="All Systems Operational" />
        <StatusDot tone="info" pulse label="Live" />
        <StatusDot tone="danger" label="Tracking lost" />
        <CountBadge count={12} />
        <CountBadge count={68} tone="soft" />
        <CountBadge count={5} tone="warning" />
        <Tooltip label="Estimated, not guaranteed">
          <span
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <Icon name="info" size={14} /> ETA 2h 14m
          </span>
        </Tooltip>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <DropdownMenu
          width={230}
          items={[
            { section: "Manage rule" },
            { label: "Duplicate Fee Rule", icon: "copy" },
            { label: "Deactivate Fee Rule", icon: "circle-slash" },
            { divider: true },
            { section: "Export & report" },
            { label: "Export Rule Details (PDF)", icon: "file-text" },
            { divider: true },
            { label: "Delete Fee Rule", icon: "trash-2", tone: "danger" },
          ]}
        />
        <Card style={{ flex: 1 }}>
          <Timeline
            items={[
              {
                title: "Discharge Completed",
                time: "May 15, 2026 · 08:42 AM",
                description: "Container discharged at Apapa Port",
                icon: "check",
              },
              {
                title: "Free Period Ended",
                time: "May 21, 2026 · 11:59 PM",
                description: "Free period has ended",
                icon: "check",
              },
              {
                title: "Current Status",
                state: "current",
                time: "May 28, 2026",
                description: "7 days overdue and ongoing",
              },
              {
                title: "Final Decision",
                state: "pending",
                description: "Pending",
              },
            ]}
          />
        </Card>
        <Card style={{ width: 250, display: "grid", gap: 10 }}>
          <SkeletonRow columns={3} />
          <Skeleton width="70%" />
          <Skeleton width="45%" />
        </Card>
      </div>
      <Card pad="none">
        <EmptyState
          icon="file-text"
          title="No documents yet"
          description="Documents uploaded against this Job appear here with their verification status."
          action={<Button icon="upload">Upload Document</Button>}
        />
      </Card>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Demo />);
