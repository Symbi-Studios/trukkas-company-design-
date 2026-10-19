import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { settingsAccess, settingsUnavailable } from './settingsApi.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const collection = (value) => Array.isArray(value) && value.every((row) => row && typeof row === 'object' && !Array.isArray(row)) ? value : null;
const keys = (value) => Array.isArray(value) && value.every((key) => text(key)) ? value : null;
const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
const roleView = (row) => ({
  id: text(row.id), name: text(row.name) ?? '—', description: text(row.description) ?? '—',
  system: typeof row.isSystem === 'boolean' ? row.isSystem : null,
  locked: !text(row.id) || row.editable !== true || row.isSystem !== false,
  permissions: keys(row.permissions), memberCount: Number.isSafeInteger(row.memberCount) && row.memberCount >= 0 ? row.memberCount : null,
});
const tags = ['SettingsTeam', 'ProfileAccess'];
const financeApproval = 'The team API does not support PIN approval for granting finance permissions yet.';

export const settingsTeamApi = baseApi.enhanceEndpoints({ addTagTypes: ['SettingsTeam'] }).injectEndpoints({
  endpoints: (builder) => ({
    getSettingsRoles: builder.query({
      async queryFn(_arg, _api, _options, baseQuery) {
        const [roleResult, catalogResult] = await Promise.all([baseQuery('/team/roles'), baseQuery('/team/permissions')]);
        if (roleResult.error) return roleResult;
        const roles = collection(unwrapApiResponseData(roleResult.data)?.roles);
        if (!roles) return settingsUnavailable('The API did not return a valid role collection.');
        const modules = catalogResult.error ? null : unwrapApiResponseData(catalogResult.data)?.modules;
        const entries = modules && typeof modules === 'object' && !Array.isArray(modules) ? Object.values(modules).flatMap((items) => collection(items) ?? []) : null;
        return { data: { roles: roles.map(roleView), supportedKeys: entries?.map((entry) => text(entry.key)).filter(Boolean) ?? null } };
      },
      providesTags: ['SettingsTeam'],
    }),
    getSettingsTeam: builder.query({
      async queryFn(_arg, _api, _options, baseQuery) {
        const [memberResult, inviteResult] = await Promise.all([baseQuery('/team/members'), baseQuery('/team/invites')]);
        if (memberResult.error) return memberResult;
        const members = collection(unwrapApiResponseData(memberResult.data)?.members);
        if (!members) return settingsUnavailable('The API did not return a valid member collection.');
        const invites = inviteResult.error ? null : collection(unwrapApiResponseData(inviteResult.data)?.invites);
        return { data: { members: [
          ...members.map((row) => ({ id: text(row.id), kind: 'member', name: [text(row.user?.firstName), text(row.user?.lastName)].filter(Boolean).join(' ') || '—', email: text(row.user?.email) ?? '—', roleId: text(row.roleId) ?? text(row.role?.id), roleName: text(row.role?.name) ?? '—', status: ({ ACTIVE: 'Active', SUSPENDED: 'Suspended' })[row.status] ?? '—', twoFactor: null, lastActive: date(row.user?.lastLoginAt) })),
          ...(invites ?? []).map((row) => ({ id: text(row.id), kind: 'invite', name: '—', email: text(row.email) ?? '—', roleId: text(row.role?.id), roleName: text(row.role?.name) ?? '—', status: row.status === 'PENDING' ? 'Invited' : '—', twoFactor: null, lastActive: '—' })),
        ], warning: invites === null ? 'Pending invitations could not be loaded.' : null } };
      },
      providesTags: ['SettingsTeam'],
    }),
    inviteSettingsMember: builder.mutation({
      async queryFn({ email, roleId, pin }, api, _options, baseQuery) {
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        if (pin !== undefined) return settingsUnavailable(financeApproval);
        if (!text(email) || !/^\S+@\S+\.\S+$/.test(email.trim()) || !text(roleId)) return settingsUnavailable('Enter a valid email and choose a role.');
        const result = await baseQuery({ url: '/team/invites', method: 'POST', body: { email: email.trim(), roleId } });
        return result.error ? result : { data: { email: email.trim() } };
      },
      invalidatesTags: tags,
    }),
    updateSettingsMember: builder.mutation({
      async queryFn({ id, changes, pin }, api, _options, baseQuery) {
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        if (pin !== undefined) return settingsUnavailable(financeApproval);
        if (!text(id) || Object.keys(changes).some((key) => !['roleId', 'status'].includes(key))) return settingsUnavailable('Choose a valid member change.');
        const body = {};
        if ('roleId' in changes) { if (!text(changes.roleId)) return settingsUnavailable('Choose a role.'); body.roleId = changes.roleId; }
        if ('status' in changes) {
          const status = ({ Active: 'ACTIVE', Suspended: 'SUSPENDED' })[changes.status];
          if (!status) return settingsUnavailable('Choose Active or Suspended.');
          body.status = status;
        }
        return baseQuery({ url: `/team/members/${encodeURIComponent(id)}`, method: 'PATCH', body });
      },
      invalidatesTags: tags,
    }),
    removeSettingsMember: builder.mutation({
      async queryFn({ id, kind }, api, _options, baseQuery) {
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        if (!text(id) || !['member', 'invite'].includes(kind)) return settingsUnavailable('Choose a valid member or invitation.');
        return baseQuery({ url: `/team/${kind === 'invite' ? 'invites' : 'members'}/${encodeURIComponent(id)}`, method: 'DELETE' });
      },
      invalidatesTags: tags,
    }),
    resendSettingsInvite: builder.mutation({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        if (!text(id)) return settingsUnavailable('Choose a valid invitation.');
        const result = await baseQuery({ url: `/team/invites/${encodeURIComponent(id)}/resend`, method: 'POST' });
        if (result.error) return result;
        const delivery = unwrapApiResponseData(result.data)?.delivery;
        return delivery?.status === 'SENT' ? { data: { sent: true } } : settingsUnavailable(text(delivery?.error) ?? 'The API did not confirm delivery of the invitation.');
      },
      invalidatesTags: tags,
    }),
    saveSettingsRole: builder.mutation({
      async queryFn(draft, api, _options, baseQuery) {
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        const cached = settingsTeamApi.endpoints.getSettingsRoles.select()(api.getState()).data;
        if (Object.hasOwn(draft, 'id') && !text(draft.id)) return settingsUnavailable('The role has no confirmed API ID.');
        const current = cached?.roles?.find((role) => role.id === draft.id);
        if (draft.id && (!current || current.locked)) return settingsUnavailable('System roles cannot be edited.');
        if (!text(draft.name) || !Array.isArray(draft.permissions) || (draft.description !== undefined && typeof draft.description !== 'string')) return settingsUnavailable('Enter a role name and valid permissions.');
        const changedPermissions = !current || JSON.stringify([...(current.permissions ?? [])].sort()) !== JSON.stringify([...draft.permissions].sort());
        if (changedPermissions && (!cached?.supportedKeys || draft.permissions.some((key) => !cached.supportedKeys.includes(key)))) return settingsUnavailable('The permission catalog does not confirm these permission keys.');
        const body = {
          ...(!current || draft.name !== current.name ? { name: draft.name.trim() } : {}),
          ...(!current || draft.description !== current.description ? { description: draft.description === '—' ? '' : draft.description ?? '' } : {}),
          ...(changedPermissions ? { permissionKeys: draft.permissions } : {}),
        };
        const result = await baseQuery({ url: draft.id ? `/team/roles/${encodeURIComponent(draft.id)}` : '/team/roles', method: draft.id ? 'PATCH' : 'POST', body });
        if (result.error) return result;
        // Write response bodies are undocumented; confirm the saved role by
        // reading the documented list instead of assuming a response wrapper.
        const readback = await baseQuery('/team/roles');
        if (readback.error) return settingsUnavailable('The role was saved, but confirmation failed. Refresh the role list before retrying.');
        const roles = collection(unwrapApiResponseData(readback.data)?.roles);
        const candidates = roles?.filter((row) => draft.id ? row.id === draft.id : !cached.roles.some((role) => role.id === row.id) && row.name === body.name);
        return candidates?.length === 1 && text(candidates[0].id) ? { data: roleView(candidates[0]) } : settingsUnavailable('The role was saved, but its ID could not be confirmed. Refresh the role list before retrying.');
      },
      invalidatesTags: tags,
    }),
    deleteSettingsRole: builder.mutation({
      async queryFn(id, api, _options, baseQuery) {
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        const role = settingsTeamApi.endpoints.getSettingsRoles.select()(api.getState()).data?.roles.find((row) => row.id === id);
        if (!text(id) || !role || role.locked) return settingsUnavailable('System roles cannot be deleted.');
        return baseQuery({ url: `/team/roles/${encodeURIComponent(id)}`, method: 'DELETE' });
      },
      invalidatesTags: tags,
    }),
  }),
});

export const { useGetSettingsRolesQuery, useGetSettingsTeamQuery, useInviteSettingsMemberMutation, useUpdateSettingsMemberMutation, useRemoveSettingsMemberMutation, useResendSettingsInviteMutation, useSaveSettingsRoleMutation, useDeleteSettingsRoleMutation } = settingsTeamApi;
