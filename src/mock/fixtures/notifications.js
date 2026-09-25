export const notifications = [
  { id: 'NTF-001', type: 'document', icon: 'file-warning', tone: 'danger', title: 'Document Expiring Soon', body: 'LSD 123 XY – ADR Certificate expires in 12 days.', read: false, createdAt: '2h ago', link: '/fleet/LSD-123-XY' },
  { id: 'NTF-002', type: 'job', icon: 'briefcase', tone: 'info', title: 'New Job Request Available', body: 'Apapa Port → Kano (Electronics, 1 x 20FT Container).', read: false, createdAt: '4h ago', link: '/jobs-trips' },
  { id: 'NTF-003', type: 'payout', icon: 'banknote', tone: 'success', title: 'Payout Processed', body: '₦1,800,000 paid for TRP-0037 (Lagos → Port Harcourt).', read: false, createdAt: '1 day ago', link: '/payouts' },
  { id: 'NTF-004', type: 'maintenance', icon: 'wrench', tone: 'warning', title: 'Maintenance Due', body: 'LSD 123 XY – Oil change due in 3 days.', read: true, createdAt: '1 day ago', link: '/maintenance' },
  { id: 'NTF-005', type: 'job', icon: 'route', tone: 'info', title: 'Trip Update', body: 'TK-2026-000041 status changed to In Transit.', read: true, createdAt: '2 days ago', link: '/jobs-trips/TK-2026-000041' },
  { id: 'NTF-006', type: 'review', icon: 'star', tone: 'purple', title: 'New Review Received', body: 'Brightway Logistics Ltd rated your last trip 5 stars.', read: true, createdAt: '3 days ago', link: '/ratings-reviews' },
  { id: 'NTF-007', type: 'document', icon: 'file-warning', tone: 'danger', title: 'Document Expired', body: 'LAG 321 GH – Insurance Certificate has expired.', read: true, createdAt: '4 days ago', link: '/fleet/LAG-321-GH' },
  { id: 'NTF-008', type: 'system', icon: 'info', tone: 'neutral', title: 'Profile Verified', body: 'Your company profile was verified successfully.', read: true, createdAt: '6 days ago', link: '/company-settings' },
];
