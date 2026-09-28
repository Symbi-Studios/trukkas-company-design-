export const supportTickets = [
  {
    id: 'TCK-2026-0041', subject: 'Payout for TRP-0037 delayed by two days', category: 'Payments',
    status: 'Resolved', createdAt: 'May 20, 2026', updatedAt: 'May 22, 2026',
    messages: [
      { author: 'Adekunle Adebayo', role: 'You', time: 'May 20, 2026 · 9:00 AM', agent: false, body: 'The payout for TRP-0037 was due May 20 but hasn’t landed yet.' },
      { author: 'Amaka (Trukkas Support)', role: 'Support Agent', time: 'May 20, 2026 · 2:40 PM', agent: true, body: 'Thanks for flagging — this was held for a routine bank verification. It has been released and should land within 24 hours.' },
      { author: 'Adekunle Adebayo', role: 'You', time: 'May 22, 2026 · 10:05 AM', agent: false, body: 'Confirmed, funds received. Thank you!' },
    ],
  },
  {
    id: 'TCK-2026-0052', subject: 'Cannot upload ADR certificate for TKR 987 EF', category: 'Documents',
    status: 'Open', createdAt: 'May 29, 2026', updatedAt: 'May 30, 2026',
    messages: [
      { author: 'Adekunle Adebayo', role: 'You', time: 'May 29, 2026 · 11:12 AM', agent: false, body: 'The upload keeps failing at 90% for the ADR certificate PDF. Screenshot of the error attached.', attachments: [{ name: 'upload-error.png', size: '184 KB', type: 'image/png' }, { name: 'ADR_Certificate_TKR987EF.pdf', size: '12.4 MB', type: 'application/pdf' }] },
      { author: 'Tunde (Trukkas Support)', role: 'Support Agent', time: 'May 30, 2026 · 8:30 AM', agent: true, body: 'Could you confirm the file size? Uploads are capped at 10MB per document.' },
    ],
  },
  {
    id: 'TCK-2026-0058', subject: 'Question about container demurrage charges', category: 'Billing',
    status: 'Pending', createdAt: 'May 31, 2026', updatedAt: 'May 31, 2026',
    messages: [
      { author: 'Adekunle Adebayo', role: 'You', time: 'May 31, 2026 · 3:15 PM', agent: false, body: 'Who absorbs demurrage if a forwarder delays document approval past the free period?' },
    ],
  },
];

export const faqs = [
  { id: 'FAQ-01', category: 'Getting Started', question: 'How do I bid on a job request?', answer: 'Open Jobs & Trips, switch to the Job Requests tab, choose a request, and select Place a Bid. Enter your amount and an optional note, then submit.' },
  { id: 'FAQ-02', category: 'Fleet', question: 'How do I keep a vehicle’s documents compliant?', answer: 'Open Fleet, select a vehicle, and use the Documents tab to upload or renew registration, insurance, road worthiness, and any special permits before they expire.' },
  { id: 'FAQ-03', category: 'Payments', question: 'When are payouts released?', answer: 'Payouts are released within 3–5 business days after a trip is marked Delivered and the forwarder confirms receipt.' },
  { id: 'FAQ-04', category: 'Payments', question: 'How do I withdraw my wallet balance?', answer: 'Go to Earnings & Wallet and select Withdraw. Funds are sent to the bank account on file in Company Settings.' },
  { id: 'FAQ-05', category: 'Fleet', question: 'What happens if a vehicle’s insurance expires?', answer: 'The vehicle is flagged as non-compliant and cannot be assigned to new trips until a valid certificate is uploaded.' },
  { id: 'FAQ-06', category: 'Jobs & Trips', question: 'Can I withdraw a bid after submitting it?', answer: 'Yes, while the request is still in the Quoted stage and the forwarder has not yet accepted it.' },
];
