import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { settingsAccess, settingsCompanyQuery, settingsUnavailable } from './settingsApi.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const collection = (value) => Array.isArray(value) && value.every((row) => row && typeof row === 'object' && !Array.isArray(row)) ? value : null;
const keys = (value) => Array.isArray(value) && value.every((key) => text(key)) ? value : null;
const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
const roleView = (row) => ({
  id: text(row.id), name: text(row.name) ?? '—', description: text(row.description) ?? '—',
  system: typeof row.isSystem === 'boolean' ? row.isSystem : null,
  locked: !text(row.id) || row.editable !== true || row.isSystem !== false,
  permissions: keys(row.permissions), memberCount: Number.isSafeInteger(row.memberCount) && row.memberCount >= 0 ? row.memberCount : null,
});
const tags = ['SettingsTeam', 'ProfileAccess'];

function permissionBindings(supportedKeys) {
  if (!supportedKeys) return null;
  const bindings = Object.fromEntries(supportedKeys.map((key) => [key, [key]]));
  // Keep the existing labels while using the backend's documented permissions.
  // The jobs/trips checkbox represents both reads, including partially granted roles.
  for (const [key, permissions] of Object.entries({
    'jobs.view': ['jobs.view', 'trips.view'],
    'jobs.bid': ['bids.view', 'bids.create'],
    'jobs.dispatch': ['trips.assign', 'trips.edit'],
    // The existing label covers adding/editing/assignment, not deletion.
    'fleet.manage': ['fleet.view', 'fleet.create', 'fleet.edit'],
    'finance.bank': ['finance.withdraw'],
    'finance.payout': ['finance.withdraw'],
    'documents.manage': ['documents.upload'],
    'settings.manage': ['settings.edit'],
  })) bindings[key] = permissions.every((permission) => supportedKeys.includes(permission)) ? permissions : null;
  // Team and role administration is explicitly owner-only, with no delegable key.
  bindings['team.manage'] = null;
  bindings['roles.manage'] = null;
  // Payouts now uses the documented wallet withdrawal flow as approved.
  return bindings;
}

export function settingsRoleNeedsApproval(draft, current, pinSet) {
  const changed = !current || JSON.stringify([...(current.permissions ?? [])].sort()) !== JSON.stringify([...(draft.permissions ?? [])].sort());
  if (!changed) return false;
  if (typeof pinSet !== 'boolean') return null;
  return pinSet || [...(draft.permissions ?? []), ...(current?.permissions ?? [])].some((key) => ['finance.payout', 'finance.withdraw', 'finance.bank'].includes(key));
}

export function settingsPermissionState(permissions, binding) {
  if (!Array.isArray(permissions) || !binding?.length) return null;
  const granted = binding.filter((key) => permissions.includes(key)).length;
  return granted === binding.length ? true : granted === 0 ? false : null;
}

export function toggleSettingsPermission(permissions, binding) {
  if (!Array.isArray(permissions) || !binding?.length) return permissions;
  return settingsPermissionState(permissions, binding) === true
    ? permissions.filter((key) => !binding.includes(key)) : [...new Set([...permissions, ...binding])];
}

async function teamApproval(pin, api, baseQuery) {
  const account = api.getState().auth.account;
  const result = await baseQuery('/profile/security-settings');
  if (result.error) return result;
  if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload before changing the team.');
  const pinSet = unwrapApiResponseData(result.data)?.transactionPinSet;
  if (typeof pinSet !== 'boolean') return settingsUnavailable('The API did not confirm your transaction PIN status.');
  if (pinSet && !/^\d{4}$/.test(pin || '')) return settingsUnavailable('Approve this team change with your four-digit transaction PIN.');
  if (!pinSet && pin !== undefined) return settingsUnavailable('Create your transaction PIN before approving this team change.');
  return { data: pinSet ? { transactionPin: pin } : {} };
}

export const settingsTeamApi = baseApi.enhanceEndpoints({ addTagTypes: ['SettingsTeam'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getSettingsRoles: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const [roleResult, catalogResult] = await Promise.all([baseQuery('/team/roles'), baseQuery('/team/permissions')]);
        if (roleResult.error) return roleResult;
        const roles = collection(unwrapApiResponseData(roleResult.data)?.roles);
        if (!roles || roles.some((role) => !text(role.id)) || new Set(roles.map((role) => role.id)).size !== roles.length) return settingsUnavailable('The API did not return a valid role collection.');
        const modules = catalogResult.error ? null : unwrapApiResponseData(catalogResult.data)?.modules;
        const entries = modules && typeof modules === 'object' && !Array.isArray(modules) ? Object.values(modules).flatMap((items) => collection(items) ?? []) : null;
        const supportedKeys = entries?.map((entry) => text(entry.key)).filter(Boolean) ?? null;
        return { data: { roles: roles.map(roleView), supportedKeys, permissionBindings: permissionBindings(supportedKeys) } };
      },
      providesTags: ['SettingsTeam'],
    }),
    getSettingsTeam: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const [memberResult, inviteResult] = await Promise.all([baseQuery('/team/members'), baseQuery('/team/invites')]);
        if (memberResult.error) return memberResult;
        const members = collection(unwrapApiResponseData(memberResult.data)?.members);
        if (!members || members.some((member) => !text(member.id)) || new Set(members.map((member) => member.id)).size !== members.length) return settingsUnavailable('The API did not return a valid member collection.');
        const loadedInvites = inviteResult.error ? null : collection(unwrapApiResponseData(inviteResult.data)?.invites);
        const invites = loadedInvites && loadedInvites.every((row) => text(row.id)) && new Set(loadedInvites.map((row) => row.id)).size === loadedInvites.length ? loadedInvites : null;
        return { data: { members: [
          ...members.map((row) => ({ id: text(row.id), kind: 'member', name: [text(row.user?.firstName), text(row.user?.lastName)].filter(Boolean).join(' ') || '—', email: text(row.user?.email) ?? '—', roleId: text(row.roleId) ?? text(row.role?.id), roleName: text(row.role?.name) ?? '—', status: ({ ACTIVE: 'Active', SUSPENDED: 'Suspended' })[row.status] ?? '—', twoFactor: null, lastActive: date(row.user?.lastLoginAt) })),
          ...(invites ?? []).map((row) => ({ id: text(row.id), kind: 'invite', name: text(row.name) ?? '—', email: text(row.email) ?? '—', roleId: text(row.role?.id), roleName: text(row.role?.name) ?? '—', status: row.status === 'PENDING' ? 'Invited' : '—', twoFactor: null, lastActive: '—' })),
        ], warning: invites === null ? 'Pending invitations could not be loaded.' : null } };
      },
      providesTags: ['SettingsTeam'],
    }),
    inviteSettingsMember: builder.mutation({
      async queryFn({ name, email, phone, roleId, pin }, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        if (!text(email) || !/^\S+@\S+\.\S+$/.test(email.trim()) || !text(roleId)) return settingsUnavailable('Enter a valid email and choose a role.');
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 25))) return settingsUnavailable('Enter a name of at most 120 characters and a phone of at most 25 characters.');
        const account = api.getState().auth.account;
        const approval = await teamApproval(pin, api, baseQuery); if (approval.error) return approval;
        const result = await baseQuery({ url: '/team/invites', method: 'POST', body: {
          email: email.trim(), roleId, name: name.trim(), ...(text(phone) ? { phone: phone.trim() } : {}), ...approval.data,
        } });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload the team list.');
        const delivery = unwrapApiResponseData(result.data)?.delivery;
        if (delivery?.status === 'FAILED') return settingsUnavailable(text(delivery.error) ?? 'The API could not deliver this invitation.');
        const saved = await baseQuery('/team/invites');
        if (saved.error) return settingsUnavailable('The invitation was sent, but confirmation failed. Reload the team list before retrying.');
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload the team list.');
        const invite = collection(unwrapApiResponseData(saved.data)?.invites)?.find((row) => text(row.email)?.toLowerCase() === email.trim().toLowerCase() && row.status === 'PENDING' && row.role?.id === roleId);
        return invite && text(invite.id) ? { data: { email: invite.email, id: invite.id } } : settingsUnavailable('The API did not confirm an invitation with the selected email and role. Reload the team list before retrying.');
      },
      invalidatesTags: tags,
    }),
    updateSettingsMember: builder.mutation({
      async queryFn({ id, changes, pin }, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        const members = settingsTeamApi.endpoints.getSettingsTeam.select()(api.getState()).data?.members;
        if (!members?.some((member) => member.id === id && member.kind === 'member')) return settingsUnavailable('Choose a confirmed team member. Pending invitations can be resent or cancelled.');
        if (!text(id) || Object.keys(changes).some((key) => !['roleId', 'status'].includes(key))) return settingsUnavailable('Choose a valid member change.');
        const body = {};
        if ('roleId' in changes) { if (!text(changes.roleId)) return settingsUnavailable('Choose a role.'); body.roleId = changes.roleId; }
        if ('status' in changes) {
          const status = ({ Active: 'ACTIVE', Suspended: 'SUSPENDED' })[changes.status];
          if (!status) return settingsUnavailable('Choose Active or Suspended.');
          body.status = status;
        }
        if (!Object.keys(body).length) return settingsUnavailable('Choose a member change to save.');
        const account = api.getState().auth.account;
        const approval = await teamApproval(pin, api, baseQuery); if (approval.error) return approval;
        const result = await baseQuery({ url: `/team/members/${encodeURIComponent(id)}`, method: 'PATCH', body: { ...body, ...approval.data } });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload the team list.');
        const saved = await baseQuery('/team/members');
        if (saved.error) return settingsUnavailable('The member was updated, but confirmation failed. Reload before retrying.');
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload the team list.');
        const member = collection(unwrapApiResponseData(saved.data)?.members)?.find((row) => row.id === id);
        return member && (!body.status || member.status === body.status) && (!body.roleId || (member.roleId ?? member.role?.id) === body.roleId)
          ? { data: { saved: true } } : settingsUnavailable('The API did not confirm this member change. Reload the team list before retrying.');
      },
      invalidatesTags: tags,
    }),
    removeSettingsMember: builder.mutation({
      async queryFn({ id, kind }, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        if (!text(id) || !['member', 'invite'].includes(kind)) return settingsUnavailable('Choose a valid member or invitation.');
        const path = `/team/${kind === 'invite' ? 'invites' : 'members'}`;
        const result = await baseQuery({ url: `${path}/${encodeURIComponent(id)}`, method: 'DELETE' });
        if (result.error) return result;
        const saved = await baseQuery(path);
        if (saved.error) return settingsUnavailable('The removal could not be confirmed. Reload the team list before retrying.');
        const remaining = collection(unwrapApiResponseData(saved.data)?.[kind === 'invite' ? 'invites' : 'members']);
        return remaining && remaining.every((row) => text(row.id)) && !remaining.some((row) => row.id === id) ? { data: { removed: true } } : settingsUnavailable('The API did not confirm removal. Reload the team list before retrying.');
      },
      invalidatesTags: tags,
    }),
    resendSettingsInvite: builder.mutation({
      async queryFn(id, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
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
      async queryFn({ pin, ...draft }, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        const cached = settingsTeamApi.endpoints.getSettingsRoles.select()(api.getState()).data;
        if (!cached?.roles) return settingsUnavailable('Load the company role list before saving a role.');
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
        if (!Object.keys(body).length) return settingsUnavailable('There are no role changes to save.');
        const account = api.getState().auth.account;
        // Existing role permission edits require approval whenever a PIN exists;
        // new roles need it only when they include finance permissions.
        if (changedPermissions && (current || draft.permissions.some((key) => key.startsWith('finance.')))) {
          const approval = await teamApproval(pin, api, baseQuery);
          if (approval.error) return approval;
          Object.assign(body, approval.data);
        }
        const result = await baseQuery({ url: draft.id ? `/team/roles/${encodeURIComponent(draft.id)}` : '/team/roles', method: draft.id ? 'PATCH' : 'POST', body });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload the role list.');
        // Write response bodies are undocumented; confirm the saved role by
        // reading the documented list instead of assuming a response wrapper.
        const readback = await baseQuery('/team/roles');
        if (readback.error) return settingsUnavailable('The role was saved, but confirmation failed. Refresh the role list before retrying.');
        if (api.getState().auth.account !== account) return settingsUnavailable('Your company session changed. Reload the role list.');
        const roles = collection(unwrapApiResponseData(readback.data)?.roles);
        const candidates = roles?.filter((row) => draft.id ? row.id === draft.id : !cached.roles.some((role) => role.id === row.id) && row.name === body.name);
        const saved = candidates?.length === 1 ? candidates[0] : null;
        const confirmed = saved && text(saved.id)
          && (!Object.hasOwn(body, 'name') || text(saved.name) === body.name)
          && (!Object.hasOwn(body, 'description') || (text(saved.description) ?? '') === body.description.trim())
          && (!changedPermissions || (keys(saved.permissions) && JSON.stringify([...saved.permissions].sort()) === JSON.stringify([...body.permissionKeys].sort())));
        return confirmed ? { data: roleView(saved) } : settingsUnavailable('The API did not confirm the saved role changes. Refresh the role list before retrying.');
      },
      invalidatesTags: tags,
    }),
    deleteSettingsRole: builder.mutation({
      async queryFn(id, api, _options, baseQuery) {
        baseQuery = settingsCompanyQuery(api, baseQuery);
        const blocked = settingsAccess(api, true); if (blocked) return blocked;
        const role = settingsTeamApi.endpoints.getSettingsRoles.select()(api.getState()).data?.roles.find((row) => row.id === id);
        if (!text(id) || !role || role.locked) return settingsUnavailable('System roles cannot be deleted.');
        const result = await baseQuery({ url: `/team/roles/${encodeURIComponent(id)}`, method: 'DELETE' });
        if (result.error) return result;
        const saved = await baseQuery('/team/roles');
        if (saved.error) return settingsUnavailable('Role deletion could not be confirmed. Reload before retrying.');
        const remaining = collection(unwrapApiResponseData(saved.data)?.roles);
        return remaining && remaining.every((row) => text(row.id)) && !remaining.some((row) => row.id === id) ? { data: { removed: true } } : settingsUnavailable('The API did not confirm role deletion. Reload before retrying.');
      },
      invalidatesTags: tags,
    }),
  }),
});

export const { useGetSettingsRolesQuery, useGetSettingsTeamQuery, useInviteSettingsMemberMutation, useUpdateSettingsMemberMutation, useRemoveSettingsMemberMutation, useResendSettingsInviteMutation, useSaveSettingsRoleMutation, useDeleteSettingsRoleMutation } = settingsTeamApi;
