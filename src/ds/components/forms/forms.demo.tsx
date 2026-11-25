declare const React: typeof import('react');
declare const ReactDOM: typeof import('react-dom/client');

const NS = (function () {
  const keys = Object.keys(window).filter(k => { try { const o = (window as unknown as Record<string, any>)[k];
    return o && typeof o === 'object' && o.Button && o.Icon && o.Card; } catch (e) { return false; } });
  const key = keys.find(k => k !== 'TrukkasAdminPreview') || keys[0];
  return (key && (window as unknown as Record<string, any>)[key]) || {};
})();

const { TextField, Textarea, Select, SearchField, FilterSelect, Checkbox, Radio, Switch, ChoiceCard, ColorSwatchPicker } = NS;
function Demo() {
  const [c, setC] = React.useState(true);
  const [r, setR] = React.useState('a');
  const [s, setS] = React.useState(true);
  const [col, setCol] = React.useState('#014AFE');
  const [txt, setTxt] = React.useState('Full operational control over jobs and trips.');
  return (
    <div>
      <div className="grp"><span className="cap">Fields</span>
        <TextField label="Role Name" required placeholder="e.g. Operations Manager" style={{ width: 220 }} />
        <Select label="Status" value="Active" leadingDot="var(--tk-success)" options={['Active','Inactive']} style={{ width: 180 }} />
        <TextField label="Rate" defaultValue="2.5" suffix={<span className="tk-meta">%</span>} style={{ width: 120 }} />
        <TextField label="Document No." error="This reference is already in use." defaultValue="CAC/RC/1234567" style={{ width: 220 }} />
      </div>
      <div className="grp"><span className="cap">Search & filters</span>
        <SearchField variant="global" placeholder="Search jobs, trucks, companies, exporters..." style={{ width: 320 }} />
        <FilterSelect label="All Status" /><FilterSelect label="All Types" />
        <FilterSelect label="More Filters" icon="sliders-horizontal" active />
      </div>
      <div className="grp"><span className="cap">Controls</span>
        <Checkbox checked={c} onChange={setC} label="Apply to existing jobs" />
        <Checkbox indeterminate label="Some rows selected" />
        <Radio checked={r==='a'} onChange={()=>setR('a')} label="Full Access" />
        <Radio checked={r==='b'} onChange={()=>setR('b')} label="No Access" />
        <Switch checked={s} onChange={setS} label="Allow this role to manage users" hint="Can create, edit and deactivate user accounts." />
      </div>
      <div className="grp"><span className="cap">Choice tiles · role colour</span>
        <ChoiceCard selected icon="globe" title="Organization Wide" description="Can access all data across the entire platform." style={{ width: 210 }} />
        <ChoiceCard icon="git-branch" title="Restricted to Branches" description="Can access only selected branches." style={{ width: 210 }} />
        <ColorSwatchPicker value={col} onChange={setCol} style={{ width: 200 }} />
      </div>
      <Textarea label="Description" maxLength={500} value={txt} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTxt(e.target.value)} />
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Demo />);
