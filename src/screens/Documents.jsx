'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Avatar, Badge, Banner, Button, Card, DataTable, EmptyState, Icon, LabelValue, PageHeader, ProgressBar, SearchField, SectionCard, StatCard, Tabs,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import {
  COMPANY_REQUIREMENTS, DRIVER_REQUIREMENTS, VEHICLE_REQUIREMENTS, complianceFor, documentsFor, formatDisplayDate,
} from '../domain/documents.js';
import { VEHICLE_CLASSES, plateSlug } from '../domain/vehicles.js';
import { ComplianceChecklist, UploadDocumentModal } from '../components/DocumentCompliance.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import styles from './Documents.module.css';

function ComplianceCell({ summary }) {
  return (
    <ProgressBar
      value={summary.requiredMet} max={summary.requiredTotal} caption={`${summary.requiredMet}/${summary.requiredTotal}`}
      color={summary.complete ? 'var(--tk-success)' : 'var(--tk-warning)'} style={{ minWidth: 120 }}
    />
  );
}

function StatusCell({ summary }) {
  if (summary.expired) return <Badge tone="danger" dot>{summary.expired} expired</Badge>;
  if (!summary.complete) return <Badge tone="warning" dot>{summary.missing} missing</Badge>;
  if (summary.expiring) return <Badge tone="warning" dot>{summary.expiring} expiring</Badge>;
  return <Badge tone="success" dot>Compliant</Badge>;
}

/**
 * Compliance documents, organised by owner: the company's business onboarding
 * documents, each vehicle's papers and each driver's papers. Job and trip
 * paperwork (waybills, delivery notes) lives on the job itself.
 */
export function Documents() {
  const navigate = useNavigate();
  const documents = useCollection('documents') || [];
  const trucks = useCollection('trucks') || [];
  const drivers = useCollection('drivers') || [];
  const company = useCollection('companyProfile')?.[0];
  const [tab, setTab] = useState('company');
  const [query, setQuery] = useState('');
  const [uploadType, setUploadType] = useState(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const companyDocs = useMemo(() => documentsFor(documents, 'company'), [documents]);
  const companyCompliance = complianceFor(COMPANY_REQUIREMENTS, companyDocs);
  const vehicleRows = useMemo(() => trucks.map((t) => ({
    truck: t, ...complianceFor(VEHICLE_REQUIREMENTS, documents.filter((d) => d.ownerType === 'vehicle' && d.ownerId === t.plate)),
  })), [trucks, documents]);
  const driverRows = useMemo(() => drivers.map((d) => ({
    driver: d, ...complianceFor(DRIVER_REQUIREMENTS, documentsFor(documents, 'driver', d.id)),
  })), [drivers, documents]);

  const expiring = documents.filter((d) => d.status === 'Expiring Soon').length;
  const expired = documents.filter((d) => d.status === 'Expired').length;
  const q = query.toLowerCase();
  const vehiclesShown = vehicleRows.filter((r) => !q || [r.truck.plate, r.truck.makeModel].some((v) => v.toLowerCase().includes(q)));
  const driversShown = driverRows.filter((r) => !q || [r.driver.name, r.driver.licenseNumber].some((v) => v.toLowerCase().includes(q)));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Documents"
        description="Compliance documents for your company, vehicles and drivers. Waybills and delivery notes stay with each job."
        actions={tab === 'company' && <Button icon="upload" onClick={() => setUploadType(COMPANY_REQUIREMENTS[0].type)}>Upload Document</Button>}
      />

      <section className={styles.stats}>
        <StatCard icon="building-2" tint={companyCompliance.summary.complete ? 'green' : 'amber'} label="Business Verification" value={`${companyCompliance.summary.requiredMet}/${companyCompliance.summary.requiredTotal}`} caption={companyCompliance.summary.complete ? 'All required documents in place' : 'Required documents in place'} />
        <StatCard icon="truck" label="Compliant Vehicles" value={`${vehicleRows.filter((r) => r.summary.complete && !r.summary.expired).length}/${vehicleRows.length}`} caption="All required papers valid" />
        <StatCard icon="users-round" tint="purple" label="Compliant Drivers" value={`${driverRows.filter((r) => r.summary.complete && !r.summary.expired).length}/${driverRows.length}`} caption="All required papers valid" />
        <StatCard icon="clock-alert" tint="amber" label="Expiring Soon" value={expiring} caption="Within 60 days" />
        <StatCard icon="circle-x" tint="red" label="Expired" value={expired} caption="Renew to stay dispatchable" />
      </section>

      {!companyCompliance.summary.complete && (
        <Banner tone="warning" title="Business verification incomplete" action={<Button size="sm" variant="outline" onClick={() => setTab('company')}>Review</Button>}>
          Upload the missing company documents to keep bidding on jobs and receiving payouts.
        </Banner>
      )}

      <Card pad="none">
        <div className={styles.tabBar}>
          <Tabs value={tab} onChange={(v) => { setTab(v); setQuery(''); }} items={[
            { value: 'company', label: 'Company', count: companyDocs.length },
            { value: 'vehicles', label: 'Vehicles', count: vehicleRows.length },
            { value: 'drivers', label: 'Drivers', count: driverRows.length },
          ]} />
        </div>

        {tab === 'company' && (
          <div className={styles.companyGrid}>
            <ComplianceChecklist
              title="Business Onboarding Documents"
              description="Required by Trukkas to verify your company before you can bid on jobs and receive payouts."
              requirements={COMPANY_REQUIREMENTS} docs={companyDocs}
              onUpload={(req) => setUploadType(req.type)} onOpen={(doc) => navigate(`/documents/${doc.id}`)}
              style={{ boxShadow: 'none' }}
            />
            <div className={styles.side}>
              <SectionCard title="Company">
                <LabelValue label="Name" value={company?.name} />
                <LabelValue label="RC Number" value={company?.rcNumber} />
                <LabelValue label="Verification" value={<Badge tone={company?.verification === 'Verified' ? 'success' : 'warning'}>{company?.verification}</Badge>} />
              </SectionCard>
              {company?.director && (
                <SectionCard title="Director" description="The director whose NIN, BVN and ID are on file.">
                  <div className={styles.person}>
                    <Avatar name={company.director.name} size={40} />
                    <span><strong>{company.director.name}</strong><small>{company.director.role}</small></span>
                  </div>
                  <LabelValue label="Date of Birth" value={company.director.dob ? formatDisplayDate(company.director.dob) : 'Not provided'} />
                  <LabelValue label="NIN" value={companyDocs.find((d) => d.type === 'NIN')?.number || 'Not provided'} />
                  <LabelValue label="BVN" value={companyDocs.find((d) => d.type === 'BVN')?.number || 'Not provided'} />
                </SectionCard>
              )}
              <Card tone="cool" className={styles.note}>
                <Icon name="lock" size={16} color="var(--tk-blue)" />
                <span className="tk-meta">NIN and BVN are verified with NIMC and NIBSS. Only the last 4 digits are kept on file.</span>
              </Card>
            </div>
          </div>
        )}

        {tab !== 'company' && (
          <div className={styles.toolbar}>
            <SearchField placeholder={tab === 'vehicles' ? 'Search vehicles by plate or model...' : 'Search drivers by name or licence...'} value={query} onChange={(e) => setQuery(e.target.value)} />
            {tab === 'vehicles' && <Button variant="outline" icon="plus" onClick={() => navigate('/fleet/new')}>Add Vehicle</Button>}
          </div>
        )}

        {tab === 'vehicles' && (vehiclesShown.length === 0 ? <EmptyState icon="truck" title="No vehicles found" /> : (
          <DataTable
            rows={vehiclesShown} rowKey={(r) => r.truck.plate} onRowClick={(r) => navigate(`/fleet/${plateSlug(r.truck.plate)}/documents`)}
            columns={[
              {
                key: 'vehicle', header: 'Vehicle', render: ({ truck }) => (
                  <span className={styles.owner}>
                    <span className={styles.ownerIcon}><Icon name={VEHICLE_CLASSES.find((c) => c.value === truck.vehicleClass)?.icon || 'truck'} size={16} /></span>
                    <span><strong>{truck.plate}</strong><small>{truck.makeModel}</small></span>
                  </span>
                ),
              },
              { key: 'required', header: 'Required Documents', render: (r) => <ComplianceCell summary={r.summary} /> },
              { key: 'expiring', header: 'Expiring', render: (r) => r.summary.expiring || '—' },
              { key: 'expired', header: 'Expired', render: (r) => r.summary.expired || '—' },
              { key: 'status', header: 'Status', render: (r) => <StatusCell summary={r.summary} /> },
              { key: 'go', header: '', width: 48, render: () => <Icon name="chevron-right" size={16} color="var(--tk-ink-300)" /> },
            ]}
          />
        ))}

        {tab === 'drivers' && (driversShown.length === 0 ? <EmptyState icon="user" title="No drivers found" /> : (
          <DataTable
            rows={driversShown} rowKey={(r) => r.driver.id} onRowClick={(r) => navigate(`/drivers/${r.driver.id}`)}
            columns={[
              {
                key: 'driver', header: 'Driver', render: ({ driver }) => (
                  <span className={styles.owner}>
                    <Avatar name={driver.name} src={driver.photo || undefined} size={32} />
                    <span><strong>{driver.name}</strong><small>{driver.licenseNumber}</small></span>
                  </span>
                ),
              },
              { key: 'required', header: 'Required Documents', render: (r) => <ComplianceCell summary={r.summary} /> },
              { key: 'licence', header: 'Licence Expiry', render: ({ driver }) => driver.licenseExpiry },
              { key: 'expired', header: 'Expired', render: (r) => r.summary.expired || '—' },
              { key: 'status', header: 'Status', render: (r) => <StatusCell summary={r.summary} /> },
              { key: 'go', header: '', width: 48, render: () => <Icon name="chevron-right" size={16} color="var(--tk-ink-300)" /> },
            ]}
          />
        ))}
      </Card>

      <Card className={styles.note}>
        <Icon name="briefcase" size={16} color="var(--tk-blue)" />
        <span className="tk-meta">Looking for a waybill, bill of lading or delivery note? Job and trip documents are on each job’s Documents tab in <button type="button" className={styles.link} onClick={() => navigate('/my-jobs')}>My Jobs</button>.</span>
      </Card>

      <UploadDocumentModal
        open={!!uploadType} onClose={() => setUploadType(null)} ownerType="company" ownerId={company?.id} ownerLabel={company?.name}
        requirements={COMPANY_REQUIREMENTS} initialType={uploadType}
        onDone={(doc) => { setUploadType(null); showToast(`${doc.name} submitted for review.`); }}
      />
      <Toast message={toast} />
    </div>
  );
}
