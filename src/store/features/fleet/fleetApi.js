import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { count, driverView, fleetTripView, maintenanceView, rows, text, truckView } from './fleetContracts.js';

const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const signedIn = (api) => api.getState().auth.account ? null : unavailable('Sign in to manage your fleet.');
const changedTags = ['CompanyFleet', 'CompanyJobs', 'CompanyTrips', 'CompanyTrip', 'CompanyDashboard', 'CompanyMaintenance'];

async function allPages(baseQuery, api, url, key, params) {
  const collection = [];
  let total = null, pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (api.signal.aborted) return unavailable('The fleet request was cancelled.');
    const result = await baseQuery({ url, params: { ...params, page, limit: 100 } });
    if (result.error) return result;
    const data = unwrapApiResponseData(result.data), items = rows(data?.[key]), pagination = data?.pagination;
    if (!items || pagination?.page !== page || count(pagination.total) === null || count(pagination.totalPages) === null) return unavailable('The API did not return a valid fleet collection and pagination.');
    if (page === 1) { total = pagination.total; pages = pagination.totalPages; }
    if (pagination.total !== total || pagination.totalPages !== pages || (page < pages && !items.length)) return unavailable('The records changed while loading. Please reload.');
    collection.push(...items);
    if (collection.length > total) return unavailable('The API returned invalid pagination.');
  }
  if (collection.length !== total || collection.some((item) => !text(item.id)) || new Set(collection.map((item) => item.id)).size !== total) return unavailable('The API did not return the complete collection.');
  return { data: collection };
}

export const fleetApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyFleet', 'CompanyMaintenance', 'CompanyJobs', 'CompanyTrips', 'CompanyTrip', 'CompanyDashboard'] }).injectEndpoints({
  endpoints: (builder) => ({
    addFleetVehicle: builder.mutation({
      async queryFn(_draft, api) {
        const blocked = signedIn(api); if (blocked) return blocked;
        return unavailable('The add-truck API requires containerTypeId, containerSizeId and containerWeight. This form does not collect those references, and its vehicle details and compliance documents are not covered by that contract.');
      },
    }),
    getFleet: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        // The company/fleet responses have no schema; this endpoint documents
        // the complete owned-truck collection and company driver relation.
        const result = await baseQuery('/dashboard/trucks');
        if (result.error) return result;
        const trucks = rows(unwrapApiResponseData(result.data)?.trucks);
        if (!trucks || trucks.some((truck) => !text(truck.id)) || new Set(trucks.map((truck) => truck.id)).size !== trucks.length) return unavailable('The API did not return the company’s trucks.');
        return { data: trucks.map(truckView) };
      },
      providesTags: ['CompanyFleet'],
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
    assignFleetDriver: builder.mutation({
      async queryFn({ truckId, driverId }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(truckId) || (driverId !== null && !text(driverId))) return unavailable('Select a truck and driver.');
        const result = await baseQuery({ url: `/company/fleet/${encodeURIComponent(truckId)}/driver`, method: 'PUT', body: { driverId } });
        if (result.error) return result;
        // The write response is unspecified. Confirm the relation with the
        // documented owned-truck read before reporting success.
        const confirmation = await baseQuery('/dashboard/trucks');
        if (confirmation.error) return unavailable('The assignment response could not be confirmed. Reload the fleet before trying again.');
        const truck = rows(unwrapApiResponseData(confirmation.data)?.trucks)?.find((item) => item.id === truckId);
        const confirmed = driverId === null ? truck?.driverProfile === null : truck?.driverProfile?.user?.id === driverId;
        return confirmed ? { data: { truckId, driverId } } : unavailable('The API did not confirm the driver assignment. Reload the fleet before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    getFleetMaintenance: builder.query({
      async queryFn(truckId, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const result = await allPages(baseQuery, api, '/maintenance', 'maintenance', text(truckId) ? { truckId } : {});
        if (result.error) return result;
        if (truckId && result.data.some((item) => item.truck?.id !== truckId)) return unavailable('The API returned maintenance for another truck.');
        return { data: result.data.map(maintenanceView) };
      },
      providesTags: ['CompanyMaintenance'],
    }),
    requestFleetMaintenance: builder.mutation({
      async queryFn({ truckId, serviceType, description, date, estimatedCost }, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        const type = text(serviceType)?.toUpperCase();
        if (!text(truckId)) return unavailable('Select a vehicle.');
        if (!['PREVENTIVE', 'REPAIR', 'INSPECTION', 'BREAKDOWN'].includes(type)) return unavailable('Use PREVENTIVE, REPAIR, INSPECTION or BREAKDOWN as the service type.');
        if (!text(description) || description.trim().length > 1000) return unavailable('Enter a description of up to 1000 characters.');
        const due = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
        if (!due || !Number.isFinite(due.getTime()) || due.toISOString().slice(0, 10) !== date) return unavailable('Enter a valid scheduled date.');
        const cost = estimatedCost === '' ? null : Number(estimatedCost);
        if (cost !== null && (!Number.isFinite(cost) || cost < 0)) return unavailable('Enter a valid estimated cost.');
        const result = await baseQuery({ url: '/maintenance', method: 'POST', body: { truckId, type, description: description.trim(), dueDate: date, ...(cost === null ? {} : { estimatedCost: cost }) } });
        if (result.error) return result;
        const saved = unwrapApiResponseData(result.data)?.maintenance;
        return text(saved?.id) && saved.truck?.id === truckId && saved.status === 'REQUESTED' ? { data: maintenanceView(saved) } : unavailable('The API did not confirm the maintenance request. Reload before trying again.');
      },
      invalidatesTags: changedTags,
    }),
    completeFleetMaintenance: builder.mutation({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = signedIn(api); if (blocked) return blocked;
        if (!text(id)) return unavailable('This maintenance record has no API ID.');
        const result = await baseQuery({ url: `/maintenance/${encodeURIComponent(id)}/complete`, method: 'POST' });
        if (result.error) return result;
        const confirmed = await baseQuery(`/maintenance/${encodeURIComponent(id)}`);
        if (confirmed.error) return unavailable('Completion could not be confirmed. Reload the records before trying again.');
        const saved = unwrapApiResponseData(confirmed.data);
        return saved?.id === id && saved.status === 'COMPLETED' ? { data: maintenanceView(saved) } : unavailable('The API did not confirm completion. Reload the records.');
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

export const { useAddFleetVehicleMutation, useGetFleetQuery, useGetFleetDriversQuery, useAssignFleetDriverMutation, useGetFleetMaintenanceQuery, useRequestFleetMaintenanceMutation, useCompleteFleetMaintenanceMutation, useGetFleetTripsQuery, useLazyExportFleetTripsQuery } = fleetApi;
