// @ts-nocheck -- legacy module: complete TypeScript typing during migration.
// Shared vocabulary for rule-driven fleet maintenance (see the Maintenance &
// Demurrage Operations Guide). Wire values are the proposed backend enums.

export const MAINTENANCE_CATEGORIES = [
  { value: 'ENGINE_SERVICE', label: 'Engine servicing' },
  { value: 'OIL_FILTER', label: 'Oil and filter replacement' },
  { value: 'BRAKES', label: 'Brake inspection' },
  { value: 'TYRES', label: 'Tyre replacement' },
  { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'ELECTRICAL', label: 'Electrical systems' },
  { value: 'COOLING', label: 'Cooling systems' },
  { value: 'GENERAL_INSPECTION', label: 'General vehicle inspection' },
  { value: 'ROADWORTHINESS', label: 'Roadworthiness inspection' },
  { value: 'OTHER', label: 'Other repairs' },
];
export const categoryLabel = (value) => MAINTENANCE_CATEGORIES.find((item) => item.value === value)?.label ?? '—';

export const RULE_TRIGGERS = [
  { value: 'KM', label: 'Distance', unit: 'km', hint: 'Every N kilometres since the last verified service' },
  { value: 'DAYS', label: 'Time', unit: 'days', hint: 'Every N days since the last verified service' },
  { value: 'ENGINE_HOURS', label: 'Engine hours', unit: 'hours', hint: 'Every N engine hours (needs telematics)' },
];
export const triggerLabel = (trigger) => {
  const meta = RULE_TRIGGERS.find((item) => item.value === trigger?.type);
  return meta && Number.isFinite(trigger?.interval) ? `Every ${trigger.interval.toLocaleString('en-NG')} ${meta.unit}` : '—';
};

export const VEHICLE_CLASSES = [
  { value: 'HEAD', label: 'Truck head' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'TANKER', label: 'Tanker' },
  { value: 'SPECIALIZED', label: 'Specialized' },
  { value: 'OTHER', label: 'Other' },
];

// Truck-level compliance (worst of its requirements). Separate from a service
// record's status and from the restriction flag.
export const COMPLIANCE = {
  UP_TO_DATE: { label: 'Up to Date', tone: 'success' },
  DUE_SOON: { label: 'Due Soon', tone: 'warning' },
  DUE: { label: 'Due', tone: 'orange' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  MAINTENANCE_REQUIRED: { label: 'Maintenance Required', tone: 'danger' },
  UNDER_MAINTENANCE: { label: 'Under Maintenance', tone: 'info' },
};
export const complianceLabel = (value) => COMPLIANCE[value]?.label ?? '—';
export const complianceTone = (value) => COMPLIANCE[value]?.tone ?? 'neutral';

export const INELIGIBILITY = {
  NOT_ACTIVE: 'Truck is not active',
  UNDER_MAINTENANCE: 'Maintenance in progress',
  RESTRICTED: 'Restricted by Trukkas',
  MAINTENANCE_OVERDUE: 'Mandatory maintenance overdue',
};

export const EXCEPTION_KINDS = {
  MANUAL_RESTRICTION: 'Manual restriction',
  MANUAL_CLEAR: 'Manual clear',
  OVERDUE_ON_TRIP: 'Overdue during active trip',
  RULE_OVERRIDE: 'Rule override',
};
