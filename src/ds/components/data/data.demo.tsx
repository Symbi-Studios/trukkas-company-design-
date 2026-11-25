declare const React: typeof import('react');
declare const ReactDOM: typeof import('react-dom/client');

const NS = (function () {
  const keys = Object.keys(window).filter(k => { try { const o = (window as unknown as Record<string, any>)[k];
    return o && typeof o === 'object' && o.Button && o.Icon && o.Card; } catch (e) { return false; } });
  const key = keys.find(k => k !== 'TrukkasAdminPreview') || keys[0];
  return (key && (window as unknown as Record<string, any>)[key]) || {};
})();

const { StatCard, DataTable, TableToolbar, Pagination, DonutChart, LineChart, BarChart, Sparkline, ProgressBar, LegendList, RankBarList, SectionCard, Badge, SearchField, FilterSelect } = NS;
const rows = [
  { id: 'KJA-123-XD', type: '40FT Trailer', company: 'SpeedLine Logistics', status: 'On Trip' },
  { id: 'LND-892-AB', type: '20FT Container', company: 'D-Line Logistics', status: 'Available' },
  { id: 'KRD-334-YZ', type: '40FT Trailer', company: 'Prime Haulage Ltd', status: 'In Maintenance' },
];
function Demo() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard icon="package" label="Total Jobs" value="1,842" delta="24%" caption="vs last month" />
        <StatCard icon="truck" tint="green" label="Available" value="210" caption="43.2% of total" />
        <StatCard icon="wrench" tint="amber" label="In Maintenance" value="36" delta="2" direction="down" caption="vs last month" />
        <StatCard icon="banknote" tint="purple" label="Total Revenue" value="₦128.4M" delta="18.7%"
          sparkline={<Sparkline points={[3,5,4,8,6,9,7,11]} color="var(--tk-viz-5)" />} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <SectionCard title="Fleet Status Overview">
          <LineChart area labels={['Jul 29','Jul 30','Jul 31','Aug 1','Aug 2','Aug 3']} height={150}
            series={[{ points: [118,122,120,124,121,126] }, { points: [58,62,66,70,74,80], color: 'var(--tk-viz-2)' }]} />
        </SectionCard>
        <SectionCard title="Fleet Utilization">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <DonutChart size={120} thickness={18} centerValue="486" centerLabel="Total"
              data={[{label:'Available',value:210},{label:'On Trip',value:156},{label:'In Maintenance',value:36},{label:'Inactive',value:84}]} />
            <LegendList style={{ flex: 1 }} items={[{label:'Available',value:210},{label:'On Trip',value:156},{label:'In Maintenance',value:36},{label:'Inactive',value:84}]} />
          </div>
        </SectionCard>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SectionCard title="Revenue & Payouts Trend">
          <BarChart height={140} labels={['May 14','May 15','May 16','May 17','May 18']}
            format={(v: number) => '₦' + Math.round(v/1e6) + 'M'}
            series={[{ points: [38e6,52e6,44e6,50e6,42e6] }, { points: [22e6,30e6,26e6,31e6,24e6], color: 'var(--tk-viz-2)' }]} />
        </SectionCard>
        <SectionCard title="Top Routes by Volume">
          <RankBarList items={[{label:'Lagos → Kano',value:342},{label:'Apapa → Ibadan',value:256},{label:'Onne → Abuja',value:198},{label:'Lagos → Kaduna',value:176}]} />
          <ProgressBar style={{ marginTop: 14 }} value={65} label="Daily Transaction Limit" caption="65% used" />
        </SectionCard>
      </div>
      <SectionCard title="Trucks" count={486} pad="none">
        <TableToolbar search={<SearchField placeholder="Search by truck no., plate number, or company..." />}
          filters={<><FilterSelect label="All Status" /><FilterSelect label="All Types" /></>} onClear={() => {}} />
        <DataTable selectable rows={rows}
          columns={[
            { key: 'id', header: 'Truck / Plate No.', render: (r: { id: string }) => <a href="#">{r.id}</a> },
            { key: 'type', header: 'Truck Type' },
            { key: 'company', header: 'Truck Company' },
            { key: 'status', header: 'Status', render: (r: { status: string }) => <Badge dot>{r.status}</Badge> },
          ]} />
        <Pagination page={1} pageCount={61} total={486} onPage={() => {}} onPageSize={() => {}} />
      </SectionCard>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Demo />);
