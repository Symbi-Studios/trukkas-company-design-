// @ts-nocheck -- legacy module: complete TypeScript typing during migration.
import { baseApi, unwrapApiResponseData } from '../../api/baseApi';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const option = (row) => text(row?.id) && text(row?.name) ? { value: row.id, label: row.name, code: text(row.code), sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : null } : null;
const list = (data, key) => {
  const items = Array.isArray(data?.[key]) ? data[key].map(option) : null;
  return items && items.every(Boolean) ? items : null;
};

/**
 * Equipment a truck can carry. Job matching uses it: break-bulk jobs match on
 * truck type (Flatbed, Lowbed…), container jobs on container type + size.
 */
export const referenceApi = baseApi.enhanceEndpoints({ addTagTypes: ['ReferenceEquipment'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getEquipmentOptions: builder.query({
      async queryFn(_arg, _api, _options, baseQuery) {
        const [types, containerTypes, sizes] = await Promise.all([
          baseQuery('/reference/truck-types'), baseQuery('/reference/container-types'), baseQuery('/reference/container-sizes'),
        ]);
        const failed = [types, containerTypes, sizes].find((result) => result.error);
        if (failed) return failed;
        const view = {
          truckTypes: list(unwrapApiResponseData(types.data), 'truckTypes'),
          containerTypes: list(unwrapApiResponseData(containerTypes.data), 'containerTypes'),
          containerSizes: list(unwrapApiResponseData(sizes.data), 'containerSizes')?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        };
        return Object.values(view).every(Boolean) ? { data: view } : { error: { status: 'CUSTOM_ERROR', error: 'The API did not return the equipment options.' } };
      },
      keepUnusedDataFor: 3600,
      providesTags: ['ReferenceEquipment'],
    }),
  }),
});

export const { useGetEquipmentOptionsQuery } = referenceApi;

export const EMPTY_EQUIPMENT = { kind: '', truckTypeId: '', containerTypeId: '', containerSizeId: '', containerWeight: '' };

/** Equipment draft → PATCH /dashboard/trucks fields; null when incomplete. */
export function equipmentBody(equipment) {
  if (equipment?.kind === 'bulk') return text(equipment.truckTypeId) ? { truckTypeId: equipment.truckTypeId } : null;
  if (equipment?.kind === 'container') {
    const weight = Number(equipment.containerWeight);
    return text(equipment.containerTypeId) && text(equipment.containerSizeId) && Number.isFinite(weight) && weight > 0
      ? { containerTypeId: equipment.containerTypeId, containerSizeId: equipment.containerSizeId, containerWeight: String(weight) } : null;
  }
  return null;
}
