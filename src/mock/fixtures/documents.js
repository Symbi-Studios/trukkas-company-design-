// Compliance documents, each attached to one vehicle (`truckPlate`).
let seq = 1;
function doc(entry) {
  return { id: `DOC-${String(seq++).padStart(4, '0')}`, fileSize: '—', ...entry };
}

export const documents = [
  doc({ truckPlate: 'LSD 123 XY', name: 'Vehicle Registration Certificate.pdf', type: 'Registration', expiryDate: 'Nov 30, 2026', status: 'Valid', uploadedOn: 'Jan 12, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Dec 15, 2026', status: 'Valid', uploadedOn: 'Jan 10, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Nov 30, 2026', status: 'Valid', uploadedOn: 'Jan 15, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Emission Test Report.jpg', type: 'Emission', expiryDate: 'Oct 10, 2026', status: 'Valid', uploadedOn: 'Feb 3, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Customs Permit.pdf', type: 'Customs', expiryDate: 'Sep 20, 2026', status: 'Valid', uploadedOn: 'Mar 12, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Tanker Fitness Certificate.pdf', type: 'Special Permit', expiryDate: 'Aug 18, 2026', status: 'Expiring Soon', uploadedOn: 'Feb 20, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Vehicle Photo (Front).jpg', type: 'Vehicle Photos', expiryDate: '—', status: 'N/A', uploadedOn: 'Jan 12, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Vehicle Photo (Back).jpg', type: 'Vehicle Photos', expiryDate: '—', status: 'N/A', uploadedOn: 'Jan 12, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'Load Capacity Certificate.pdf', type: 'Technical', expiryDate: 'Jul 25, 2027', status: 'Valid', uploadedOn: 'Apr 5, 2023' }),
  doc({ truckPlate: 'LSD 123 XY', name: 'ADR Certificate.pdf', type: 'Safety', expiryDate: 'Jun 12, 2026', status: 'Expiring Soon', uploadedOn: 'Apr 10, 2023' }),

  doc({ truckPlate: 'KJA 456 AB', name: 'Vehicle Registration Certificate.pdf', type: 'Registration', expiryDate: 'Jan 2, 2027', status: 'Valid', uploadedOn: 'Mar 4, 2022' }),
  doc({ truckPlate: 'KJA 456 AB', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Aug 2, 2026', status: 'Expiring Soon', uploadedOn: 'Aug 2, 2022' }),
  doc({ truckPlate: 'KJA 456 AB', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Jul 14, 2026', status: 'Expiring Soon', uploadedOn: 'Jul 14, 2022' }),

  doc({ truckPlate: 'APP 789 CD', name: 'Vehicle Registration Certificate.pdf', type: 'Registration', expiryDate: 'Sep 18, 2027', status: 'Valid', uploadedOn: 'Sep 18, 2021' }),
  doc({ truckPlate: 'APP 789 CD', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Feb 20, 2027', status: 'Valid', uploadedOn: 'Feb 20, 2023' }),

  doc({ truckPlate: 'TKR 987 EF', name: 'ADR Certificate.pdf', type: 'Safety', expiryDate: 'Mar 11, 2027', status: 'Valid', uploadedOn: 'Mar 11, 2023' }),
  doc({ truckPlate: 'TKR 987 EF', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Mar 11, 2027', status: 'Valid', uploadedOn: 'Mar 11, 2023' }),

  doc({ truckPlate: 'LAG 321 GH', name: 'Insurance Certificate.pdf', type: 'Insurance', expiryDate: 'Jan 5, 2026', status: 'Expired', uploadedOn: 'Jan 5, 2025' }),
  doc({ truckPlate: 'LAG 321 GH', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Dec 1, 2025', status: 'Expired', uploadedOn: 'Dec 1, 2024' }),

  doc({ truckPlate: 'PHC 665 KL', name: 'Road Worthiness Certificate.pdf', type: 'Road Worthiness', expiryDate: 'Feb 8, 2026', status: 'Expired', uploadedOn: 'Feb 8, 2025' }),
];
