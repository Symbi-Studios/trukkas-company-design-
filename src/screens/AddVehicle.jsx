'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Badge, Banner, Button, Card, ChoiceCard, Icon, LabelValue, PageHeader, SearchField, Select, SectionCard, Tag, Textarea, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { addTruck } from '../mock/api.js';
import { VEHICLE_CLASSES, plateSlug } from '../domain/vehicles.js';
import { VEHICLE_PHOTO_SLOTS, VEHICLE_REQUIREMENTS, formatDisplayDate } from '../domain/documents.js';
import { FileDrop } from '../components/FileDrop.jsx';
import { PickList, driverOptions } from '../components/AssignModals.jsx';
import styles from './AddVehicle.module.css';

const STEPS = [
  { key: 'details', label: 'Vehicle Details', hint: 'Type, registration and identity', icon: 'truck' },
  { key: 'specs', label: 'Specifications', hint: 'Engine, axles and capacity', icon: 'gauge' },
  { key: 'documents', label: 'Documents', hint: 'Registration, insurance, road worthiness', icon: 'file-text' },
  { key: 'photos', label: 'Photos', hint: 'Exterior, cab and odometer', icon: 'camera' },
  { key: 'driver', label: 'Assign Driver', hint: 'Optional', icon: 'user-round' },
  { key: 'review', label: 'Review & Submit', hint: 'Check everything', icon: 'clipboard-check' },
];

const MAKES = ['Mercedes-Benz', 'Volvo', 'MAN', 'DAF', 'Scania', 'Iveco', 'Sinotruk (HOWO)', 'Shacman', 'FAW', 'Mack', 'Renault', 'Isuzu'];
const YEARS = Array.from({ length: 32 }, (_, i) => String(new Date().getFullYear() - i));
const COLORS = ['White', 'Blue', 'Red', 'Silver', 'Black', 'Yellow', 'Green', 'Orange', 'Other'];
const CLASS_LABEL = { Head: 'Truck (Head)', Trailer: 'Trailer', Tanker: 'Tanker', Specialized: 'Specialized', Other: 'Other' };
const TYPE_BY_CLASS = { Head: 'Truck (Head)', Trailer: 'Trailer', Tanker: 'Truck (Head)', Specialized: 'Truck (Head)', Other: 'Other' };

const EMPTY = {
  vehicleClass: 'Head', plate: '', make: '', model: '', year: '', color: '', vin: '', engineNumber: '',
  purchaseDate: '', ownership: 'Company Owned', location: '', odometer: '', notes: '',
  specs: {
    engineType: 'Diesel', engineCapacity: '', transmission: 'Automatic', fuelType: 'Diesel', axleConfig: '6 x 4', axles: '3',
    gvw: '', loadCapacity: '', fuelTankCapacity: '', emissionStandard: 'Euro 5', trailerCompatibility: 'Yes (Standard 40FT)',
  },
  docs: Object.fromEntries(VEHICLE_REQUIREMENTS.map((r) => [r.type, { files: [], expiry: '' }])),
  photos: Object.fromEntries(VEHICLE_PHOTO_SLOTS.map((slot) => [slot, []])),
  driverId: null,
};

function Field({ children, span }) {
  return <div style={span ? { gridColumn: '1 / -1' } : undefined}>{children}</div>;
}

export function AddVehicle() {
  const navigate = useNavigate();
  const trucks = useCollection('trucks') || [];
  const drivers = useCollection('drivers') || [];
  const trips = useCollection('trips') || [];
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [driverQuery, setDriverQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isTrailer = draft.vehicleClass === 'Trailer';
  const steps = STEPS.filter((s) => !(isTrailer && s.key === 'driver'));
  const current = steps[Math.min(step, steps.length - 1)];
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e?.target ? e.target.value : e }));
  const setSpec = (key) => (e) => setDraft((d) => ({ ...d, specs: { ...d.specs, [key]: e.target.value } }));
  const setDoc = (type, patch) => setDraft((d) => ({ ...d, docs: { ...d.docs, [type]: { ...d.docs[type], ...patch } } }));

  const requiredDocs = VEHICLE_REQUIREMENTS.filter((r) => r.required);
  const docsDone = requiredDocs.filter((r) => draft.docs[r.type].files.length && (!r.expires || draft.docs[r.type].expiry)).length;
  const photoCount = VEHICLE_PHOTO_SLOTS.filter((s) => draft.photos[s].length).length;
  const driver = drivers.find((d) => d.id === draft.driverId);
  const driverItems = useMemo(() => driverOptions(drivers, trips, { query: driverQuery }), [drivers, trips, driverQuery]);

  function validate(key) {
    const next = {};
    if (key === 'details') {
      const plate = draft.plate.trim().toUpperCase();
      if (!plate) next.plate = 'Registration number is required.';
      else if (trucks.some((t) => t.plate.toUpperCase() === plate)) next.plate = 'A vehicle with this registration is already in your fleet.';
      if (!draft.make.trim()) next.make = 'Make is required.';
      if (!draft.model.trim()) next.model = 'Model is required.';
      if (!draft.year) next.year = 'Year of manufacture is required.';
      if (!draft.vin.trim()) next.vin = 'Chassis / VIN is required.';
    }
    if (key === 'documents') {
      VEHICLE_REQUIREMENTS.forEach((r) => {
        if (r.expires && draft.docs[r.type].files.length && !draft.docs[r.type].expiry) next[`doc:${r.type}`] = 'Add the expiry date.';
      });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goTo(index) {
    if (index > step && !steps.slice(step, index).every((s) => validate(s.key))) return;
    setErrors({});
    setStep(index);
    setVisited((v) => Math.max(v, index));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    if (!validate('details')) { setStep(0); return; }
    setBusy(true);
    setSubmitError('');
    const plate = draft.plate.trim().toUpperCase().replace(/\s+/g, ' ');
    const expiryOf = (type) => (draft.docs[type].expiry ? formatDisplayDate(draft.docs[type].expiry) : '—');
    try {
      await addTruck({
        plate, vehicleClass: draft.vehicleClass, type: TYPE_BY_CLASS[draft.vehicleClass],
        make: draft.make.trim(), model: draft.model.trim(), year: Number(draft.year), color: draft.color || '—',
        makeModel: `${draft.make.trim()} ${draft.model.trim()} ${draft.year}`,
        vin: draft.vin.trim().toUpperCase(), engineNumber: draft.engineNumber.trim() || '—',
        purchaseDate: draft.purchaseDate ? formatDisplayDate(draft.purchaseDate) : '—', ownership: draft.ownership,
        location: draft.location.trim() || '—', odometer: Number(draft.odometer) || 0,
        insuranceExpiry: expiryOf('Insurance'), roadWorthinessExpiry: expiryOf('Road Worthiness'),
        specs: { ...draft.specs, axles: Number(draft.specs.axles) || draft.specs.axles },
        notes: draft.notes.trim(),
      }, {
        documents: VEHICLE_REQUIREMENTS.filter((r) => draft.docs[r.type].files.length).map((r) => ({
          type: r.type, name: draft.docs[r.type].files[0].name, fileSize: draft.docs[r.type].files[0].size,
          url: draft.docs[r.type].files[0].url, expiryDate: draft.docs[r.type].expiry || null,
        })),
        photos: VEHICLE_PHOTO_SLOTS.filter((s) => draft.photos[s].length).map((s) => ({
          label: s, name: draft.photos[s][0].name, fileSize: draft.photos[s][0].size, url: draft.photos[s][0].url,
        })),
        driverId: isTrailer ? null : draft.driverId,
      });
      navigate(`/fleet/${plateSlug(plate)}`);
    } catch (err) {
      setSubmitError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={[{ label: 'My Fleet', onClick: () => navigate('/fleet') }, 'Add Vehicle']}
        title="Add Vehicle"
        description="Register a truck or trailer with its papers and photos. Vehicles can be dispatched once required documents are verified."
        actions={<Button variant="outline" icon="x" onClick={() => navigate('/fleet')}>Cancel</Button>}
      />

      <div className={styles.layout}>
        <Card pad="none" className={styles.stepper}>
          <ol>
            {steps.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'todo';
              return (
                <li key={s.key} className={styles[state]}>
                  <button type="button" disabled={i > visited} onClick={() => goTo(i)}>
                    <span className={styles.stepDot}>{state === 'done' ? <Icon name="check" size={14} /> : i + 1}</span>
                    <span><strong>{s.label}</strong><small>{s.hint}</small></span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className={styles.main}>
          <Card pad="none">
            <div className={styles.stepHead}>
              <span className={styles.stepIcon}><Icon name={current.icon} size={20} /></span>
              <span>
                <small>Step {step + 1} of {steps.length}</small>
                <h2>{current.label}</h2>
              </span>
            </div>

            <div className={styles.stepBody}>
              {current.key === 'details' && (
                <>
                  <div>
                    <span className={styles.label}>Vehicle Type</span>
                    <div className={styles.typeGrid}>
                      {VEHICLE_CLASSES.map((c) => (
                        <ChoiceCard key={c.value} icon={c.icon} title={CLASS_LABEL[c.value]} selected={draft.vehicleClass === c.value} onSelect={() => set('vehicleClass')(c.value)} />
                      ))}
                    </div>
                  </div>
                  <div className={styles.grid}>
                    <TextField label="Registration (Plate) Number" required value={draft.plate} onChange={set('plate')} placeholder="e.g. LSD 555 XY" error={errors.plate} />
                    <TextField label="Chassis / VIN Number" required value={draft.vin} onChange={set('vin')} placeholder="17-character VIN" error={errors.vin} />
                    <TextField label="Make" required value={draft.make} onChange={set('make')} list="vehicle-makes" placeholder="e.g. Mercedes-Benz" error={errors.make} />
                    <TextField label="Model" required value={draft.model} onChange={set('model')} placeholder="e.g. Actros 2645" error={errors.model} />
                    <Select label="Year of Manufacture" value={draft.year} placeholder="Select year" options={YEARS} onChange={set('year')} />
                    <Select label="Colour" value={draft.color} placeholder="Select colour" options={COLORS} onChange={set('color')} />
                    {!isTrailer && <TextField label="Engine Number" value={draft.engineNumber} onChange={set('engineNumber')} />}
                    <TextField label="Purchase Date" type="date" value={draft.purchaseDate} onChange={set('purchaseDate')} />
                    <Select label="Ownership" value={draft.ownership} options={['Company Owned', 'Leased', 'Hire Purchase / Financed']} onChange={set('ownership')} />
                    <TextField label="Current Location" value={draft.location} onChange={set('location')} placeholder="e.g. Apapa, Lagos" />
                    {errors.year && <span className={styles.error}>{errors.year}</span>}
                  </div>
                  <datalist id="vehicle-makes">{MAKES.map((m) => <option key={m} value={m} />)}</datalist>
                </>
              )}

              {current.key === 'specs' && (
                <div className={styles.grid}>
                  {!isTrailer && (
                    <>
                      <Select label="Engine Type" value={draft.specs.engineType} options={['Diesel', 'Petrol', 'CNG', 'Electric']} onChange={setSpec('engineType')} />
                      <TextField label="Engine Capacity" value={draft.specs.engineCapacity} onChange={setSpec('engineCapacity')} placeholder="e.g. 12.8 L" />
                      <Select label="Transmission" value={draft.specs.transmission} options={['Automatic', 'Manual', 'Automated Manual']} onChange={setSpec('transmission')} />
                      <Select label="Fuel Type" value={draft.specs.fuelType} options={['Diesel', 'Petrol', 'CNG']} onChange={setSpec('fuelType')} />
                      <TextField label="Fuel Tank Capacity" value={draft.specs.fuelTankCapacity} onChange={setSpec('fuelTankCapacity')} placeholder="e.g. 1,200 L" />
                      <Select label="Emission Standard" value={draft.specs.emissionStandard} options={['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Unknown']} onChange={setSpec('emissionStandard')} />
                    </>
                  )}
                  <Select label="Axle Configuration" value={draft.specs.axleConfig} options={['4 x 2', '6 x 2', '6 x 4', '8 x 4', 'Tandem', 'Tridem']} onChange={setSpec('axleConfig')} />
                  <Select label="Number of Axles" value={draft.specs.axles} options={['2', '3', '4', '5']} onChange={setSpec('axles')} />
                  <TextField label="Gross Vehicle Weight" value={draft.specs.gvw} onChange={setSpec('gvw')} placeholder="e.g. 44,000 kg" />
                  <TextField label="Load Capacity" value={draft.specs.loadCapacity} onChange={setSpec('loadCapacity')} placeholder="e.g. 32,000 kg" />
                  {!isTrailer && <Select label="Trailer Compatibility" value={draft.specs.trailerCompatibility} options={['Yes (Standard 40FT)', 'Yes (20FT only)', 'N/A (rigid body)']} onChange={setSpec('trailerCompatibility')} />}
                  {!isTrailer && <TextField label="Odometer Reading (km)" type="number" min="0" value={draft.odometer} onChange={set('odometer')} />}
                  <Field span><Textarea label="Notes (optional)" rows={3} value={draft.notes} onChange={set('notes')} placeholder="Anything dispatchers should know about this vehicle." /></Field>
                </div>
              )}

              {current.key === 'documents' && (
                <div className={styles.docList}>
                  <Banner tone="info" title={`${docsDone} of ${requiredDocs.length} required documents added`}>
                    You can finish now and upload the rest later from the truck’s Documents tab, but the vehicle can’t be dispatched until required documents are verified.
                  </Banner>
                  {VEHICLE_REQUIREMENTS.map((r) => (
                    <div key={r.type} className={styles.docRow}>
                      <div className={styles.docHead}>
                        <strong>{r.label}</strong>
                        <Tag tone={r.required ? 'blue' : 'neutral'}>{r.required ? 'Required' : 'Optional'}</Tag>
                        {r.hint && <small>{r.hint}</small>}
                      </div>
                      <div className={styles.docInputs}>
                        <FileDrop compact files={draft.docs[r.type].files} onChange={(files) => setDoc(r.type, { files })} accept="application/pdf,image/*" />
                        {r.expires && (
                          <TextField label="Expiry Date" type="date" value={draft.docs[r.type].expiry} onChange={(e) => setDoc(r.type, { expiry: e.target.value })} error={errors[`doc:${r.type}`]} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {current.key === 'photos' && (
                <>
                  <p className={styles.lead}>Clear photos help forwarders trust your fleet and speed up verification. Front and back views are recommended at minimum.</p>
                  <div className={styles.photoGrid}>
                    {VEHICLE_PHOTO_SLOTS.map((slot) => (
                      <div key={slot} className={styles.photoSlot}>
                        <span className={styles.label}>{slot}{(slot === 'Front' || slot === 'Back') && <Tag tone="blue" style={{ marginLeft: 6 }}>Recommended</Tag>}</span>
                        {draft.photos[slot][0] ? (
                          <div className={styles.photoPreview}>
                            <img src={draft.photos[slot][0].url} alt={`${slot} view`} />
                            <Button size="sm" variant="outline" icon="trash-2" onClick={() => setDraft((d) => ({ ...d, photos: { ...d.photos, [slot]: [] } }))}>Remove</Button>
                          </div>
                        ) : (
                          <FileDrop compact accept="image/*" hint="JPG or PNG" files={[]} onChange={(files) => setDraft((d) => ({ ...d, photos: { ...d.photos, [slot]: files } }))} />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {current.key === 'driver' && (
                <>
                  <p className={styles.lead}>Assign one of your onboarded drivers to this truck now, or skip and assign later from the truck page.</p>
                  <div className={styles.driverTools}>
                    <SearchField placeholder="Search drivers by name, phone, licence..." value={driverQuery} onChange={(e) => setDriverQuery(e.target.value)} />
                    <Button variant={draft.driverId ? 'outline' : 'secondary'} onClick={() => set('driverId')(null)}>{draft.driverId ? 'Clear selection' : 'Assign later'}</Button>
                  </div>
                  <PickList items={driverItems} selected={draft.driverId} onSelect={(id) => set('driverId')(id)} empty="No drivers match. Onboard drivers from the Drivers page." />
                </>
              )}

              {current.key === 'review' && (
                <div className={styles.review}>
                  {submitError && <Banner tone="danger" title="Could not add vehicle">{submitError}</Banner>}
                  {docsDone < requiredDocs.length && (
                    <Banner tone="warning" title="Some required documents are missing">
                      {requiredDocs.length - docsDone} required document(s) still to upload. The vehicle will be saved but can’t be dispatched until they’re verified.
                    </Banner>
                  )}
                  <ReviewSection title="Vehicle Details" onEdit={() => goTo(0)} rows={[
                    ['Vehicle Type', CLASS_LABEL[draft.vehicleClass]],
                    ['Registration No.', draft.plate.toUpperCase() || '—'], ['Chassis / VIN', draft.vin.toUpperCase() || '—'],
                    ['Make & Model', `${draft.make} ${draft.model}`.trim() || '—'], ['Year of Manufacture', draft.year || '—'],
                    ['Colour', draft.color || '—'], ['Ownership', draft.ownership], ['Purchase Date', draft.purchaseDate ? formatDisplayDate(draft.purchaseDate) : '—'],
                  ]} />
                  <ReviewSection title="Specifications" onEdit={() => goTo(1)} rows={[
                    ...(!isTrailer ? [['Engine', `${draft.specs.engineType} ${draft.specs.engineCapacity}`.trim()], ['Transmission', draft.specs.transmission]] : []),
                    ['Axles', `${draft.specs.axleConfig} · ${draft.specs.axles} axles`], ['GVW', draft.specs.gvw || '—'], ['Load Capacity', draft.specs.loadCapacity || '—'],
                  ]} />
                  <ReviewSection title="Documents" onEdit={() => goTo(2)} rows={VEHICLE_REQUIREMENTS.map((r) => [
                    r.label,
                    draft.docs[r.type].files.length
                      ? <span key={r.type}>{draft.docs[r.type].files[0].name}{draft.docs[r.type].expiry ? ` · exp. ${formatDisplayDate(draft.docs[r.type].expiry)}` : ''}</span>
                      : <Badge key={r.type} tone={r.required ? 'warning' : 'neutral'}>{r.required ? 'Missing' : 'Not added'}</Badge>,
                  ])} />
                  <ReviewSection title="Photos" onEdit={() => goTo(3)}>
                    {photoCount === 0 ? <span className="tk-meta">No photos added.</span> : (
                      <div className={styles.reviewPhotos}>
                        {VEHICLE_PHOTO_SLOTS.filter((s) => draft.photos[s].length).map((s) => (
                          <figure key={s}><img src={draft.photos[s][0].url} alt={`${s} view`} /><figcaption>{s}</figcaption></figure>
                        ))}
                      </div>
                    )}
                  </ReviewSection>
                  {!isTrailer && (
                    <ReviewSection title="Driver" onEdit={() => goTo(4)} rows={[['Assigned Driver', driver ? `${driver.name} · ${driver.phone}` : 'Assign later']]} />
                  )}
                </div>
              )}
            </div>

            <div className={styles.stepFoot}>
              <Button variant="outline" icon="arrow-left" disabled={step === 0} onClick={() => goTo(step - 1)}>Back</Button>
              {current.key === 'review'
                ? <Button icon="circle-check" disabled={busy} onClick={submit}>{busy ? 'Adding Vehicle…' : 'Add Vehicle to Fleet'}</Button>
                : <Button iconRight="arrow-right" onClick={() => goTo(step + 1)}>{current.key === 'driver' && !draft.driverId ? 'Skip for now' : 'Save & Continue'}</Button>}
            </div>
          </Card>
        </div>

        <aside className={styles.summary}>
          <SectionCard title="Summary">
            <LabelValue label="Registration" value={draft.plate.toUpperCase() || '—'} />
            <LabelValue label="Vehicle" value={`${draft.make} ${draft.model}`.trim() || '—'} />
            <LabelValue label="Year" value={draft.year || '—'} />
            <LabelValue label="Required documents" value={`${docsDone} / ${requiredDocs.length}`} valueTone={docsDone === requiredDocs.length ? 'var(--tk-success)' : 'var(--tk-warning)'} />
            <LabelValue label="Photos" value={`${photoCount} / ${VEHICLE_PHOTO_SLOTS.length}`} />
            {!isTrailer && <LabelValue label="Driver" value={driver?.name || 'Not assigned'} />}
          </SectionCard>
          <Card tone="cool" style={{ display: 'flex', gap: 10 }}>
            <Icon name="shield-check" size={18} color="var(--tk-blue)" />
            <span className="tk-meta">Trukkas verifies registration, insurance and road worthiness against issuing agencies, usually within 24 hours.</span>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ReviewSection({ title, onEdit, rows, children }) {
  return (
    <section className={styles.reviewSection}>
      <div className={styles.reviewHead}>
        <h3>{title}</h3>
        <Button size="sm" variant="ghost" icon="pencil" onClick={onEdit}>Edit</Button>
      </div>
      {rows?.map(([label, value]) => <LabelValue key={label} label={label} value={value} />)}
      {children}
    </section>
  );
}
