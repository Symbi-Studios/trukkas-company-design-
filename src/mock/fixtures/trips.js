// Trips are the individual truck runs that carry out a won job (jobs.js, via
// `jobId`). One job can have many trips: a forwarder may book 2, 5 or 20 trucks
// for the same cargo, and each dispatched truck + driver is its own trip with
// its own status, timeline, documents, costs, notes and messages.
// `status` is the trip stage (see domain/trips.js TRIP_STAGES) or 'Cancelled';
// `delayed` flags an active trip that is running behind schedule.
function trip(entry) {
  return {
    delayed: false,
    trailer: null,
    stageDates: {},
    timeline: [],
    documents: [],
    notes: [],
    costs: [],
    messages: [],
    issues: [],
    ...entry,
  };
}

export const trips = [
  // ---- Active -------------------------------------------------------------
  trip({
    id: 'TRP-0042', jobId: 'TK-2026-000041',
    truckPlate: 'LSD 123 XY', trailer: 'Trailer - 40ft Container', driverId: 'DRV-001', driverName: 'Chinedu Okafor', driverPhone: '+234 802 345 6789',
    status: 'In Transit', progress: 70, currentLocation: 'Along Abuja – Kaduna Expressway', lastUpdated: 'May 31, 2026, 10:24 AM', speedKmh: 78,
    pickupDate: 'May 30, 2026', pickupTime: '08:00 AM', deliveryDate: 'Jun 2, 2026',
    stageDates: { Assigned: 'May 28', 'Picked Up': 'May 30', 'In Transit': 'May 31' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 28, 2026', time: '10:15 AM', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Documents Verified', date: 'May 29, 2026', time: '04:30 PM', detail: 'All required documents verified.', state: 'done', icon: 'file-check' },
      { title: 'Arrived at Pickup Location', date: 'May 30, 2026', time: '08:00 AM', detail: 'Truck arrived at Apapa Port, Lagos.', state: 'done', icon: 'ship' },
      { title: 'Container Picked Up', date: 'May 30, 2026', time: '11:45 AM', detail: 'Container (1 x 40ft) picked up.', reference: 'APAPA-TRK-7891', state: 'done', icon: 'package' },
      { title: 'Left Pickup Location', date: 'May 30, 2026', time: '01:20 PM', detail: 'Departed Apapa Port, Lagos.', state: 'done', icon: 'file-text' },
      { title: 'In Transit', date: 'May 31, 2026', time: '10:24 AM', detail: 'Truck is on the way to Kano.', location: 'Along Abuja – Kaduna Expressway', state: 'active', icon: 'truck' },
      { title: 'Arrive at Destination', date: 'Jun 2, 2026', time: '(ETA)', detail: 'Expected arrival in Kano, Kano State.', state: 'pending', icon: 'map-pin' },
      { title: 'Container Delivered', date: 'Jun 2, 2026', time: '(ETA)', detail: 'Mark as delivered at destination.', state: 'pending', icon: 'package' },
      { title: 'Trip Completed', date: 'Jun 2, 2026', time: '(ETA)', detail: 'Trip will be completed after confirmation.', state: 'pending', icon: 'circle-check' },
    ],
    documents: [
      { name: 'Pickup Note', uploadedOn: 'May 30, 2026', status: 'Uploaded', kind: 'sheet', size: '320 KB' },
      { name: 'Bill of Lading', uploadedOn: 'May 29, 2026', status: 'Uploaded', kind: 'sheet', size: '1.2 MB' },
      { name: 'Container Release Order', uploadedOn: 'May 29, 2026', status: 'Uploaded', kind: 'doc', size: '860 KB' },
      { name: 'Insurance Certificate', uploadedOn: 'May 28, 2026', status: 'Uploaded', kind: 'doc', size: '540 KB' },
      { name: 'Delivery Note', uploadedOn: null, status: 'Pending', kind: 'pdf', size: null },
    ],
    notes: [
      { author: 'Adekunle Adebayo', time: 'May 31, 2026, 10:25 AM', body: 'Driver confirmed he is making good time. No issues so far.' },
    ],
    costs: [
      { id: 'C1', category: 'Fuel', description: 'Diesel – 700 L (Apapa)', amount: 840000, date: 'May 30, 2026' },
      { id: 'C2', category: 'Tolls & Levies', description: 'Lagos–Ibadan & Abuja tolls', amount: 18500, date: 'May 30, 2026' },
      { id: 'C3', category: 'Driver Allowance', description: 'Trip allowance (4 days)', amount: 60000, date: 'May 30, 2026' },
      { id: 'C4', category: 'Port Charges', description: 'Terminal gate-out fee', amount: 25000, date: 'May 30, 2026' },
    ],
    messages: [
      { author: 'Chinedu Okafor', role: 'Driver', time: 'May 31, 2026, 9:58 AM', body: 'Passed Abuja, heading to Kaduna now. Road is clear.' },
      { author: 'Adekunle Adebayo', role: 'You', time: 'May 31, 2026, 10:02 AM', body: 'Great, keep us posted at the next stop.' },
      { author: 'Chinedu Okafor', role: 'Driver', time: 'May 31, 2026, 10:20 AM', body: 'Will do. Stopping for fuel at Zaria in about 2 hours.' },
    ],
  }),
  trip({
    id: 'TRP-0038', jobId: 'TK-2026-000038',
    truckPlate: 'KJA 456 AB', trailer: 'Trailer - 40ft Container', driverId: 'DRV-002', driverName: 'Ibrahim Bello', driverPhone: '+234 803 224 5510',
    status: 'In Transit', progress: 45, currentLocation: 'Along Zaria – Kano road', lastUpdated: 'May 30, 2026, 2:00 PM', speedKmh: 64,
    pickupDate: 'May 28, 2026', pickupTime: '09:00 AM', deliveryDate: 'Jun 1, 2026',
    stageDates: { Assigned: 'May 27', 'Picked Up': 'May 28', 'In Transit': 'May 29' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 27, 2026', time: '9:00 AM', detail: 'Truck 1 of 2 assigned for this job.', state: 'done', icon: 'file-text' },
      { title: 'Container Picked Up', date: 'May 28, 2026', time: '2:10 PM', detail: 'Container 1 of 2 picked up at Apapa Port.', state: 'done', icon: 'package' },
      { title: 'In Transit', date: 'May 30, 2026', time: '2:00 PM', detail: 'Truck is on the way to Kano.', state: 'active', icon: 'truck' },
      { title: 'Arrive at Destination', date: 'Jun 1, 2026', time: '(ETA)', detail: 'Expected arrival in Kano, Kano State.', state: 'pending', icon: 'map-pin' },
      { title: 'Trip Completed', date: 'Jun 1, 2026', time: '(ETA)', detail: 'Trip will be completed after confirmation.', state: 'pending', icon: 'circle-check' },
    ],
    documents: [
      { name: 'Bill of Lading', uploadedOn: 'May 27, 2026', status: 'Uploaded', kind: 'sheet', size: '1.1 MB' },
      { name: 'Container Release Order', uploadedOn: 'May 27, 2026', status: 'Uploaded', kind: 'doc', size: '790 KB' },
      { name: 'Delivery Note', uploadedOn: null, status: 'Pending', kind: 'pdf', size: null },
    ],
    costs: [{ id: 'C1', category: 'Fuel', description: 'Diesel – 650 L', amount: 780000, date: 'May 28, 2026' }],
  }),
  trip({
    id: 'TRP-0033', jobId: 'TK-2026-000032',
    truckPlate: 'ABJ 998 ZZ', trailer: 'Trailer - 20ft Container', driverId: 'DRV-005', driverName: 'Peter Adewale', driverPhone: '+234 813 660 2214',
    status: 'At Destination', progress: 90, currentLocation: 'Aba, Abia State', lastUpdated: 'May 31, 2026, 8:10 AM', speedKmh: 0,
    pickupDate: 'May 27, 2026', pickupTime: '08:00 AM', deliveryDate: 'May 31, 2026',
    stageDates: { Assigned: 'May 22', 'Picked Up': 'May 27', 'In Transit': 'May 27', 'At Destination': 'May 31' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 22, 2026', time: '11:00 AM', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Container Picked Up', date: 'May 27, 2026', time: '8:00 AM', detail: 'Container picked up at Onne Port.', state: 'done', icon: 'package' },
      { title: 'In Transit', date: 'May 27, 2026', time: '10:30 AM', detail: 'En route to Aba.', state: 'done', icon: 'truck' },
      { title: 'Arrived at Destination', date: 'May 31, 2026', time: '8:10 AM', detail: 'Truck arrived in Aba, awaiting offload confirmation.', state: 'active', icon: 'map-pin' },
      { title: 'Container Delivered', date: 'Pending', time: '', detail: 'Mark as delivered at destination.', state: 'pending', icon: 'package' },
    ],
    documents: [{ name: 'Bill of Lading', uploadedOn: 'May 21, 2026', status: 'Uploaded', kind: 'sheet', size: '980 KB' }],
  }),
  trip({
    id: 'TRP-0035', jobId: 'TK-2026-000026',
    truckPlate: 'LSD 456 TY', trailer: 'Trailer - 40ft HC Container', driverId: 'DRV-006', driverName: 'Emeka Daniels', driverPhone: '+234 701 998 4453',
    status: 'In Transit', delayed: true, progress: 55, currentLocation: 'Along Benin – Warri road', lastUpdated: 'May 31, 2026, 6:40 AM', speedKmh: 0,
    pickupDate: 'May 29, 2026', pickupTime: '09:20 AM', deliveryDate: 'May 31, 2026',
    stageDates: { Assigned: 'May 24', 'Picked Up': 'May 29', 'In Transit': 'May 29' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 24, 2026', time: '5:00 PM', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Container Picked Up', date: 'May 29, 2026', time: '9:20 AM', detail: 'Container picked up at Tin Can Port.', state: 'done', icon: 'package' },
      { title: 'In Transit', date: 'May 31, 2026', time: '6:40 AM', detail: 'Held at a checkpoint near Sapele. Delay reported.', state: 'active', icon: 'truck' },
      { title: 'Arrive at Destination', date: 'May 31, 2026', time: '(ETA)', detail: 'Expected arrival in Warri, Delta State.', state: 'pending', icon: 'map-pin' },
    ],
    documents: [
      { name: 'Bill of Lading', uploadedOn: 'May 28, 2026', status: 'Uploaded', kind: 'sheet', size: '1.0 MB' },
      { name: 'Customs Permit', uploadedOn: 'May 28, 2026', status: 'Uploaded', kind: 'doc', size: '410 KB' },
    ],
    issues: [{ type: 'Delay', details: 'Held at a checkpoint near Sapele.', time: 'May 31, 2026, 6:40 AM' }],
  }),

  // ---- Upcoming (assigned, not yet picked up) -------------------------------
  trip({
    id: 'TRP-0043', jobId: 'TK-2026-000044',
    truckPlate: 'APP 789 CD', trailer: 'Flatbed Trailer', driverId: 'DRV-003', driverName: 'Samuel Eze', driverPhone: '+234 805 771 3392',
    status: 'Assigned', progress: 10, currentLocation: 'Apapa, Lagos (yard)', lastUpdated: 'May 30, 2026, 4:00 PM', speedKmh: 0,
    pickupDate: 'Jun 3, 2026', pickupTime: '07:00 AM', deliveryDate: 'Jun 5, 2026',
    stageDates: { Assigned: 'May 30' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 30, 2026', time: '4:00 PM', detail: 'Truck 1 of 5 assigned for this job.', state: 'done', icon: 'file-text' },
      { title: 'Arrive at Pickup Location', date: 'Jun 3, 2026', time: '(Scheduled)', detail: 'Ewekoro plant loading bay.', state: 'pending', icon: 'map-pin' },
    ],
  }),
  trip({
    id: 'TRP-0044', jobId: 'TK-2026-000044',
    truckPlate: 'PHC 112 AB', trailer: 'Flatbed Trailer', driverId: 'DRV-007', driverName: 'John Udo', driverPhone: '+234 902 331 7765',
    status: 'Assigned', progress: 10, currentLocation: 'Onne, Rivers (yard)', lastUpdated: 'May 30, 2026, 4:05 PM', speedKmh: 0,
    pickupDate: 'Jun 3, 2026', pickupTime: '09:00 AM', deliveryDate: 'Jun 5, 2026',
    stageDates: { Assigned: 'May 30' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 30, 2026', time: '4:05 PM', detail: 'Truck 2 of 5 assigned for this job.', state: 'done', icon: 'file-text' },
      { title: 'Arrive at Pickup Location', date: 'Jun 3, 2026', time: '(Scheduled)', detail: 'Ewekoro plant loading bay.', state: 'pending', icon: 'map-pin' },
    ],
  }),

  // ---- Completed -----------------------------------------------------------
  trip({
    id: 'TRP-0039', jobId: 'TK-2026-000038',
    truckPlate: 'PHC 112 AB', trailer: 'Trailer - 40ft Container', driverId: 'DRV-007', driverName: 'John Udo', driverPhone: '+234 902 331 7765',
    status: 'Completed', progress: 100, currentLocation: 'Kano, Kano State', lastUpdated: 'May 31, 2026, 11:30 AM',
    pickupDate: 'May 28, 2026', deliveryDate: 'May 31, 2026',
    stageDates: { Assigned: 'May 27', 'Picked Up': 'May 28', 'In Transit': 'May 28', 'At Destination': 'May 31', Completed: 'May 31' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 27, 2026', time: '9:05 AM', detail: 'Truck 2 of 2 assigned for this job.', state: 'done', icon: 'file-text' },
      { title: 'Container Delivered', date: 'May 31, 2026', time: '11:10 AM', detail: 'Delivered and confirmed by consignee.', state: 'done', icon: 'package' },
      { title: 'Trip Completed', date: 'May 31, 2026', time: '11:30 AM', detail: 'Trip closed. Payout scheduled.', state: 'done', icon: 'circle-check' },
    ],
    documents: [{ name: 'Delivery Note', uploadedOn: 'May 31, 2026', status: 'Uploaded', kind: 'pdf', size: '220 KB' }],
  }),
  trip({
    id: 'TRP-0037', jobId: 'TK-2026-000012',
    truckPlate: 'PHC 112 AB', driverId: 'DRV-007', driverName: 'John Udo', driverPhone: '+234 902 331 7765',
    status: 'Completed', progress: 100, currentLocation: 'Port Harcourt, Rivers', lastUpdated: 'May 18, 2026, 5:20 PM',
    pickupDate: 'May 15, 2026', deliveryDate: 'May 18, 2026',
    stageDates: { Assigned: 'May 10', 'Picked Up': 'May 15', 'In Transit': 'May 15', 'At Destination': 'May 18', Completed: 'May 18' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 10, 2026', time: '', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Cargo Delivered', date: 'May 18, 2026', time: '5:20 PM', detail: 'Delivered and confirmed by consignee.', state: 'done', icon: 'package' },
      { title: 'Trip Completed', date: 'May 18, 2026', time: '5:45 PM', detail: 'Trip closed. Payout scheduled.', state: 'done', icon: 'circle-check' },
    ],
    documents: [{ name: 'Delivery Note', uploadedOn: 'May 18, 2026', status: 'Uploaded', kind: 'pdf', size: '240 KB' }],
  }),
  trip({
    id: 'TRP-0036', jobId: 'TK-2026-000028',
    truckPlate: 'APP 789 CD', driverId: 'DRV-003', driverName: 'Samuel Eze', driverPhone: '+234 805 771 3392',
    status: 'Completed', progress: 100, currentLocation: 'Kaduna, Kaduna State', lastUpdated: 'May 14, 2026, 9:45 AM',
    pickupDate: 'May 12, 2026', deliveryDate: 'May 14, 2026',
    stageDates: { Assigned: 'May 8', 'Picked Up': 'May 12', 'In Transit': 'May 12', 'At Destination': 'May 14', Completed: 'May 14' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 8, 2026', time: '', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Trip Completed', date: 'May 14, 2026', time: '9:45 AM', detail: 'Delivered and confirmed.', state: 'done', icon: 'circle-check' },
    ],
  }),
  trip({
    id: 'TRP-0034', jobId: 'TK-2026-000021',
    truckPlate: 'TKR 987 EF', driverId: 'DRV-004', driverName: 'Musa Garba', driverPhone: '+234 806 442 9981',
    status: 'Completed', progress: 100, currentLocation: 'Ilorin, Kwara State', lastUpdated: 'May 7, 2026, 3:15 PM',
    pickupDate: 'May 5, 2026', deliveryDate: 'May 7, 2026',
    stageDates: { Assigned: 'Apr 29', 'Picked Up': 'May 5', 'In Transit': 'May 5', 'At Destination': 'May 7', Completed: 'May 7' },
    timeline: [
      { title: 'Trip Assigned', date: 'Apr 29, 2026', time: '', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Trip Completed', date: 'May 7, 2026', time: '3:15 PM', detail: 'Delivered and confirmed.', state: 'done', icon: 'circle-check' },
    ],
  }),
  trip({
    id: 'TRP-0040', jobId: 'TK-2026-000018',
    truckPlate: 'LSD 123 XY', driverId: 'DRV-001', driverName: 'Chinedu Okafor', driverPhone: '+234 802 345 6789',
    status: 'Completed', progress: 100, currentLocation: 'Sokoto, Sokoto State', lastUpdated: 'Apr 29, 2026, 6:00 PM',
    pickupDate: 'Apr 26, 2026', deliveryDate: 'Apr 29, 2026',
    stageDates: { Assigned: 'Apr 22', 'Picked Up': 'Apr 26', 'In Transit': 'Apr 26', 'At Destination': 'Apr 29', Completed: 'Apr 29' },
    timeline: [
      { title: 'Trip Assigned', date: 'Apr 22, 2026', time: '', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Trip Completed', date: 'Apr 29, 2026', time: '6:00 PM', detail: 'Delivered and confirmed.', state: 'done', icon: 'circle-check' },
    ],
  }),
  trip({
    id: 'TRP-0031', jobId: 'TK-2026-000019',
    truckPlate: 'ABJ 998 ZZ', driverId: 'DRV-005', driverName: 'Peter Adewale', driverPhone: '+234 813 660 2214',
    status: 'Completed', progress: 100, currentLocation: 'Kaduna, Kaduna State', lastUpdated: 'Apr 21, 2026, 2:30 PM',
    pickupDate: 'Apr 18, 2026', deliveryDate: 'Apr 21, 2026',
    stageDates: { Assigned: 'Apr 14', 'Picked Up': 'Apr 18', 'In Transit': 'Apr 18', 'At Destination': 'Apr 21', Completed: 'Apr 21' },
    timeline: [
      { title: 'Trip Assigned', date: 'Apr 14, 2026', time: '', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Trip Completed', date: 'Apr 21, 2026', time: '2:30 PM', detail: 'Delivered and confirmed.', state: 'done', icon: 'circle-check' },
    ],
  }),

  trip({
    id: 'TRP-0030', jobId: 'TK-2026-000012',
    truckPlate: 'APP 789 CD', driverId: 'DRV-003', driverName: 'Samuel Eze', driverPhone: '+234 805 771 3392',
    status: 'Completed', progress: 100, currentLocation: 'Port Harcourt, Rivers', lastUpdated: 'May 18, 2026, 7:10 PM',
    pickupDate: 'May 15, 2026', deliveryDate: 'May 18, 2026',
    stageDates: { Assigned: 'May 10', 'Picked Up': 'May 15', 'In Transit': 'May 15', 'At Destination': 'May 18', Completed: 'May 18' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 10, 2026', time: '', detail: 'Truck 2 of 2 assigned for this job.', state: 'done', icon: 'file-text' },
      { title: 'Trip Completed', date: 'May 18, 2026', time: '7:10 PM', detail: 'Delivered and confirmed.', state: 'done', icon: 'circle-check' },
    ],
    documents: [{ name: 'Delivery Note', uploadedOn: 'May 18, 2026', status: 'Uploaded', kind: 'pdf', size: '230 KB' }],
  }),
  trip({
    id: 'TRP-0029', jobId: 'TK-2026-000028',
    truckPlate: 'TKR 987 EF', driverId: 'DRV-004', driverName: 'Musa Garba', driverPhone: '+234 806 442 9981',
    status: 'Completed', progress: 100, currentLocation: 'Kaduna, Kaduna State', lastUpdated: 'May 14, 2026, 1:30 PM',
    pickupDate: 'May 12, 2026', deliveryDate: 'May 14, 2026',
    stageDates: { Assigned: 'May 8', 'Picked Up': 'May 12', 'In Transit': 'May 12', 'At Destination': 'May 14', Completed: 'May 14' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 8, 2026', time: '', detail: 'Truck 2 of 2 assigned for this job.', state: 'done', icon: 'file-text' },
      { title: 'Trip Completed', date: 'May 14, 2026', time: '1:30 PM', detail: 'Delivered and confirmed.', state: 'done', icon: 'circle-check' },
    ],
  }),

  // ---- Cancelled -----------------------------------------------------------
  trip({
    id: 'TRP-0032', jobId: 'TK-2026-000008',
    truckPlate: 'LAG 321 GH', driverId: null, driverName: null, driverPhone: null,
    status: 'Cancelled', progress: 0, currentLocation: 'Onne Port, Rivers', lastUpdated: 'May 16, 2026, 9:00 AM',
    pickupDate: 'May 18, 2026', deliveryDate: 'May 21, 2026',
    stageDates: { Assigned: 'May 12' },
    timeline: [
      { title: 'Trip Assigned', date: 'May 12, 2026', time: '', detail: 'Trip assigned to SpeedLine Logistics Limited.', state: 'done', icon: 'file-text' },
      { title: 'Trip Cancelled', date: 'May 16, 2026', time: '9:00 AM', detail: 'Forwarder cancelled the shipment.', state: 'cancelled', icon: 'ban' },
    ],
  }),
];
