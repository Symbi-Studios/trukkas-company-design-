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
  Sidebar,
  SidebarNavItem,
  SidebarSectionLabel,
  TopBar,
  Tabs,
  Breadcrumbs,
  PageHeader,
  Button,
  CountBadge,
} = NS;
function Demo() {
  const [tab, setTab] = React.useState("Overview");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: "1px solid var(--tk-line)",
          borderRadius: "var(--tk-r-xl)",
          overflow: "hidden",
        }}
      >
        <TopBar
          onMenu={() => {}}
          notifications={12}
          user="Trukkas Admin"
          role="Super Admin"
        />
      </div>
      <div style={{ display: "flex", gap: 16, height: 250 }}>
        <div
          style={{
            border: "1px solid var(--tk-line)",
            borderRadius: "var(--tk-r-xl)",
            overflow: "hidden",
          }}
        >
          <Sidebar>
            <SidebarSectionLabel>Operations</SidebarSectionLabel>
            <SidebarNavItem icon="package" label="Jobs & Trips" active />
            <SidebarNavItem icon="radio-tower" label="Dispatch Center" />
            <SidebarNavItem
              icon="truck"
              label="Fleet Management"
              expandable
              expanded
            />
            <SidebarNavItem label="Trucks" depth={1} />
            <SidebarNavItem
              icon="life-buoy"
              label="Support & Disputes"
              badge={<CountBadge count={3} />}
            />
            <SidebarSectionLabel>Support System</SidebarSectionLabel>
            <SidebarNavItem icon="ticket" label="Tickets" />
            <SidebarNavItem icon="megaphone" label="Announcements" />
          </Sidebar>
        </div>
        <div
          style={{ flex: 1, display: "grid", gap: 14, alignContent: "start" }}
        >
          <PageHeader
            crumbs={["Administration", "User Management"]}
            title="User Management"
            description="Manage users, view their roles, permissions and account status."
            actions={
              <>
                <Button variant="outline" icon="upload">
                  Import Users
                </Button>
                <Button variant="accent" icon="plus">
                  Add New User
                </Button>
              </>
            }
          />
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              "Overview",
              { value: "Documents", label: "Documents", count: 6 },
              "Information",
              "Assessment",
              "History",
            ]}
          />
          <Breadcrumbs
            items={["Compliance", "Verification", "VER-2024-00567"]}
          />
        </div>
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Demo />);
