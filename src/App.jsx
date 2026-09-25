"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation.js";
import { useDispatch, useSelector } from "react-redux";
import {
  AppShell,
  Avatar,
  CompanySwitcher,
  Sidebar,
  SidebarNavItem,
  SidebarSectionLabel,
  TopBar,
} from "./ds.js";
import { NAV, SEARCH_PLACEHOLDER } from "./nav.js";
import { useLogoutAccountMutation } from "./store/features/auth/authApi.js";
import { setActiveCompany, clearSession } from "./store/features/auth/authSlice.js";
import { baseApi } from "./store/api/baseApi.js";
import { AppLoadingScreen } from "./components/AppLoadingScreen.jsx";
import { useCollection } from "./mock/useCollection.js";
import { myCompany } from "./mock/fixtures/companies.js";
import "./mock/api.js";

const PUBLIC_ROUTES = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/signed-out",
]);

export function CompanyShell({ children }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [globalSearch, setGlobalSearch] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const account = useSelector((state) => state.auth.account);
  const dispatch = useDispatch();
  const [logoutAccount] = useLogoutAccountMutation();
  const notifications = useCollection("notifications") || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname.split("/")[1] || "dashboard";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || PUBLIC_ROUTES.has(pathname) || account || loggingOut) return;
    const target = pathname + window.location.search;
    router.replace("/login?next=" + encodeURIComponent(target));
  }, [account, loggingOut, mounted, pathname, router]);

  React.useEffect(() => {
    if (pathname === "/signed-out") setLoggingOut(false);
  }, [pathname]);

  React.useEffect(() => {
    setGlobalSearch("");
    setMobileNavOpen(false);
  }, [pathname]);

  function toggleNavigation() {
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileNavOpen((open) => !open);
    else setCollapsed((current) => !current);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    let confirmedByServer = false;
    try {
      await logoutAccount().unwrap();
      confirmedByServer = true;
    } catch {
      // Clear this device's session even when server logout cannot be confirmed.
    } finally {
      dispatch(clearSession());
      dispatch(baseApi.util.resetApiState());
    }
    router.replace(confirmedByServer ? "/signed-out" : "/signed-out?server=unconfirmed");
  }

  if (!mounted) {
    return <AppLoadingScreen mode="startup" />;
  }
  if (PUBLIC_ROUTES.has(pathname)) return children;
  if (!account || loggingOut) {
    return <AppLoadingScreen mode={loggingOut ? "logout" : "session"} />;
  }

  const sidebar = (
    <Sidebar
      collapsed={collapsed}
      onCollapse={toggleNavigation}
      header={
        <CompanySwitcher
          collapsed={collapsed}
          company={myCompany}
          companies={[myCompany]}
          onSelect={(company) => dispatch(setActiveCompany(company.id))}
        />
      }
      footer={
        !collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 8px",
              borderRadius: "var(--tk-r-lg)",
              border: "1px solid var(--tk-line)",
              background: "var(--tk-surface-sunk)",
            }}
          >
            <Avatar name={account.name} size={32} tone="var(--tk-navy)" />
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  font: "600 13px/18px var(--tk-font-sans)",
                  color: "var(--tk-ink-900)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {account.name}
              </span>
              <span
                style={{
                  display: "block",
                  font: "400 12px/16px var(--tk-font-sans)",
                  color: "var(--tk-ink-400)",
                }}
              >
                {account.role}
              </span>
            </span>
          </div>
        )
      }
    >
      {NAV.map((group) => (
        <React.Fragment key={group.section}>
          {!collapsed && (
            <SidebarSectionLabel>{group.section}</SidebarSectionLabel>
          )}
          {group.items.map((item, index) => (
            <SidebarNavItem
              key={item.id + index}
              collapsed={collapsed}
              icon={item.icon}
              label={item.label}
              active={item.id === activeId}
              onClick={() => router.push("/" + item.id)}
            />
          ))}
        </React.Fragment>
      ))}
    </Sidebar>
  );

  return (
    <AppShell
      sidebar={sidebar}
      mobileNavOpen={mobileNavOpen}
      onMobileNavClose={() => setMobileNavOpen(false)}
      topbar={
        <TopBar
          onMenu={toggleNavigation}
          notifications={unreadCount}
          searchPlaceholder={SEARCH_PLACEHOLDER[activeId]}
          searchValue={globalSearch}
          onSearch={(event) => {
            setGlobalSearch(event.target.value);
            window.dispatchEvent(
              new CustomEvent("trukkas:global-search", {
                detail: event.target.value,
              }),
            );
          }}
          health={null}
          onNotifications={() => router.push("/notifications")}
          onViewProfile={() => router.push("/company-settings")}
          onLogout={handleLogout}
          user={account.name || account.email || "Trukkas Company"}
          role={account.role}
        />
      }
    >
      {children}
    </AppShell>
  );
}
