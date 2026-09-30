// Compliance documents. Each belongs to one owner (see domain/documents.js):
//   ownerType 'company' → the trucking company's business/KYB documents
//   ownerType 'vehicle' → ownerId is the plate (`truckPlate` kept for older callers)
//   ownerType 'driver'  → ownerId is the driver id
// Job/trip paperwork is not stored here; it lives on the job or trip.
// Sensitive ID numbers (NIN, BVN) are stored masked — last 4 digits only.
let seq = 1;
function doc(entry) {
  return { id: `DOC-${String(seq++).padStart(4, '0')}`, fileSize: '—', number: null, ...entry };
}
function vehicleDoc(entry) {
  return doc({ ownerType: 'vehicle', ownerId: entry.truckPlate, ...entry });
}
function companyDoc(entry) {
  return doc({ ownerType: 'company', ownerId: 'CMP-SPEEDLINE', ...entry });
}
function driverDoc(entry) {
  return doc({ ownerType: 'driver', ...entry });
}

export const documents = [
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Vehicle Registration Certificate.pdf', type: 'Registration', expiryDate: 'Nov 30, 2026', status: 'Valid', uploadedOn: 'Jan 12, 2023', fileSize: '1.1 MB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Dec 15, 2026', status: 'Valid', uploadedOn: 'Jan 10, 2023', fileSize: '540 KB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Nov 30, 2026', status: 'Valid', uploadedOn: 'Jan 15, 2023', fileSize: '620 KB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Emission Test Report.jpg', type: 'Emission', expiryDate: 'Oct 10, 2026', status: 'Valid', uploadedOn: 'Feb 3, 2023', fileSize: '2.3 MB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Customs Permit.pdf', type: 'Customs', expiryDate: 'Sep 20, 2026', status: 'Valid', uploadedOn: 'Mar 12, 2023', fileSize: '410 KB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Tanker Fitness Certificate.pdf', type: 'Special Permit', expiryDate: 'Aug 18, 2026', status: 'Expiring Soon', uploadedOn: 'Feb 20, 2023', fileSize: '380 KB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Vehicle Photo (Front).jpg', type: 'Vehicle Photos', expiryDate: '—', status: 'N/A', uploadedOn: 'Jan 12, 2023', fileSize: '3.1 MB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Vehicle Photo (Back).jpg', type: 'Vehicle Photos', expiryDate: '—', status: 'N/A', uploadedOn: 'Jan 12, 2023', fileSize: '2.9 MB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Load Capacity Certificate.pdf', type: 'Technical', expiryDate: 'Jul 25, 2027', status: 'Valid', uploadedOn: 'Apr 5, 2023', fileSize: '300 KB' }),
  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'ADR Certificate.pdf', type: 'Safety', expiryDate: 'Jun 12, 2026', status: 'Expiring Soon', uploadedOn: 'Apr 10, 2023', fileSize: '290 KB' }),

  vehicleDoc({ truckPlate: 'KJA 456 AB', name: 'Vehicle Registration Certificate.pdf', type: 'Registration', expiryDate: 'Jan 2, 2027', status: 'Valid', uploadedOn: 'Mar 4, 2022', fileSize: '1.0 MB' }),
  vehicleDoc({ truckPlate: 'KJA 456 AB', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Aug 2, 2026', status: 'Expiring Soon', uploadedOn: 'Aug 2, 2022', fileSize: '520 KB' }),
  vehicleDoc({ truckPlate: 'KJA 456 AB', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Jul 14, 2026', status: 'Expiring Soon', uploadedOn: 'Jul 14, 2022', fileSize: '610 KB' }),

  vehicleDoc({ truckPlate: 'APP 789 CD', name: 'Vehicle Registration Certificate.pdf', type: 'Registration', expiryDate: 'Sep 18, 2027', status: 'Valid', uploadedOn: 'Sep 18, 2021', fileSize: '1.2 MB' }),
  vehicleDoc({ truckPlate: 'APP 789 CD', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Feb 20, 2027', status: 'Valid', uploadedOn: 'Feb 20, 2023', fileSize: '500 KB' }),

  vehicleDoc({ truckPlate: 'TKR 987 EF', name: 'ADR Certificate.pdf', type: 'Safety', expiryDate: 'Mar 11, 2027', status: 'Valid', uploadedOn: 'Mar 11, 2023', fileSize: '310 KB' }),
  vehicleDoc({ truckPlate: 'TKR 987 EF', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Mar 11, 2027', status: 'Valid', uploadedOn: 'Mar 11, 2023', fileSize: '480 KB' }),

  vehicleDoc({ truckPlate: 'LAG 321 GH', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Jan 5, 2026', status: 'Expired', uploadedOn: 'Jan 5, 2025', fileSize: '470 KB' }),
  vehicleDoc({ truckPlate: 'LAG 321 GH', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Dec 1, 2025', status: 'Expired', uploadedOn: 'Dec 1, 2024', fileSize: '590 KB' }),

  vehicleDoc({ truckPlate: 'PHC 665 KL', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Feb 8, 2026', status: 'Expired', uploadedOn: 'Feb 8, 2025', fileSize: '600 KB' }),

  vehicleDoc({ truckPlate: 'LSD 123 XY', name: 'Purchase Receipt & Customs Papers.pdf', type: 'Proof of Ownership', expiryDate: '—', status: 'Valid', uploadedOn: 'Jan 12, 2023', fileSize: '2.4 MB' }),
  vehicleDoc({ truckPlate: 'KJA 456 AB', name: 'Purchase Receipt.pdf', type: 'Proof of Ownership', expiryDate: '—', status: 'Valid', uploadedOn: 'Mar 4, 2022', fileSize: '900 KB' }),
  vehicleDoc({ truckPlate: 'APP 789 CD', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Jan 4, 2027', status: 'Valid', uploadedOn: 'Jan 4, 2026', fileSize: '580 KB' }),
  vehicleDoc({ truckPlate: 'PHC 112 AB', name: 'Vehicle Registration Certificate.pdf', type: 'Registration', expiryDate: 'Jan 22, 2027', status: 'Valid', uploadedOn: 'Jan 22, 2024', fileSize: '1.0 MB' }),
  vehicleDoc({ truckPlate: 'PHC 112 AB', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Jul 4, 2026', status: 'Expiring Soon', uploadedOn: 'Jul 4, 2025', fileSize: '520 KB' }),

  // ---- Company (business onboarding / KYB) --------------------------------
  companyDoc({ name: 'CAC Certificate of Incorporation.pdf', type: 'CAC Certificate', number: 'RC 1483920', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 2, 2021', fileSize: '1.4 MB' }),
  companyDoc({ name: 'CAC Status Report.pdf', type: 'CAC Status Report', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 2, 2021', fileSize: '860 KB' }),
  companyDoc({ name: 'Memorandum of Association.pdf', type: 'Memorandum of Association', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 2, 2021', fileSize: '1.1 MB' }),
  companyDoc({ name: 'FIRS TIN Certificate.pdf', type: 'TIN', number: '21874503-0001', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 2, 2021', fileSize: '420 KB' }),
  companyDoc({ name: 'NIN — Adekunle Adebayo', type: 'NIN', number: '•••••••4417', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 2, 2021' }),
  companyDoc({ name: 'BVN — Adekunle Adebayo', type: 'BVN', number: '•••••••9082', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 2, 2021' }),
  companyDoc({ name: 'International Passport — Adekunle Adebayo.pdf', type: 'Government ID', expiryDate: 'Aug 14, 2029', status: 'Verified', uploadedOn: 'Mar 2, 2021', fileSize: '1.9 MB' }),
  companyDoc({ name: 'Utility Bill (Apr 2026).pdf', type: 'Proof of Address', expiryDate: 'Jul 30, 2026', status: 'Expiring Soon', uploadedOn: 'May 2, 2026', fileSize: '640 KB' }),
  companyDoc({ name: 'GTBank Account Confirmation Letter.pdf', type: 'Bank Verification', number: '•••••••4821', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 3, 2021', fileSize: '310 KB' }),
  companyDoc({ name: 'Goods-in-Transit Insurance Policy.pdf', type: 'Goods-in-Transit Insurance', expiryDate: 'Dec 31, 2026', status: 'Valid', uploadedOn: 'Jan 4, 2026', fileSize: '2.2 MB' }),

  // ---- Drivers ---------------------------------------------------------------
  driverDoc({ ownerId: 'DRV-001', name: "Driver's Licence — Chinedu Okafor.pdf", type: "Driver's License", number: 'LIC-LG-118824', expiryDate: 'Mar 14, 2027', status: 'Verified', uploadedOn: 'Feb 4, 2021', fileSize: '720 KB' }),
  driverDoc({ ownerId: 'DRV-001', name: 'NIN — Chinedu Okafor', type: 'NIN', number: '•••••••2231', expiryDate: '—', status: 'Verified', uploadedOn: 'Feb 4, 2021' }),
  driverDoc({ ownerId: 'DRV-001', name: 'Passport Photo.jpg', type: 'Passport Photo', expiryDate: '—', status: 'Verified', uploadedOn: 'Feb 4, 2021', fileSize: '240 KB' }),
  driverDoc({ ownerId: 'DRV-001', name: 'Medical Fitness Certificate.pdf', type: 'Medical Fitness', expiryDate: 'Jan 20, 2027', status: 'Valid', uploadedOn: 'Jan 20, 2026', fileSize: '380 KB' }),
  driverDoc({ ownerId: 'DRV-001', name: 'Guarantor Form.pdf', type: 'Guarantor Form', expiryDate: '—', status: 'Verified', uploadedOn: 'Feb 4, 2021', fileSize: '1.1 MB' }),
  driverDoc({ ownerId: 'DRV-001', name: 'Defensive Driving Certificate.pdf', type: 'Defensive Driving', expiryDate: 'Nov 2, 2026', status: 'Valid', uploadedOn: 'Nov 2, 2024', fileSize: '450 KB' }),

  driverDoc({ ownerId: 'DRV-002', name: "Driver's Licence — Ibrahim Bello.pdf", type: "Driver's License", number: 'LIC-KN-220417', expiryDate: 'Jul 2, 2026', status: 'Expiring Soon', uploadedOn: 'Aug 10, 2019', fileSize: '700 KB' }),
  driverDoc({ ownerId: 'DRV-002', name: 'NIN — Ibrahim Bello', type: 'NIN', number: '•••••••7710', expiryDate: '—', status: 'Verified', uploadedOn: 'Aug 10, 2019' }),
  driverDoc({ ownerId: 'DRV-002', name: 'Passport Photo.jpg', type: 'Passport Photo', expiryDate: '—', status: 'Verified', uploadedOn: 'Aug 10, 2019', fileSize: '210 KB' }),
  driverDoc({ ownerId: 'DRV-002', name: 'Medical Fitness Certificate.pdf', type: 'Medical Fitness', expiryDate: 'Mar 1, 2026', status: 'Expired', uploadedOn: 'Mar 1, 2025', fileSize: '360 KB' }),
  driverDoc({ ownerId: 'DRV-002', name: 'Guarantor Form.pdf', type: 'Guarantor Form', expiryDate: '—', status: 'Verified', uploadedOn: 'Aug 10, 2019', fileSize: '1.0 MB' }),

  driverDoc({ ownerId: 'DRV-003', name: "Driver's Licence — Samuel Eze.pdf", type: "Driver's License", number: 'LIC-LG-330912', expiryDate: 'Jan 28, 2027', status: 'Verified', uploadedOn: 'Mar 6, 2022', fileSize: '690 KB' }),
  driverDoc({ ownerId: 'DRV-003', name: 'NIN — Samuel Eze', type: 'NIN', number: '•••••••5530', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 6, 2022' }),
  driverDoc({ ownerId: 'DRV-003', name: 'Passport Photo.jpg', type: 'Passport Photo', expiryDate: '—', status: 'Verified', uploadedOn: 'Mar 6, 2022', fileSize: '230 KB' }),
  driverDoc({ ownerId: 'DRV-003', name: 'Medical Fitness Certificate.pdf', type: 'Medical Fitness', expiryDate: 'Feb 14, 2027', status: 'Valid', uploadedOn: 'Feb 14, 2026', fileSize: '370 KB' }),

  driverDoc({ ownerId: 'DRV-004', name: "Driver's Licence — Musa Garba.pdf", type: "Driver's License", number: 'LIC-KD-441290', expiryDate: 'Sep 19, 2026', status: 'Valid', uploadedOn: 'May 12, 2018', fileSize: '710 KB' }),
  driverDoc({ ownerId: 'DRV-004', name: 'NIN — Musa Garba', type: 'NIN', number: '•••••••6604', expiryDate: '—', status: 'Verified', uploadedOn: 'May 12, 2018' }),
  driverDoc({ ownerId: 'DRV-004', name: 'Passport Photo.jpg', type: 'Passport Photo', expiryDate: '—', status: 'Verified', uploadedOn: 'May 12, 2018', fileSize: '200 KB' }),
  driverDoc({ ownerId: 'DRV-004', name: 'Medical Fitness Certificate.pdf', type: 'Medical Fitness', expiryDate: 'Oct 3, 2026', status: 'Valid', uploadedOn: 'Oct 3, 2025', fileSize: '350 KB' }),
  driverDoc({ ownerId: 'DRV-004', name: 'Guarantor Form.pdf', type: 'Guarantor Form', expiryDate: '—', status: 'Verified', uploadedOn: 'May 12, 2018', fileSize: '1.2 MB' }),

  driverDoc({ ownerId: 'DRV-005', name: "Driver's Licence — Peter Adewale.pdf", type: "Driver's License", number: 'LIC-KD-556123', expiryDate: 'Dec 30, 2026', status: 'Verified', uploadedOn: 'Nov 20, 2020', fileSize: '680 KB' }),
  driverDoc({ ownerId: 'DRV-005', name: 'NIN — Peter Adewale', type: 'NIN', number: '•••••••3398', expiryDate: '—', status: 'Verified', uploadedOn: 'Nov 20, 2020' }),
  driverDoc({ ownerId: 'DRV-005', name: 'Guarantor Form.pdf', type: 'Guarantor Form', expiryDate: '—', status: 'Verified', uploadedOn: 'Nov 20, 2020', fileSize: '980 KB' }),

  driverDoc({ ownerId: 'DRV-006', name: "Driver's Licence — Emeka Daniels.pdf", type: "Driver's License", number: 'LIC-AN-118820', expiryDate: 'May 4, 2027', status: 'Verified', uploadedOn: 'Jan 15, 2023', fileSize: '700 KB' }),
  driverDoc({ ownerId: 'DRV-006', name: 'NIN — Emeka Daniels', type: 'NIN', number: '•••••••8126', expiryDate: '—', status: 'Verified', uploadedOn: 'Jan 15, 2023' }),

  driverDoc({ ownerId: 'DRV-007', name: "Driver's Licence — John Udo.pdf", type: "Driver's License", number: 'LIC-RV-778120', expiryDate: 'Feb 11, 2027', status: 'Verified', uploadedOn: 'Jun 3, 2019', fileSize: '690 KB' }),
  driverDoc({ ownerId: 'DRV-007', name: 'NIN — John Udo', type: 'NIN', number: '•••••••1045', expiryDate: '—', status: 'Verified', uploadedOn: 'Jun 3, 2019' }),
  driverDoc({ ownerId: 'DRV-007', name: 'Passport Photo.jpg', type: 'Passport Photo', expiryDate: '—', status: 'Verified', uploadedOn: 'Jun 3, 2019', fileSize: '220 KB' }),
  driverDoc({ ownerId: 'DRV-007', name: 'Medical Fitness Certificate.pdf', type: 'Medical Fitness', expiryDate: 'Dec 9, 2026', status: 'Valid', uploadedOn: 'Dec 9, 2025', fileSize: '340 KB' }),
  driverDoc({ ownerId: 'DRV-007', name: 'Guarantor Form.pdf', type: 'Guarantor Form', expiryDate: '—', status: 'Verified', uploadedOn: 'Jun 3, 2019', fileSize: '1.1 MB' }),

  driverDoc({ ownerId: 'DRV-008', name: "Driver's Licence — David Mark.pdf", type: "Driver's License", number: 'LIC-LG-902341', expiryDate: 'Oct 6, 2026', status: 'Valid', uploadedOn: 'Sep 2, 2021', fileSize: '700 KB' }),
  driverDoc({ ownerId: 'DRV-009', name: "Driver's Licence — Daniel Etim.pdf", type: "Driver's License", number: 'LIC-CR-120984', expiryDate: 'Apr 21, 2027', status: 'Pending Review', uploadedOn: 'May 28, 2026', fileSize: '730 KB' }),
];
