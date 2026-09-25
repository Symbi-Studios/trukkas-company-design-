// Maintenance service records, each attached to one vehicle (`truckPlate`).
let seq = 1;
function record(entry) {
  return { id: `MTN-2026-${String(seq++).padStart(4, '0')}`, ...entry };
}

export const maintenanceRecords = [
  record({ truckPlate: 'LSD 123 XY', date: 'May 10, 2026', serviceType: 'Oil Change', description: 'Engine oil and filter change', odometer: 240000, cost: 85000, status: 'Completed', nextDue: 'Aug 10, 2026' }),
  record({ truckPlate: 'LSD 123 XY', date: 'Mar 15, 2026', serviceType: 'Tire Replacement', description: 'Front tires (2)', odometer: 225000, cost: 320000, status: 'Completed', nextDue: null }),
  record({ truckPlate: 'LSD 123 XY', date: 'Jan 20, 2026', serviceType: 'Brake Service', description: 'Brake pad replacement', odometer: 210000, cost: 180000, status: 'Completed', nextDue: null }),
  record({ truckPlate: 'LSD 123 XY', date: 'Dec 5, 2025', serviceType: 'General Service', description: 'Routine inspection', odometer: 195000, cost: 95000, status: 'Completed', nextDue: 'Mar 5, 2026' }),
  record({ truckPlate: 'LSD 123 XY', date: 'Nov 10, 2025', serviceType: 'Air Filter', description: 'Air filter replacement', odometer: 180000, cost: 45000, status: 'Completed', nextDue: 'Feb 10, 2026' }),
  record({ truckPlate: 'LSD 123 XY', date: 'Sep 1, 2025', serviceType: 'Transmission', description: 'Transmission check', odometer: 160000, cost: 120000, status: 'Completed', nextDue: null }),
  record({ truckPlate: 'LSD 123 XY', date: 'Jun 18, 2026', serviceType: 'Tire Rotation', description: 'Rotate all tires', odometer: 250000, cost: 60000, status: 'Upcoming', nextDue: null }),
  record({ truckPlate: 'LSD 123 XY', date: 'Nov 2, 2025', serviceType: 'Engine Service', description: 'Engine diagnostic and repair', odometer: 175000, cost: 335000, status: 'Overdue', nextDue: null }),

  record({ truckPlate: 'TRL 002', date: 'May 20, 2026', serviceType: 'Wheel Bearing', description: 'Wheel bearing replacement', odometer: 0, cost: 145000, status: 'In Progress', nextDue: null }),
  record({ truckPlate: 'KJA 456 AB', date: 'Apr 2, 2026', serviceType: 'Brake Service', description: 'Brake pad and disc replacement', odometer: 300000, cost: 210000, status: 'Completed', nextDue: 'Oct 2, 2026' }),
  record({ truckPlate: 'APP 789 CD', date: 'Feb 14, 2026', serviceType: 'Oil Change', description: 'Engine oil and filter change', odometer: 140000, cost: 78000, status: 'Completed', nextDue: 'Aug 14, 2026' }),
  record({ truckPlate: 'TKR 987 EF', date: 'Jun 3, 2026', serviceType: 'Tank Inspection', description: 'Annual pressure test', odometer: 198000, cost: 260000, status: 'Upcoming', nextDue: null }),
  record({ truckPlate: 'PHC 665 KL', date: 'May 12, 2026', serviceType: 'Gearbox Overhaul', description: 'Full gearbox rebuild', odometer: 356200, cost: 480000, status: 'In Progress', nextDue: null }),
  record({ truckPlate: 'LAG 321 GH', date: 'Apr 15, 2026', serviceType: 'General Service', description: 'Pending — held for insurance renewal', odometer: 402900, cost: 0, status: 'Overdue', nextDue: null }),
];
