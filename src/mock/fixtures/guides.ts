// Help-centre guides shown under Support. `topic` is a SUPPORT_TOPICS slug
// (domain/support.js); `id` is the URL slug (/support/guides/<id>).
// Each section has a heading plus any of: body text, numbered steps, a tip.
export const guides = [
  // ---- Account & Login ----------------------------------------------------
  {
    id: 'reset-your-password', topic: 'account-login', popular: true, readMinutes: 2, updated: 'Sep 12, 2026',
    title: 'Reset a forgotten password',
    summary: 'Get back into your account when you can’t remember your password.',
    sections: [
      { heading: 'Request a reset link', steps: ['On the sign-in page, select Forgot password?', 'Enter the email address you sign in with and submit.', 'Open the reset email and follow the link or copy the reset token.', 'Choose a new password and sign in again.'] },
      { heading: 'Didn’t get the email?', body: 'Check your spam or promotions folder and confirm you used the same email your account was created with. For security, we never say whether an email is registered.', tip: 'Reset links expire. If yours has, request a new one.' },
    ],
  },
  {
    id: 'set-up-two-factor', topic: 'account-login', readMinutes: 3, updated: 'Aug 30, 2026',
    title: 'Turn on two-factor authentication',
    summary: 'Add a second sign-in step with an authenticator app, email or SMS.',
    sections: [
      { heading: 'Enable 2FA', steps: ['Open Company Settings and go to Security & 2FA.', 'Choose an authenticator app, email or SMS.', 'Confirm with the code you receive.', 'Save your 8 backup codes somewhere safe.'] },
      { heading: 'Lost your device?', body: 'Each backup code works once. Use one at sign-in instead of the 2FA code, then set up 2FA again on your new device.' },
    ],
  },
  {
    id: 'invite-team-members', topic: 'account-login', readMinutes: 3, updated: 'Sep 4, 2026',
    title: 'Invite team members and set roles',
    summary: 'Give dispatchers, fleet managers and finance staff their own access.',
    sections: [
      { heading: 'Send an invite', steps: ['Open Company Settings and go to Team Members.', 'Add the person’s name, email and phone.', 'Pick a role such as Admin, Fleet Manager, Finance or Dispatcher.', 'Send the invite. They appear as Invited until they accept.'] },
      { heading: 'Customise what a role can do', body: 'Under Roles & Permissions you can adjust what each role can see and change. Only the Owner and Admins can manage the team.' },
    ],
  },

  // ---- Jobs & Bookings ----------------------------------------------------
  {
    id: 'bid-on-a-job', topic: 'jobs-bookings', popular: true, readMinutes: 3, updated: 'Sep 18, 2026',
    title: 'Find and bid on a job request',
    summary: 'Browse open job requests from forwarders and send your price.',
    sections: [
      { heading: 'Find a job', steps: ['Open Find Jobs from the sidebar.', 'Filter by route, cargo type, equipment or pickup date.', 'Open a job to see its cargo, route, budget and number of trucks required.'] },
      { heading: 'Place your bid', steps: ['On the job, select Place a Bid.', 'Enter your amount and an optional note for the forwarder.', 'Submit. The job moves to Quoted while the forwarder reviews it.'] },
      { heading: 'Withdrawing a bid', body: 'You can withdraw a bid while the job is still Quoted and the forwarder hasn’t accepted it.' },
    ],
  },
  {
    id: 'manage-won-jobs', topic: 'jobs-bookings', readMinutes: 3, updated: 'Sep 10, 2026',
    title: 'Manage a job you’ve won',
    summary: 'Dispatch trucks for an accepted job and track every trip.',
    sections: [
      { heading: 'Dispatch trucks', steps: ['Open My Jobs and choose the job.', 'Select Dispatch Truck for each truck the forwarder booked.', 'Pick an available truck and driver. Each one becomes its own trip.'] },
      { heading: 'Track progress', body: 'Each trip moves through Assigned, Picked Up, In Transit, At Destination and Completed. Open My Trips to see where every truck is.' },
    ],
  },
  {
    id: 'report-a-trip-issue', topic: 'jobs-bookings', readMinutes: 2, updated: 'Aug 22, 2026',
    title: 'Report a delay or problem on a trip',
    summary: 'Let the forwarder know about breakdowns, delays or checkpoint holds.',
    sections: [
      { heading: 'Report it', steps: ['Open the trip from My Trips.', 'Select Report Issue.', 'Choose the type (Delay, Breakdown, Accident, Cargo Damage, Checkpoint / Security, Documentation or Other) and describe what happened.'] },
      { heading: 'What happens next', body: 'The issue is added to the trip timeline and the forwarder is notified. Update it as things change so everyone sees the latest status.' },
    ],
  },

  // ---- Payments & Wallet --------------------------------------------------
  {
    id: 'when-are-payouts-released', topic: 'payments-wallet', popular: true, readMinutes: 2, updated: 'Sep 20, 2026',
    title: 'When are payouts released?',
    summary: 'How long it takes for trip earnings to reach your wallet.',
    sections: [
      { heading: 'Timing', body: 'Payouts are released within 3–5 business days after a trip is marked Delivered and the forwarder confirms receipt.' },
      { heading: 'Requesting a payout', steps: ['Open Payouts and select Request Payout.', 'Pick the completed trips to include.', 'Review the total, including the 5% service fee, and confirm with your transaction PIN.'] },
      { heading: 'Payout delayed?', body: 'Some payouts are held for a routine bank verification. If yours is past 5 business days, submit a ticket with the trip ID.' },
    ],
  },
  {
    id: 'withdraw-wallet-balance', topic: 'payments-wallet', popular: true, readMinutes: 2, updated: 'Sep 15, 2026',
    title: 'Withdraw your wallet balance',
    summary: 'Move available funds from your Trukkas wallet to your bank account.',
    sections: [
      { heading: 'Withdraw funds', steps: ['Open Earnings & Wallet and select Withdraw Funds.', 'Enter the amount.', 'Confirm with your transaction PIN.'] },
      { heading: 'Where the money goes', body: 'Funds are sent to the corporate account saved under Company Settings → Payout Account.', tip: 'Set your transaction PIN in Company Settings → Transaction PIN before your first withdrawal.' },
    ],
  },
  {
    id: 'service-fees-explained', topic: 'payments-wallet', readMinutes: 2, updated: 'Jul 28, 2026',
    title: 'How service fees work',
    summary: 'What Trukkas deducts from each payout and why.',
    sections: [
      { heading: 'The fee', body: 'A 5% service fee is deducted from each payout. You see the gross amount, the fee and what you’ll receive before you confirm.' },
      { heading: 'Receipts', body: 'Every payout has a receipt you can view and download from its detail page under Payouts.' },
    ],
  },

  // ---- Truck & Fleet ------------------------------------------------------
  {
    id: 'add-a-vehicle', topic: 'truck-fleet', popular: true, readMinutes: 4, updated: 'Sep 22, 2026',
    title: 'Add a truck or trailer to your fleet',
    summary: 'Register a vehicle with its documents, photos and driver.',
    sections: [
      { heading: 'Start', steps: ['Open Fleet and select Add Vehicle.', 'Choose the vehicle class and enter its registration, make, model and year.', 'Add specifications such as engine, axles and capacity.'] },
      { heading: 'Documents and photos', body: 'Upload the registration, proof of ownership, road worthiness and insurance documents with their expiry dates, then add photos of the front, back, sides, cab interior and odometer.' },
      { heading: 'Assign a driver', body: 'Optionally assign a driver straight away. Trailers don’t need one.' },
    ],
  },
  {
    id: 'vehicle-status', topic: 'truck-fleet', readMinutes: 2, updated: 'Aug 14, 2026',
    title: 'Understand vehicle status',
    summary: 'What Available, On Trip and other statuses mean for dispatching.',
    sections: [
      { heading: 'Statuses', body: 'Only available, compliant vehicles can be dispatched. A truck already on an open trip, in maintenance or with expired documents won’t appear in the dispatch list.' },
      { heading: 'Keep it accurate', body: 'Update the odometer and location on the vehicle’s page so forwarders and your team see current details.' },
    ],
  },
  {
    id: 'schedule-maintenance', topic: 'truck-fleet', readMinutes: 2, updated: 'Aug 2, 2026',
    title: 'Schedule and log maintenance',
    summary: 'Plan services and keep a record of repairs and costs.',
    sections: [
      { heading: 'Schedule', steps: ['Open Maintenance and select Schedule Maintenance.', 'Pick the vehicle, service type and date.', 'When the work is done, select Mark Completed and add the cost.'] },
      { heading: 'History', body: 'Each vehicle’s Maintenance tab shows its full service history and costs.' },
    ],
  },

  // ---- Driver Management --------------------------------------------------
  {
    id: 'add-a-driver', topic: 'driver-management', popular: true, readMinutes: 3, updated: 'Sep 8, 2026',
    title: 'Add a driver',
    summary: 'Onboard a driver with their licence and contact details.',
    sections: [
      { heading: 'Add them', steps: ['Open Drivers and select Add Driver.', 'Enter their name, phone, email and address.', 'Upload their driver’s licence with its number and expiry date.'] },
      { heading: 'Before their first trip', body: 'A driver needs a valid licence on file before they can be assigned to a trip.' },
    ],
  },
  {
    id: 'assign-driver-to-truck', topic: 'driver-management', readMinutes: 2, updated: 'Aug 19, 2026',
    title: 'Assign a driver to a truck',
    summary: 'Pair drivers with vehicles so dispatching is faster.',
    sections: [
      { heading: 'Assign', steps: ['Open the vehicle from Fleet.', 'Select Assign Driver.', 'Pick an available driver and confirm.'] },
      { heading: 'Changing drivers', body: 'You can’t reassign a driver who is on an open trip. Wait until the trip is completed or assign someone else.' },
    ],
  },
  {
    id: 'driver-ratings', topic: 'driver-management', readMinutes: 2, updated: 'Jul 30, 2026',
    title: 'How driver ratings and scores work',
    summary: 'Where on-time rate, safety score and reviews come from.',
    sections: [
      { heading: 'The numbers', body: 'On-time rate and safety score are calculated from trip history and telematics. Ratings come from forwarder reviews after each trip.' },
      { heading: 'Reviews', body: 'See every review under Ratings & Reviews, and each driver’s on their profile.' },
    ],
  },

  // ---- Documents & Compliance ---------------------------------------------
  {
    id: 'required-company-documents', topic: 'documents-compliance', popular: true, readMinutes: 3, updated: 'Sep 25, 2026',
    title: 'Documents your company needs',
    summary: 'What we need to verify your company before you can be paid.',
    sections: [
      { heading: 'Required', body: 'CAC Certificate of Incorporation, CAC status report, Memorandum of Association, TIN certificate, the director’s NIN, BVN and government ID, proof of business address, and your corporate bank account details.' },
      { heading: 'Recommended', body: 'Goods-in-transit insurance and a haulage or transport operator permit. Many forwarders ask for these on high-value cargo.' },
    ],
  },
  {
    id: 'renew-expiring-documents', topic: 'documents-compliance', readMinutes: 2, updated: 'Sep 1, 2026',
    title: 'Renew expiring documents',
    summary: 'Keep vehicles and drivers compliant so they can keep working.',
    sections: [
      { heading: 'Renew', steps: ['Open Documents and filter by expiring or expired.', 'Open the document and select Upload Document.', 'Add the new file and expiry date.'] },
      { heading: 'If insurance expires', body: 'The vehicle is flagged as non-compliant and can’t be assigned to new trips until a valid certificate is uploaded.', tip: 'Turn on Document expiry reminders under Company Settings → Notifications.' },
    ],
  },
  {
    id: 'vehicle-documents', topic: 'documents-compliance', readMinutes: 2, updated: 'Aug 11, 2026',
    title: 'Vehicle documents checklist',
    summary: 'Which documents every truck and trailer must have.',
    sections: [
      { heading: 'Required', body: 'Vehicle registration, proof of ownership, road worthiness certificate and insurance certificate (at least third-party).' },
      { heading: 'When applicable', body: 'Emission test report, customs papers for imported vehicles, special permits for heavy-duty or tanker loads, and a Safety / ADR certificate for hazardous cargo.' },
    ],
  },

  // ---- Technical ----------------------------------------------------------
  {
    id: 'upload-problems', topic: 'technical', popular: true, readMinutes: 2, updated: 'Sep 16, 2026',
    title: 'Fix file upload problems',
    summary: 'What to check when a document or photo won’t upload.',
    sections: [
      { heading: 'Check the file', body: 'Documents must be PDF, JPG or PNG and no larger than 10 MB. Large scans can usually be reduced by saving at a lower resolution.' },
      { heading: 'Still failing?', steps: ['Refresh the page and try again.', 'Try a different browser.', 'Submit a ticket and attach a screenshot of the error.'] },
    ],
  },
  {
    id: 'notification-settings', topic: 'technical', readMinutes: 2, updated: 'Aug 5, 2026',
    title: 'Choose which notifications you get',
    summary: 'Control alerts for jobs, trips, payouts, documents and security.',
    sections: [
      { heading: 'Change settings', steps: ['Open Company Settings and go to Notifications.', 'Turn alerts on or off for new job requests, trip updates, payout activity, document expiry, new reviews and security alerts.', 'Save Changes.'] },
    ],
  },
  {
    id: 'desktop-only', topic: 'technical', readMinutes: 1, updated: 'Jul 20, 2026',
    title: 'Why the dashboard only works on desktop',
    summary: 'Supported screens and browsers for the company dashboard.',
    sections: [
      { heading: 'Supported screens', body: 'The company dashboard is built for desktop and laptop screens. On a phone you’ll see a desktop-only notice.' },
      { heading: 'Browsers', body: 'Use the latest version of Chrome, Edge, Safari or Firefox.' },
    ],
  },
];
