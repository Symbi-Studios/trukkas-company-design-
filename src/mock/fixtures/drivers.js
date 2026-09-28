// Drivers onboarded by the company. `truckPlate` is the truck they are assigned to
// (kept in sync with trucks.js `driverId`); `onTimeRate` and `safetyScore` are
// percentages the platform computes from trip history and telematics.
export const drivers = [
  {
    id: 'DRV-001', name: 'Chinedu Okafor', phone: '+234 802 345 6789', email: 'chinedu.okafor@speedlinelogistics.com',
    status: 'On Trip', truckPlate: 'LSD 123 XY', licenseNumber: 'LIC-LG-118824', licenseClass: 'Class E',
    licenseExpiry: 'Mar 14, 2027', address: 'Ajah, Lagos', joined: 'Feb 2021', rating: 4.8, reviewCount: 42,
    tripsCompleted: 96, photo: null, onTimeRate: 96, safetyScore: 92,
    activityLog: [
      { icon: 'truck', tone: 'info', title: 'Assigned to LSD 123 XY', detail: 'Mercedes Actros 2020', time: 'Feb 10, 2021' },
      { icon: 'award', tone: 'success', title: 'Defensive driving course completed', detail: 'Certificate valid to Nov 2026', time: 'Nov 2, 2024' },
    ],
    kyc: 'Verified',
  },
  {
    id: 'DRV-002', name: 'Ibrahim Bello', phone: '+234 803 224 5510', email: 'ibrahim.bello@speedlinelogistics.com',
    status: 'On Trip', truckPlate: 'KJA 456 AB', licenseNumber: 'LIC-KN-220417', licenseClass: 'Class E',
    licenseExpiry: 'Jul 2, 2026', address: 'Sabon Gari, Kano', joined: 'Aug 2019', rating: 4.6, reviewCount: 61,
    tripsCompleted: 148, photo: null, onTimeRate: 89, safetyScore: 85,
    activityLog: [
      { icon: 'triangle-alert', tone: 'warning', title: 'Medical fitness certificate expired', detail: 'Renewal requested', time: 'Mar 1, 2026' },
    ],
    kyc: 'Verified',
  },
  {
    id: 'DRV-003', name: 'Samuel Eze', phone: '+234 805 771 3392', email: 'samuel.eze@speedlinelogistics.com',
    status: 'Available', truckPlate: 'APP 789 CD', licenseNumber: 'LIC-LG-330912', licenseClass: 'Class D',
    licenseExpiry: 'Jan 28, 2027', address: 'Apapa, Lagos', joined: 'Mar 2022', rating: 4.9, reviewCount: 28,
    tripsCompleted: 54, photo: null, onTimeRate: 98, safetyScore: 95,
    activityLog: [],
    kyc: 'Verified',
  },
  {
    id: 'DRV-004', name: 'Musa Garba', phone: '+234 806 442 9981', email: 'musa.garba@speedlinelogistics.com',
    status: 'Available', truckPlate: 'TKR 987 EF', licenseNumber: 'LIC-KD-441290', licenseClass: 'Class E (ADR)',
    licenseExpiry: 'Sep 19, 2026', address: 'Kaduna South, Kaduna', joined: 'May 2018', rating: 4.7, reviewCount: 73,
    tripsCompleted: 201, photo: null, onTimeRate: 93, safetyScore: 90,
    activityLog: [],
    kyc: 'Verified',
  },
  {
    id: 'DRV-005', name: 'Peter Adewale', phone: '+234 813 660 2214', email: 'peter.adewale@speedlinelogistics.com',
    status: 'On Trip', truckPlate: 'ABJ 998 ZZ', licenseNumber: 'LIC-KD-556123', licenseClass: 'Class E',
    licenseExpiry: 'Dec 30, 2026', address: 'Kaduna North, Kaduna', joined: 'Nov 2020', rating: 4.5, reviewCount: 37,
    tripsCompleted: 88, photo: null, onTimeRate: 87, safetyScore: 84,
    activityLog: [],
    kyc: 'Verified',
  },
  {
    id: 'DRV-006', name: 'Emeka Daniels', phone: '+234 701 998 4453', email: 'emeka.daniels@speedlinelogistics.com',
    status: 'On Trip', truckPlate: 'LSD 456 TY', licenseNumber: 'LIC-AN-118820', licenseClass: 'Class D',
    licenseExpiry: 'May 4, 2027', address: 'Onitsha, Anambra', joined: 'Jan 2023', rating: 4.4, reviewCount: 15,
    tripsCompleted: 31, photo: null, onTimeRate: 81, safetyScore: 78,
    activityLog: [
      { icon: 'triangle-alert', tone: 'danger', title: 'Delay reported on TRP-0035', detail: 'Held at a checkpoint near Sapele', time: 'May 31, 2026' },
    ],
    kyc: 'Verified',
  },
  {
    id: 'DRV-007', name: 'John Udo', phone: '+234 902 331 7765', email: 'john.udo@speedlinelogistics.com',
    status: 'Available', truckPlate: 'PHC 112 AB', licenseNumber: 'LIC-RV-778120', licenseClass: 'Class E',
    licenseExpiry: 'Feb 11, 2027', address: 'Port Harcourt, Rivers', joined: 'Jun 2019', rating: 4.6, reviewCount: 54,
    tripsCompleted: 122, photo: null, onTimeRate: 94, safetyScore: 91,
    activityLog: [],
    kyc: 'Verified',
  },
  {
    id: 'DRV-008', name: 'David Mark', phone: '+234 812 004 7731', email: 'david.mark@speedlinelogistics.com',
    status: 'Off Duty', truckPlate: null, licenseNumber: 'LIC-LG-902341', licenseClass: 'Class D',
    licenseExpiry: 'Oct 6, 2026', address: 'Ikeja, Lagos', joined: 'Sep 2021', rating: 4.3, reviewCount: 19,
    tripsCompleted: 40, photo: null, onTimeRate: 90, safetyScore: 88,
    activityLog: [],
    kyc: 'Verified',
  },
  {
    id: 'DRV-009', name: 'Daniel Etim', phone: '+234 809 552 1290', email: 'daniel.etim@speedlinelogistics.com',
    status: 'Off Duty', truckPlate: null, licenseNumber: 'LIC-CR-120984', licenseClass: 'Class E',
    licenseExpiry: 'Apr 21, 2027', address: 'Calabar, Cross River', joined: 'Jul 2020', rating: 4.5, reviewCount: 33,
    tripsCompleted: 76, photo: null, onTimeRate: 92, safetyScore: 89,
    activityLog: [],
    kyc: 'Pending',
  },
];
