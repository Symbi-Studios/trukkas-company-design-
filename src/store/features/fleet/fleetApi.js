import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { getApiErrorMessage } from '../../api/getApiErrorMessage.js';
import { assignedFleetDriverView, count, dateLabel, driverView, fleetFuelLogsView, fleetFuelView, fleetSummaryView, fleetActivityView, fleetDocumentTypes, fleetDocumentView, fleetEditedSpecifications, fleetSpecificationsBody, fleetTripView, maintenanceDueView, maintenanceTypeToWire, maintenanceView, ownershipToWire, rows, safeUrl, text, truckView, vehicleClassToWire } from './fleetContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => api.getState().auth.account ? null : unavailable('Sign in to manage your fleet.');
const changedSession = () => unavailable('Your company session changed. Reload the fleet before continuing.');
const changedTags = ['CompanyFleet', 'CompanyJobs', 'CompanyTrips', 'CompanyTrip', 'CompanyDashboard', 'CompanyMaintenance'];
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const maintenanceCost = (value) => value === '' || value === undefined || value === null ? null
  : typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN;
const validFile = (file, photo = false) => typeof File !== 'undefined' && file instanceof File && file.size > 0 && file.size <= (photo ? 5 : 10) * 1024 * 1024 && (photo ? ['image/jpeg', 'image/png', 'image/webp'] : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']).includes(file.type);

async function uploadDocument(baseQuery, truckId, { type, file, expiryDate, name }) {
  const wireType = fleetDocumentTypes[type];
  if (!wireType) return unavailable(`The vehicle API does not document ${type} uploads.`);
  if (!validFile(file)) return unavailable('Choose a PDF, JPEG, PNG or WebP file up to 10 MB.');
  if (expiryDate && !validDate(expiryDate)) return unavailable('Enter a valid expiry date.');
  const body = new FormData();
  body.append('file', file); body.append('type', wireType);
  if (expiryDate) body.append('expiryDate', expiryDate);
  if (text(name)) body.append('name', name.trim());
  const result = await baseQuery({ url: `/company/fleet/${encodeURIComponent(truckId)}/documents`, method: 'POST', body });
  if (result.error) return result;
  const saved = unwrapApiResponseData(result.data)?.document;
  const doc = saved?.type === wireType ? fleetDocumentView(saved) : null;
  return doc && doc.url ? { data: doc } : unavailable('The API did not confirm the document upload. Reload the vehicle before trying again.');
}

async function allPages(baseQuery, api, url, key, params, readPage) {
  const account = api.getState().auth.account;
  const collection = [];
  let total = null, pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The fleet request was cancelled.');
    const result = await baseQuery({ url, params: { ...params, page, limit: 100 } });
    if (api.getState().auth.account !== account) return changedSession();
    if (result.error) return result;
    const data = unwrapApiResponseData(result.data), items = rows(data?.[key]), pagination = data?.pagination;
    if (!items || pagination?.page !== page || count(pagination.total) === null || count(pagination.totalPages) === null) return unavailable('The API did not return a valid fleet collection and pagination.');
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
    if (pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The records changed while loading. Please reload.');
    readPage?.(data, page);
    collection.push(...items);
    if (collection.length > total) return unavailable('The API returned invalid pagination.');
  }
  if (collection.length !== total || collection.some((item) => !text(item.id)) || new Set(collection.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete collection.');
  return { data: collection };
}

export const fleetApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyFleet', 'CompanyMaintenance', 'CompanyJobs', 'CompanyTrips', 'CompanyTrip', 'CompanyDashboard'] }).injectEndpoints({
  // Fast Refresh reruns this module while the shared API instance survives.
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    addFleetVehicle: builder.mutation({
      async queryFn({ draft, createdTruckId }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const account = api.getState().auth.account;
        const vehicleClass = vehicleClassToWire(draft?.vehicleClass);
        if (!vehicleClass || !text(draft.plate) || !/^\d{4}$/.test(draft.year ?? '')) return unavailable('Enter a vehicle class, registration number and four-digit year.');
        if (Object.entries({ make: 60, model: 60, color: 30, vin: 30, engineNumber: 40 }).some(([key, limit]) => (text(draft[key])?.length ?? 0) > limit)) return unavailable('Check the lengths of the make, model, colour, VIN and engine number.');
        const ownership = ownershipToWire(draft.ownership);
        if (!ownership) return unavailable('Choose a supported ownership type.');
        if (draft.purchaseDate && (!validDate(draft.purchaseDate) || draft.purchaseDate > new Date().toISOString().slice(0, 10))) return unavailable('Enter a valid purchase date that is not in the future.');
        if ((text(draft.location)?.length ?? 0) > 200) return unavailable('Enter a current location of up to 200 characters.');
        const odometerKm = draft.odometer === '' || draft.odometer == null ? null : maintenanceCost(draft.odometer);
        if (odometerKm !== null && (!Number.isFinite(odometerKm) || odometerKm < 0)) return unavailable('Enter a valid odometer reading of zero or more kilometres.');
        const specifications = fleetSpecificationsBody(draft);
        const docs = Object.entries(draft.docs ?? {}).filter(([, doc]) => doc.files?.length).map(([type, doc]) => ({ type, file: doc.files[0]?.file, expiryDate: doc.expiry, name: doc.files[0]?.name }));
        const unsupportedDoc = docs.find((doc) => !fleetDocumentTypes[doc.type]);
        if (unsupportedDoc) return unavailable(`The vehicle API does not document ${unsupportedDoc.type} uploads. Remove that file before submitting.`);
        if (docs.some((doc) => !validFile(doc.file) || doc.expiryDate && !validDate(doc.expiryDate))) return unavailable('Check document files and expiry dates. Documents must be PDF, JPEG, PNG or WebP, up to 10 MB.');
        const photos = Object.values(draft.photos ?? {}).flatMap((items) => items.map((item) => item.file));
        if (photos.some((file) => !validFile(file, true))) return unavailable('Truck photos must be JPEG, PNG or WebP, up to 5 MB each.');
        if ((draft.notes ?? '').length > 2000) return unavailable('Enter notes of up to 2000 characters.');
        if (!text(createdTruckId)) {
          const urls = [];
          for (let offset = 0; offset < photos.length; offset += 5) {
            const batch = photos.slice(offset, offset + 5), body = new FormData();
            batch.forEach((file) => body.append('photos', file));
            const upload = await baseQuery({ url: '/uploads/truck-photos', method: 'POST', body });
            if (api.getState().auth.account !== account) return changedSession();
            if (upload.error) return upload;
            const saved = unwrapApiResponseData(upload.data)?.photos;
            if (!Array.isArray(saved) || saved.length !== batch.length || saved.some((url) => !safeUrl(url))) return unavailable('The API did not confirm the truck photos.');
            urls.push(...saved);
          }
          const truck = {
            plateNumber: draft.plate.trim().toUpperCase(), year: draft.year, vehicleClass,
            ...Object.fromEntries(['make', 'model', 'color', 'vin', 'engineNumber'].filter((key) => text(draft[key])).map((key) => [key, draft[key].trim()])),
            ...(draft.vehicleClass !== 'Trailer' && text(draft.specs?.fuelType) ? { fuelType: draft.specs.fuelType.toUpperCase() } : {}),
            ...(urls.length ? { truckUrl: urls } : {}),
          };
          const created = await baseQuery({ url: '/dashboard/trucks', method: 'POST', body: { trucks: [truck] } });
          if (api.getState().auth.account !== account) return changedSession();
          if (created.error) return created;
          const saved = rows(unwrapApiResponseData(created.data)?.trucks);
          if (saved?.length !== 1 || !text(saved[0].id) || saved[0].plateNumber !== truck.plateNumber) return unavailable('The create response could not be confirmed. Reload the fleet before trying again.');
          createdTruckId = saved[0].id;
        }
        // A partial save carries the created ID back to the form so retrying
        // finishes documents/settings instead of creating a second vehicle.
        const partial = (result) => ({ error: { status: 'CUSTOM_ERROR', error: 'Vehicle setup is incomplete.', data: { message: `The vehicle was created, but some details could not be saved. ${getApiErrorMessage(result.error)} Retry to finish saving, or open the vehicle from My Fleet.`, createdTruckId } } });
        const settings = {
          ownership, ...(draft.purchaseDate ? { purchaseDate: draft.purchaseDate } : {}),
          ...(Object.keys(specifications).length ? { specifications } : {}),
          ...(text(draft.notes) ? { notes: draft.notes.trim() } : {}),
        };
        const updated = await baseQuery({ url: `/dashboard/trucks/${encodeURIComponent(createdTruckId)}`, method: 'PATCH', body: settings });
        if (api.getState().auth.account !== account) return changedSession();
        if (updated.error) return partial(updated);
        const confirmation = await baseQuery(`/company/fleet/${encodeURIComponent(createdTruckId)}`);
        if (api.getState().auth.account !== account) return changedSession();
        if (confirmation.error) return partial(confirmation);
        const savedSettings = unwrapApiResponseData(confirmation.data)?.truck;
        const settingsConfirmed = savedSettings?.id === createdTruckId && savedSettings.ownership === ownership
          && (!draft.purchaseDate || typeof savedSettings.purchaseDate === 'string' && validDate(savedSettings.purchaseDate.slice(0, 10)) && savedSettings.purchaseDate.slice(0, 10) === draft.purchaseDate)
          && Object.entries(specifications).every(([key, value]) => savedSettings.specifications?.[key] === value)
          && (!text(draft.notes) || savedSettings.notes === draft.notes.trim());
        if (!settingsConfirmed) return partial(unavailable('The API did not confirm the vehicle details and specifications.'));
        if (text(draft.location)) {
          const result = await baseQuery({ url: '/company/fleet/' + encodeURIComponent(createdTruckId) + '/location', method: 'PATCH', body: { location: draft.location.trim() } });
          if (api.getState().auth.account !== account) return changedSession();
          if (result.error) return partial(result);
          if (unwrapApiResponseData(result.data)?.currentLocationNote?.location !== draft.location.trim()) return partial(unavailable('The API did not confirm the current location.'));
        }
        if (odometerKm !== null) {
          const result = await baseQuery({ url: '/company/fleet/' + encodeURIComponent(createdTruckId) + '/odometer', method: 'PATCH', body: { odometerKm } });
          if (api.getState().auth.account !== account) return changedSession();
          if (result.error) return partial(result);
          if (unwrapApiResponseData(result.data)?.odometer?.manualKm !== odometerKm) return partial(unavailable('The API did not confirm the odometer reading.'));
        }
        for (const doc of docs) {
          const result = await uploadDocument(baseQuery, createdTruckId, doc);
          if (api.getState().auth.account !== account) return changedSession();
          if (result.error) return partial(result);
        }
        if (text(draft.driverId) && draft.vehicleClass !== 'Trailer') {
          const result = await baseQuery({ url: `/company/fleet/${encodeURIComponent(createdTruckId)}/driver`, method: 'PUT', body: { driverId: draft.driverId } });
          if (api.getState().auth.account !== account) return changedSession();
          if (result.error) return partial(result);
          const confirm = await baseQuery(`/company/fleet/${encodeURIComponent(createdTruckId)}`);
          if (api.getState().auth.account !== account) return changedSession();
          if (confirm.error || unwrapApiResponseData(confirm.data)?.truck?.driver?.id !== draft.driverId) return partial(unavailable('The API did not confirm the driver assignment.'));
        }
        return { data: { id: createdTruckId } };
      },
      invalidatesTags: changedTags,
    }),
    getFleet: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        let recentActivity = null;
        const result = await allPages(baseQuery, api, '/company/fleet', 'trucks', {}, (data, page) => {
          if (page === 1) recentActivity = rows(data.recentActivity);
        });
        if (result.error) return result;
        return { data: result.data.map((truck) => ({
          ...truckView(truck),
          activityLog: recentActivity?.filter((entry) => entry.vehicleId === truck.id).map(fleetActivityView) ?? null,
        })) };
      },
      providesTags: ['CompanyFleet'],
    }),
    getFleetSummary: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await baseQuery({ url: '/company/fleet', params: { page: 1, limit: 1 } });
        return result.error ? result : { data: fleetSummaryView(unwrapApiResponseData(result.data)?.summary) };
      },
      providesTags: ['CompanyFleet'],
    }),
    editFleetVehicle: builder.mutation({
      async queryFn({ id, draft, original }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id) || !draft || !original) return unavailable('Reload the vehicle before editing it.');
        const account = api.getState().auth.account;
        const body = {};
        for (const [key, wire, max] of [['plate', 'plateNumber', 100], ['make', 'make', 60], ['model', 'model', 60], ['color', 'color', 30], ['vin', 'vin', 30], ['engineNumber', 'engineNumber', 40], ['notes', 'notes', 2000]]) {
          if (typeof draft[key] !== 'string' || draft[key].trim().length > max) return unavailable('Check the vehicle details and field lengths.');
          if (draft[key] !== original[key]) body[wire] = key === 'plate' ? draft[key].trim().toUpperCase() : draft[key].trim();
        }
        if (!text(draft.plate) || !/^\d{4}$/.test(draft.year)) return unavailable('Enter a registration number and four-digit year.');
        if (draft.year !== original.year) body.year = draft.year;
        if (draft.vehicleClass !== original.vehicleClass) { body.vehicleClass = vehicleClassToWire(draft.vehicleClass); if (!body.vehicleClass) return unavailable('Choose a vehicle class.'); }
        if (draft.ownership !== original.ownership) { body.ownership = ownershipToWire(draft.ownership); if (!body.ownership) return unavailable('Choose an ownership type.'); }
        if (draft.purchaseDate !== original.purchaseDate) { if (!validDate(draft.purchaseDate) || draft.purchaseDate > new Date().toISOString().slice(0, 10)) return unavailable('Enter a valid purchase date that is not in the future.'); body.purchaseDate = draft.purchaseDate; }
        const locationChanged = draft.location !== original.location, odometerChanged = draft.odometer !== original.odometer;
        if (locationChanged && (!text(draft.location) || draft.location.trim().length > 200)) return unavailable('Enter a current location of up to 200 characters.');
        const odometerKm = maintenanceCost(draft.odometer);
        if (odometerChanged && (odometerKm === null || !Number.isFinite(odometerKm) || odometerKm < 0)) return unavailable('Enter an odometer reading of zero or more kilometres.');
        if (odometerChanged && original.odometer !== '' && odometerKm < Number(original.odometer)) return unavailable('An odometer reading cannot go backwards.');
        const changedSpecs = Object.keys(draft.specs ?? {}).filter((key) => draft.specs[key] !== original.specs?.[key]);
        if (changedSpecs.some((key) => typeof draft.specs[key] !== 'string')) return unavailable('Check the specification values.');
        if (changedSpecs.length) {
          const current = await baseQuery('/company/fleet/' + encodeURIComponent(id));
          if (api.getState().auth.account !== account) return changedSession();
          if (current.error) return current;
          const truck = unwrapApiResponseData(current.data)?.truck;
          if (truck?.id !== id) return unavailable('The API did not identify the vehicle.');
          body.specifications = fleetEditedSpecifications(truck.specifications, draft, original);
          if (Object.keys(body.specifications).length > 30) return unavailable('The API accepts up to 30 specifications.');
          if (changedSpecs.includes('fuelType')) body.fuelType = draft.specs.fuelType.trim().toUpperCase();
        }
        const url = '/company/fleet/' + encodeURIComponent(id);
        if (Object.keys(body).length) {
          const result = await baseQuery({ url: '/dashboard/trucks/' + encodeURIComponent(id), method: 'PATCH', body });
          if (api.getState().auth.account !== account) return changedSession();
          if (result.error) return result;
        }
        if (locationChanged) {
          const result = await baseQuery({ url: url + '/location', method: 'PATCH', body: { location: draft.location.trim() } });
          if (api.getState().auth.account !== account) return changedSession();
          if (result.error) return unavailable('Some vehicle details may have saved. ' + getApiErrorMessage(result.error) + ' Reload before retrying.');
        }
        if (odometerChanged) {
          const result = await baseQuery({ url: url + '/odometer', method: 'PATCH', body: { odometerKm } });
          if (api.getState().auth.account !== account) return changedSession();
          if (result.error) return unavailable('Some vehicle details may have saved. ' + getApiErrorMessage(result.error) + ' Reload before retrying.');
        }
        const result = await baseQuery(url);
        if (api.getState().auth.account !== account) return changedSession();
        if (result.error) return unavailable('The save could not be confirmed. Reload the vehicle before retrying.');
        const saved = unwrapApiResponseData(result.data)?.truck;
        const confirmed = saved?.id === id && Object.entries(body).every(([key, value]) => key === 'specifications'
          ? Object.entries(value).every(([name, entry]) => saved.specifications?.[name] === entry)
          : key === 'purchaseDate' ? saved.purchaseDate?.slice(0, 10) === value
          : key === 'notes' && value === '' ? saved.notes === '' || saved.notes === null : saved[key] === value)
          && (!locationChanged || saved.currentLocationNote?.location === draft.location.trim())
          && (!odometerChanged || saved.odometer?.manualKm === odometerKm)
          && changedSpecs.every((key) => {
            const value = truckView(saved, true)?.editDraft.specs[key], expected = draft.specs[key].trim();
            return key === 'fuelType' ? value?.toUpperCase() === expected.toUpperCase() : value === expected;
          });
        return confirmed ? { data: { id } } : unavailable('The API did not confirm all changes. Reload the vehicle before retrying.');
      },
      invalidatesTags: changedTags,
    }),
    getFleetFuelLogs: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('This vehicle has no API ID.');
        const result = await baseQuery('/company/fleet/' + encodeURIComponent(id) + '/fuel-logs');
        if (result.error) return result;
        const data = fleetFuelLogsView(unwrapApiResponseData(result.data));
        return data ? { data } : unavailable('The API did not return valid fuel logs.');
      },
      providesTags: ['CompanyFleet'],
    }),
    addFleetFuelLog: builder.mutation({
      async queryFn({ truckId, draft }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(truckId)) return unavailable('This vehicle has no API ID.');
        const litres = maintenanceCost(draft?.litres), amount = maintenanceCost(draft?.amount), odometerKm = maintenanceCost(draft?.odometer);
        if (!Number.isFinite(litres) || litres <= 0 || amount === null || !Number.isFinite(amount) || amount < 0) return unavailable('Enter litres above zero and a total cost of zero or more.');
        if (draft.date && (!validDate(draft.date) || draft.date > new Date().toISOString().slice(0, 10))) return unavailable('Enter a valid fuel purchase date that is not in the future.');
        if (odometerKm !== null && (!Number.isFinite(odometerKm) || odometerKm < 0)) return unavailable('Enter a valid odometer reading.');
        const body = { litres, amount, ...(draft.date ? { date: draft.date } : {}), ...(odometerKm !== null ? { odometerKm } : {}), ...(text(draft.station) ? { station: draft.station.trim() } : {}), ...(text(draft.fuelType) ? { fuelType: draft.fuelType.toUpperCase() } : {}) };
        const account = api.getState().auth.account;
        const result = await baseQuery({ url: '/company/fleet/' + encodeURIComponent(truckId) + '/fuel-logs', method: 'POST', body });
        if (api.getState().auth.account !== account) return changedSession();
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.fuelLog;
        return text(saved?.id) && Object.entries(body).every(([key, value]) => key === 'date' ? dateLabel(saved.date) === dateLabel(value) : saved[key] === value)
          ? { data: fleetFuelView(saved) } : unavailable('The API did not confirm the fuel purchase. Reload the fuel log before retrying.');
      },
      invalidatesTags: changedTags,
    }),
    getFleetVehicle: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('This vehicle has no API ID.');
        const result = await baseQuery(`/company/fleet/${encodeURIComponent(id)}`);
        if (result.error) return result;
        const truck = unwrapApiResponseData(result.data)?.truck;
        return truck?.id === id ? { data: truckView(truck, true) } : unavailable('The API did not identify this vehicle.');
      },
      providesTags: ['CompanyFleet'],
    }),
    getFleetDocuments: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('This vehicle has no API ID.');
        const result = await baseQuery(`/company/fleet/${encodeURIComponent(id)}/documents`);
        if (result.error) return result;
        const documents = rows(unwrapApiResponseData(result.data)?.documents)?.map(fleetDocumentView);
        return documents && documents.every(Boolean) && new Set(documents.map((doc) => doc.id)).size === documents.length ? { data: documents } : unavailable('The API did not return valid vehicle documents.');
      },
      providesTags: ['CompanyFleet'],
    }),
    uploadFleetDocument: builder.mutation({
      async queryFn({ truckId, ...draft }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(truckId)) return unavailable('This vehicle has no API ID.');
        return uploadDocument(baseQuery, truckId, draft);
      },
      invalidatesTags: changedTags,
    }),
    updateFleetVehicle: builder.mutation({
      async queryFn({ id, status, notes, remindersEnabled }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('This vehicle has no API ID.');
        const body = {};
        if (status !== undefined) {
          const wireStatus = { Active: 'ACTIVE', Inactive: 'INACTIVE' }[status];
          if (!wireStatus) return unavailable('Maintenance and approval status are managed by Trukkas. Schedule a maintenance request from the Maintenance tab.');
          body.status = wireStatus;
        }
        if (notes !== undefined) { if (typeof notes !== 'string' || notes.length > 2000) return unavailable('Enter notes of up to 2000 characters.'); body.notes = notes.trim(); }
        if (remindersEnabled !== undefined) { if (typeof remindersEnabled !== 'boolean') return unavailable('Choose a reminder preference.'); body.remindersEnabled = remindersEnabled; }
        if (!Object.keys(body).length) return unavailable('Choose a vehicle setting to update.');
        const result = await baseQuery({ url: `/dashboard/trucks/${encodeURIComponent(id)}`, method: 'PATCH', body });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.truck;
        const confirmed = saved?.id === id && Object.entries(body).every(([key, value]) => key === 'notes' && value === '' ? saved.notes === '' || saved.notes === null : saved[key] === value);
        return confirmed ? { data: { id } } : unavailable('The API did not confirm the vehicle update. Reload the vehicle before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    getFleetDrivers: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await baseQuery('/dashboard/drivers');
        if (result.error) return result;
        const drivers = rows(unwrapApiResponseData(result.data)?.drivers);
        if (!drivers || drivers.some((driver) => !text(driver.userId))) return unavailable('The API did not return the company’s drivers.');
        return { data: drivers.map(driverView) };
      },
      providesTags: ['CompanyFleet'],
    }),
    getFleetAssignedDriver: builder.query({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('This driver has no API ID.');
        const result = await baseQuery(`/company/drivers/${encodeURIComponent(id)}`);
        if (result.error) return result;
        const driver = unwrapApiResponseData(result.data)?.driver;
        return driver?.id === id ? { data: assignedFleetDriverView(driver) } : unavailable('The API did not identify the assigned driver.');
      },
      providesTags: ['CompanyFleet'],
    }),
    assignFleetDriver: builder.mutation({
      async queryFn({ truckId, driverId }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(truckId) || (driverId !== null && !text(driverId))) return unavailable('Select a truck and driver.');
        const result = await baseQuery({ url: `/company/fleet/${encodeURIComponent(truckId)}/driver`, method: 'PUT', body: { driverId } });
        if (result.error) return result;
        const confirmation = await baseQuery(`/company/fleet/${encodeURIComponent(truckId)}`);
        if (confirmation.error) return unavailable('The assignment response could not be confirmed. Reload the fleet before trying again.');
        const truck = unwrapApiResponseData(confirmation.data)?.truck;
        const confirmed = truck?.id === truckId && (driverId === null ? truck.driver === null : truck.driver?.id === driverId);
        return confirmed ? { data: { truckId, driverId } } : unavailable('The API did not confirm the driver assignment. Reload the fleet before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    getFleetMaintenance: builder.query({
      async queryFn(truckId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        let nextDue = null;
        const result = await allPages(baseQuery, api, '/maintenance', 'maintenance', text(truckId) ? { truckId } : {}, (data, page) => {
          if (page === 1) nextDue = maintenanceDueView(data.nextDue);
        });
        if (result.error) return result;
        if (truckId && result.data.some((item) => item.truck?.id !== truckId)) return unavailable('The API returned maintenance for another truck.');
        if (truckId && nextDue && nextDue.truckId !== truckId) return unavailable('The API returned a next service for another truck.');
        return { data: { records: result.data.map(maintenanceView), nextDue } };
      },
      providesTags: ['CompanyMaintenance'],
    }),
    requestFleetMaintenance: builder.mutation({
      async queryFn({ truckId, serviceType, description, date, estimatedCost }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const account = api.getState().auth.account;
        const type = maintenanceTypeToWire(serviceType);
        if (!text(truckId)) return unavailable('Select a vehicle.');
        if (!['PREVENTIVE', 'REPAIR', 'INSPECTION', 'BREAKDOWN'].includes(type)) return unavailable('Use PREVENTIVE, REPAIR, INSPECTION or BREAKDOWN as the service type.');
        if (!text(description) || description.trim().length > 1000) return unavailable('Enter a description of up to 1000 characters.');
        const due = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
        if (!due || !Number.isFinite(due.getTime()) || due.toISOString().slice(0, 10) !== date) return unavailable('Enter a valid scheduled date.');
        const cost = maintenanceCost(estimatedCost);
        if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return unavailable('Enter a valid estimated cost.');
        const result = await baseQuery({ url: '/maintenance', method: 'POST', body: { truckId, type, description: description.trim(), dueDate: date, ...(cost === null ? {} : { estimatedCost: cost }) } });
        if (api.getState().auth.account !== account) return changedSession();
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.maintenance;
        return text(saved?.id) && saved.truck?.id === truckId && saved.status === 'REQUESTED' && saved.type === type && saved.description === description.trim() && maintenanceView(saved).dateInput === date && (cost === null || saved.currency === 'NGN' && saved.estimatedCost === cost)
          ? { data: maintenanceView(saved) } : unavailable('The API did not confirm the maintenance request. Reload before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    completeFleetMaintenance: builder.mutation({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const account = api.getState().auth.account;
        if (!text(id)) return unavailable('This maintenance record has no API ID.');
        const current = await baseQuery(`/maintenance/${encodeURIComponent(id)}`);
        if (api.getState().auth.account !== account) return changedSession();
        if (current.error) return current;
        const record = unwrapApiResponseData(current.data);
        if (record?.id !== id || !text(record.truck?.id) || !maintenanceView(record)?.canComplete) return unavailable('Only scheduled or in-progress maintenance can be completed. Reload the records.');
        const result = await baseQuery({ url: `/maintenance/${encodeURIComponent(id)}/complete`, method: 'POST' });
        if (api.getState().auth.account !== account) return changedSession();
        if (result.error) return result;
        const confirmed = await baseQuery(`/maintenance/${encodeURIComponent(id)}`);
        if (api.getState().auth.account !== account) return changedSession();
        if (confirmed.error) return unavailable('Completion could not be confirmed. Reload the records before trying again.');
        const saved = unwrapApiResponseData(confirmed.data);
        return saved?.id === id && saved.truck?.id === record.truck.id && saved.status === 'COMPLETED' ? { data: maintenanceView(saved) } : unavailable('The API did not confirm completion. Reload the records.');
      },
      invalidatesTags: changedTags,
    }),
    updateFleetMaintenance: builder.mutation({
      async queryFn({ id, serviceType, description, date, estimatedCost }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const account = api.getState().auth.account;
        if (!text(id)) return unavailable('This maintenance record has no API ID.');
        const type = maintenanceTypeToWire(serviceType);
        if (!type || !text(description) || description.trim().length > 1000 || !validDate(date)) return unavailable('Choose a service type, a description of up to 1000 characters and a valid scheduled date.');
        const cost = maintenanceCost(estimatedCost);
        if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return unavailable('Enter a valid estimated cost.');
        const current = await baseQuery(`/maintenance/${encodeURIComponent(id)}`);
        if (api.getState().auth.account !== account) return changedSession();
        if (current.error) return current;
        const record = unwrapApiResponseData(current.data);
        if (record?.id !== id || !text(record.truck?.id) || !maintenanceView(record)?.canEdit) return unavailable('Only requested or scheduled maintenance can be edited. Reload the records.');
        const result = await baseQuery({ url: `/maintenance/${encodeURIComponent(id)}`, method: 'PATCH', body: { type, description: description.trim(), dueDate: date, estimatedCost: cost } });
        if (api.getState().auth.account !== account) return changedSession();
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.maintenance;
        return saved?.id === id && saved.truck?.id === record.truck?.id && saved.type === type && saved.description === description.trim() && maintenanceView(saved).dateInput === date && (cost === null ? saved.estimatedCost === null : saved.currency === 'NGN' && saved.estimatedCost === cost)
          ? { data: maintenanceView(saved) } : unavailable('The API did not confirm the maintenance changes. Reload before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    getFleetTrips: builder.query({
      async queryFn(truckId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(truckId)) return unavailable('This vehicle has no API ID.');
        const result = await allPages(baseQuery, api, '/company/trips', 'trips', { truckId });
        if (result.error) return result;
        const trips = [];
        for (let offset = 0; offset < result.data.length; offset += 4) {
          if (api.signal.aborted) return unavailable('The trip request was cancelled.');
          const batch = result.data.slice(offset, offset + 4);
          const details = await Promise.all(batch.map((trip) => baseQuery(`/company/trips/${encodeURIComponent(trip.id)}`)));
          for (let index = 0; index < details.length; index += 1) {
            const detail = details[index];
            if (detail.error) return detail;
            const trip = unwrapApiResponseData(detail.data)?.trip;
            if (trip?.id !== batch[index].id || trip.truck?.id !== truckId) return unavailable('The API did not identify this vehicle’s trip.');
            trips.push(fleetTripView(trip));
          }
        }
        return { data: trips };
      },
      providesTags: ['CompanyFleet', 'CompanyTrips'],
    }),
    exportFleetVehicle: builder.query({
      async queryFn(truckId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(truckId)) return unavailable('This vehicle has no API ID.');
        const result = await baseQuery({ url: '/company/export/fleet', params: { truckId }, responseHandler: async (response) => {
          const contentType = response.headers.get('content-type') ?? '';
          return contentType.includes('application/json') ? response.json() : { content: await response.text(), contentType };
        } });
        if (result.error) return result;
        return typeof result.data?.content === 'string' && result.data.contentType.toLowerCase().includes('text/csv') ? { data: { content: result.data.content } } : unavailable('The API did not return a CSV file.');
      },
    }),
    exportFleetTrips: builder.query({
      async queryFn({ truckId, search, status }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(truckId)) return unavailable('This vehicle has no API ID.');
        const statuses = { 'In Transit': 'IN_TRANSIT', Completed: 'COMPLETED', Cancelled: 'CANCELLED' };
        const result = await baseQuery({
          url: '/company/export/trips', params: { truckId, ...(text(search) ? { search: search.trim() } : {}), ...(Object.hasOwn(statuses, status) ? { status: statuses[status] } : {}) },
          responseHandler: async (response) => {
            const contentType = response.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) return response.json();
            // The transport redacts content. Never log raw CSV rows containing
            // driver names, company names or other personal information.
            return { content: await response.text(), contentType };
          },
        });
        if (result.error) return result;
        return typeof result.data?.content === 'string' && result.data.contentType.toLowerCase().includes('text/csv') ? { data: { content: result.data.content } } : unavailable('The API did not return a CSV file.');
      },
    }),
  }),
});

export const { useAddFleetVehicleMutation, useGetFleetQuery, useGetFleetSummaryQuery, useEditFleetVehicleMutation, useGetFleetFuelLogsQuery, useAddFleetFuelLogMutation, useGetFleetVehicleQuery, useGetFleetDocumentsQuery, useUploadFleetDocumentMutation, useUpdateFleetVehicleMutation, useLazyExportFleetVehicleQuery, useGetFleetDriversQuery, useGetFleetAssignedDriverQuery, useAssignFleetDriverMutation, useGetFleetMaintenanceQuery, useRequestFleetMaintenanceMutation, useCompleteFleetMaintenanceMutation, useUpdateFleetMaintenanceMutation, useGetFleetTripsQuery, useLazyExportFleetTripsQuery } = fleetApi;
