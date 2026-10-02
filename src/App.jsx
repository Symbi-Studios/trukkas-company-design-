"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation.js";
import { useDispatch, useSelector } from "react-redux";
import {
  AppShell,
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
import { setActiveAccount, startCompanyWorkspace } from "./mock/api.js";
import { onScreenSearch } from "./pageSearch.js";
import { searchWorkspace } from "./domain/search.js";

const PUBLIC_ROUTES = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/signed-out",
  "/signup",
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
  const company = useCollection("companyProfile")?.[0];
  const profile = (useCollection("adminProfile") || [])[0];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const router = useRouter();
  const pathname = usePathname();
  const jobs = useCollection("jobs") || [];
  const trips = useCollection("trips") || [];
  const trucks = useCollection("trucks") || [];
  const drivers = useCollection("drivers") || [];
  const payouts = useCollection("payoutRequests") || [];
  const [section, detailId] = pathname.split("/").slice(1);
  // A won/past job's detail page belongs to My Jobs; open requests to Find Jobs.
  const wonJob = section === "jobs" && detailId && jobs.find((j) => j.id === detailId && j.status !== "Pending" && j.status !== "Quoted");
  const activeId = wonJob ? "my-jobs" : section || "dashboard";
  // List screens filter as you type and name what they search; everywhere the
  // dropdown offers matches from across the workspace.
  const searchPlaceholder = (!detailId && SEARCH_PLACEHOLDER[activeId]) || "Search jobs, trips, trucks, drivers...";
  const searchResults = React.useMemo(
    () => searchWorkspace(globalSearch, { jobs, trips, trucks, drivers, payouts }),
    [globalSearch, jobs, trips, trucks, drivers, payouts],
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // The mock store is in-memory: after a reload it re-seeds the demo company.
  // Point the mock "server" at the signed-in account and, for accounts created
  // via /signup, rebuild their (empty) company workspace.
  React.useEffect(() => {
    if (!account) return;
    setActiveAccount(account.id);
    if (account.isNewCompany && company?.id !== account.companyIds?.[0]) {
      startCompanyWorkspace(account, { name: account.companyName });
    }
  }, [account, company?.id]);

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

  React.useEffect(() => onScreenSearch(setGlobalSearch), []);

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
          company={company}
          companies={company ? [company] : []}
          onSelect={(company) => dispatch(setActiveCompany(company.id))}
        />
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
          searchPlaceholder={searchPlaceholder}
          searchValue={globalSearch}
          onSearch={(event) => {
            setGlobalSearch(event.target.value);
            window.dispatchEvent(
              new CustomEvent("trukkas:global-search", {
                detail: event.target.value,
              }),
            );
          }}
          searchResults={searchResults}
          onSearchSelect={(item) => router.push(item.to)}
          health={null}
          onNotifications={() => router.push("/notifications")}
          onViewProfile={() => router.push("/profile")}
          avatarSrc={profile?.photoUrl || undefined}
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
