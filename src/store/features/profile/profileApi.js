import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { setCredentials } from '../auth/authSlice.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const boolean = (value) => typeof value === 'boolean' ? value : null;
const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const displayDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
const languages = { en: 'English', fr: 'French', ha: 'Hausa (coming soon)', yo: 'Yoruba (coming soon)', ig: 'Igbo (coming soon)', pcm: 'Pidgin (coming soon)' };
const timezones = {
  'Africa/Lagos': 'Africa/Lagos (WAT, UTC+1)', 'Africa/Accra': 'Africa/Accra (GMT, UTC+0)',
  'Africa/Nairobi': 'Africa/Nairobi (EAT, UTC+3)', 'Europe/London': 'Europe/London (UTC+0/+1)',
};
const permissionModules = {
  'Jobs & Trips': ['jobs', 'bids', 'trips'],
  'Fleet & Drivers': ['fleet', 'trucks', 'drivers', 'documents', 'maintenance'],
  Finance: ['finance', 'wallet', 'wallets', 'payouts', 'payments', 'earnings', 'receipts', 'invoices', 'banks'],
  Administration: ['team', 'roles', 'settings', 'notifications', 'reports'],
};
function timezoneId(value) {
  if (!text(value) || /^[+-]/.test(value) || value.length > 60) return null;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return value; }
  catch { return null; }
}
const wireValue = (mapping, value) => Object.entries(mapping).find(([, label]) => label === value)?.[0];
function timestamp(value, timezone) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: timezoneId(timezone) ?? 'Africa/Lagos',
  }).format(new Date(value));
}

export const EMPTY_PROFILE = {
  name: '—', email: '—', phone: '—', photoUrl: null, companyName: '—', joined: '—',
  emailVerified: null, phoneVerified: null,
  title: '—', bio: '—', language: '—', timezone: '—', timezoneId: null,
};

function contactValue(channel, value) {
  if (typeof value !== 'string') return null;
  if (channel === 'email') return /^\S+@\S+\.\S+$/.test(value.trim()) ? value.trim() : null;
  if (channel === 'phone') {
    const phone = value.replace(/\s/g, '');
    return /^\+?\d{10,15}$/.test(phone) ? phone : null;
  }
  return null;
}

export const isProfileContactValid = (channel, value) => contactValue(channel, value) !== null;

const verificationTime = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? Date.parse(value) : null;

function profileAccountError(api, editing = false) {
  const account = api.getState().auth.account;
  if (!account) return unavailable('Sign in to manage your profile.');
  if (editing) {
    const access = profileApi.endpoints.getMyProfileAccess.select()(api.getState()).data;
    if (access?.companyId !== account.id || access.canEdit !== true) {
      return unavailable('You need the settings.edit permission to update this company profile.');
    }
  }
  return null;
}

function profileResult(response, api) {
  const user = unwrapApiResponseData(response)?.user;
  if (!user?.id || user.id !== api.getState().auth.account?.id) {
    return unavailable('The API did not return your profile.');
  }
  const nameParts = { firstName: text(user.firstName), middleName: text(user.middleName), lastName: text(user.lastName) };
  return { data: {
    ...EMPTY_PROFILE,
    id: user.id,
    nameParts,
    name: Object.values(nameParts).filter(Boolean).join(' ') || '—',
    email: text(user.email) ?? '—',
    phone: text(user.phone) ?? '—',
    photoUrl: text(user.avatarUrl),
    companyName: text(user.businessName) ?? '—',
    joined: displayDate(user.createdAt),
    emailVerified: boolean(user.emailVerified),
    phoneVerified: boolean(user.phoneVerified),
    title: text(user.title) ?? '—',
    bio: text(user.bio) ?? '—',
    language: Object.hasOwn(languages, user.language) ? languages[user.language] : '—',
    timezone: timezones[timezoneId(user.timezone)] ?? timezoneId(user.timezone) ?? '—',
    timezoneId: timezoneId(user.timezone),
  } };
}

async function syncProfile(_arg, { dispatch, getState, queryFulfilled }) {
  const previousAccount = getState().auth.account;
  try {
    const { data } = await queryFulfilled;
    const account = getState().auth.account;
    // Refreshing tokens keeps the account object. A logout, different login or
    // newer profile sync replaces it, so an older response must not overwrite it.
    if (!data || account !== previousAccount || account?.id !== data.id) return;
    dispatch(setCredentials({ account: {
      ...account, name: data.name, email: data.email, phone: data.phone,
      photoUrl: data.photoUrl, companyName: data.companyName, title: data.title,
      emailVerified: data.emailVerified, phoneVerified: data.phoneVerified,
    } }));
    dispatch(profileApi.util.updateQueryData('getMyProfile', undefined, () => data));
  } catch {
    // Keep the last confirmed account. The screen presents the request error.
  }
}

async function syncProfilePhoto(_arg, { dispatch, getState, queryFulfilled }) {
  const previousAccount = getState().auth.account;
  try {
    const { data } = await queryFulfilled;
    const account = getState().auth.account;
    if (!data || !account || account !== previousAccount || !Object.hasOwn(data, 'photoUrl')) return;
    dispatch(setCredentials({ account: { ...account, photoUrl: data.photoUrl } }));
    dispatch(profileApi.util.updateQueryData('getMyProfile', undefined, (profile) => {
      if (profile.id === account.id) profile.photoUrl = data.photoUrl;
    }));
  } catch {
    // Keep the last confirmed photo when the upload or removal fails.
  }
}

export const profileApi = baseApi.enhanceEndpoints({ addTagTypes: ['Profile', 'ProfileAccess'] }).injectEndpoints({
  overrideExisting: process.env.NODE_ENV === 'development',
  endpoints: (builder) => ({
    getMyProfile: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = profileAccountError(api);
        if (blocked) return blocked;
        const result = await baseQuery('/profile');
        return result.error ? result : profileResult(result.data, api);
      },
      providesTags: ['Profile'],
      onQueryStarted: syncProfile,
    }),
    getMyProfileAccess: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = profileAccountError(api);
        if (blocked) return blocked;
        const results = await Promise.allSettled([
          baseQuery('/team/me'), baseQuery('/team/roles'), baseQuery('/team/permissions'),
        ]);
        const [meResult, rolesResult, catalogResult] = results.map((result) => result.status === 'fulfilled'
          ? result.value : unavailable('Could not load company access information.'));
        if (meResult.error) return meResult;
        const me = unwrapApiResponseData(meResult.data);
        if (me?.companyId !== api.getState().auth.account?.id || typeof me.isOwner !== 'boolean' || !text(me.userId)) {
          return unavailable('The API did not identify your access to this company.');
        }
        const permissions = Array.isArray(me.permissions) && me.permissions.every((key) => text(key)) ? me.permissions : null;
        const roles = rolesResult.error ? null : unwrapApiResponseData(rolesResult.data)?.roles;
        const role = Array.isArray(roles) ? roles.find((entry) => entry?.id === me.role?.id) : null;
        const modules = catalogResult.error ? null : unwrapApiResponseData(catalogResult.data)?.modules;
        const groups = Object.fromEntries(Object.entries(permissionModules).map(([group, moduleNames]) => {
          if (!modules || typeof modules !== 'object' || (!me.isOwner && permissions === null)) return [group, { value: '—', granted: false }];
          const entries = Object.values(modules).flatMap((entries) => Array.isArray(entries) ? entries : [])
            .filter((entry) => text(entry?.key) && text(entry?.label) && moduleNames.includes(entry.key.split('.')[0]));
          if (!entries.length) return [group, { value: '—', granted: false }];
          const granted = entries.filter((entry) => me.isOwner || permissions.includes(entry.key));
          return [group, { value: granted.length ? [...new Set(granted.map((entry) => entry.label))].join(', ') : 'No access', granted: granted.length > 0 }];
        }));
        return { data: {
          companyId: me.companyId, userId: me.userId, isOwner: me.isOwner,
          roleName: text(me.role?.name) ?? (me.isOwner ? 'Owner' : '—'),
          roleDescription: text(role?.description) ?? '—',
          canEdit: me.isOwner || (permissions === null ? null : permissions.includes('settings.edit')),
          canManageBank: me.isOwner || (permissions === null ? null : permissions.includes('finance.withdraw')),
          canWithdraw: me.isOwner || (permissions === null ? null : permissions.includes('finance.withdraw')),
          groups,
        } };
      },
      providesTags: ['ProfileAccess'],
    }),
    getMyProfileLoginHistory: builder.query({
      async queryFn(timezone, _api, _options, baseQuery) {
        const result = await baseQuery({ url: '/profile/login-history', params: { page: 1, limit: 10 } });
        if (result.error) return result;
        const data = unwrapApiResponseData(result.data);
        if (!Array.isArray(data?.records) || data.records.some((record) => !record || typeof record !== 'object' || Array.isArray(record))) {
          return unavailable('The API did not return a valid sign-in history collection.');
        }
        return { data: data.records.map((record) => ({
          id: text(record.id), time: timestamp(record.timestamp, timezone),
          device: text(record.device) ?? '—', location: text(record.location) ?? '—',
          result: record.result === 'SUCCESS' ? 'Success' : record.result === 'FAILED' ? 'Failed' : '—',
        })) };
      },
    }),
    updateMyProfile: builder.mutation({
      async queryFn(changes, api, _options, baseQuery) {
        const blocked = profileAccountError(api, true);
        if (blocked) return blocked;
        if (Object.keys(changes).some((key) => !['name', 'title', 'bio', 'language', 'timezone'].includes(key))) return unavailable('The profile form contains an unsupported field.');
        const current = profileApi.endpoints.getMyProfile.select()(api.getState()).data;
        if (!current) return unavailable('Load your profile before saving changes.');
        const body = {};
        if ('name' in changes) {
          const names = text(changes.name)?.split(/\s+/);
          if (!names || names.length < 2) return unavailable('Enter your first and last name.');
          const next = { firstName: names[0], middleName: names.slice(1, -1).join(' '), lastName: names.at(-1) };
          if (Object.values(next).some((part) => part.length > 60)) return unavailable('Each name must be 60 characters or fewer.');
          Object.assign(body, Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== (current.nameParts[key] ?? ''))));
        }
        for (const [key, limit] of [['title', 80], ['bio', 500]]) {
          if (!(key in changes)) continue;
          if (typeof changes[key] !== 'string' || changes[key].length > limit) return unavailable(`${key === 'title' ? 'Job title' : 'Bio'} must be ${limit} characters or fewer.`);
          body[key] = changes[key].trim();
        }
        if ('language' in changes) {
          const language = wireValue(languages, changes.language);
          if (!language) return unavailable('The API does not support the selected language yet.');
          body.language = language;
        }
        if ('timezone' in changes) {
          const timezone = timezoneId(wireValue(timezones, changes.timezone) ?? changes.timezone);
          if (!timezone) return unavailable('Choose a valid time zone.');
          body.timezone = timezone;
        }
        if (!Object.keys(body).length) return unavailable('There are no profile changes to save.');
        const account = api.getState().auth.account;
        const result = await baseQuery({ url: '/profile', method: 'PATCH', body });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload your profile.');
        const saved = profileResult(result.data, api);
        if (saved.error) return saved;
        const user = unwrapApiResponseData(result.data).user;
        const confirmed = Object.entries(body).every(([key, expected]) => {
          const actual = user[key];
          if (expected === '' && ['middleName', 'title', 'bio'].includes(key)) return actual === null || actual === '';
          return typeof actual === 'string' && actual.trim() === expected;
        });
        return confirmed ? saved : unavailable('The API did not confirm the saved profile changes. Reload your profile before retrying.');
      },
      onQueryStarted: syncProfile,
      invalidatesTags: (_data, error) => error ? [] : ['Profile'],
    }),
    uploadMyProfilePhoto: builder.mutation({
      async queryFn(file, api, _options, baseQuery) {
        const blocked = profileAccountError(api, true);
        if (blocked) return blocked;
        if (!(file instanceof File) || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
          return unavailable('Choose an image under 5 MB.');
        }
        const body = new FormData();
        body.append('file', file);
        const result = await baseQuery({ url: '/profile/avatar', method: 'POST', body });
        if (result.error) return result;
        const photoUrl = text(unwrapApiResponseData(result.data)?.avatarUrl);
        return photoUrl ? { data: { photoUrl } } : unavailable('The API did not confirm your uploaded profile photo.');
      },
      onQueryStarted: syncProfilePhoto,
      invalidatesTags: (_data, error) => error ? [] : ['Profile'],
    }),
    removeMyProfilePhoto: builder.mutation({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = profileAccountError(api, true);
        if (blocked) return blocked;
        const result = await baseQuery({ url: '/profile/avatar', method: 'DELETE' });
        if (result.error) return result;
        return unwrapApiResponseData(result.data)?.avatarUrl === null
          ? { data: { photoUrl: null } } : unavailable('The API did not confirm removal of your profile photo.');
      },
      onQueryStarted: syncProfilePhoto,
      invalidatesTags: (_data, error) => error ? [] : ['Profile'],
    }),
    requestProfileEmailVerification: builder.mutation({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = profileAccountError(api);
        if (blocked) return blocked;
        const result = await baseQuery({ url: '/profile/request-email-verification', method: 'POST' });
        if (result.error) {
          const seconds = unwrapApiResponseData(result.error.data)?.retryAfterSeconds;
          return { error: { ...result.error, retryAt: Number.isFinite(seconds) && seconds > 0 ? Date.now() + seconds * 1000 : null } };
        }
        const data = unwrapApiResponseData(result.data);
        if (typeof data?.emailVerified !== 'boolean') return unavailable('The API did not confirm whether an email verification code was sent.');
        const expiresAt = verificationTime(data.expiresAt), resendAt = verificationTime(data.resendAvailableAt);
        if (data.emailVerified === false && (expiresAt === null || resendAt === null || expiresAt <= Date.now() || resendAt > expiresAt)) {
          return unavailable('The API did not return valid email verification expiry and resend details.');
        }
        return { data: { verified: data.emailVerified, expiresAt, resendAt } };
      },
      invalidatesTags: (data, error) => !error && data?.verified === true ? ['Profile', 'AuthOnboardingSecurity'] : [],
    }),
    verifyProfileEmail: builder.mutation({
      async queryFn({ code }, api, _options, baseQuery) {
        const blocked = profileAccountError(api);
        if (blocked) return blocked;
        if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return unavailable('Enter the 6-digit verification code.');
        const result = await baseQuery({ url: '/profile/verify-email', method: 'POST', body: { code } });
        if (result.error) return result;
        return unwrapApiResponseData(result.data)?.emailVerified === true
          ? { data: { verified: true } } : unavailable('The API did not confirm email verification.');
      },
      invalidatesTags: (_data, error) => error ? [] : ['Profile', 'AuthOnboardingSecurity'],
    }),
    requestProfileContactChange: builder.mutation({
      async queryFn({ channel, value }, api, _options, baseQuery) {
        const blocked = profileAccountError(api, true);
        if (blocked) return blocked;
        if (!['email', 'phone'].includes(channel)) return unavailable('Choose email or phone.');
        const contact = contactValue(channel, value);
        if (!contact) return unavailable(channel === 'email' ? 'Enter a valid email.' : 'Enter a valid phone number.');
        return baseQuery({
          url: `/profile/request-${channel}-change`, method: 'POST',
          body: channel === 'email' ? { newEmail: contact } : { newPhone: contact },
        });
      },
    }),
    verifyProfileContactChange: builder.mutation({
      async queryFn({ channel, value, code }, api, _options, baseQuery) {
        const blocked = profileAccountError(api, true);
        if (blocked) return blocked;
        if (!['email', 'phone'].includes(channel)) return unavailable('Choose email or phone.');
        if (!/^\d{6}$/.test(code)) return unavailable('Enter the 6-digit verification code.');
        const contact = contactValue(channel, value);
        if (!contact) return unavailable(channel === 'email' ? 'Enter a valid email.' : 'Enter a valid phone number.');
        const account = api.getState().auth.account;
        const result = await baseQuery({
          url: `/profile/verify-${channel}-change`, method: 'POST',
          body: { ...(channel === 'email' ? { newEmail: contact } : { newPhone: contact }), code },
        });
        if (result.error) return result;
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload your profile.');
        const readback = await baseQuery('/profile');
        if (readback.error) return unavailable('The contact change was submitted, but confirmation failed. Reload your profile before retrying.');
        if (api.getState().auth.account !== account) return unavailable('Your company session changed. Reload your profile.');
        const profile = profileResult(readback.data, api);
        if (profile.error) return profile;
        const normalize = (value) => channel === 'email' ? value.trim().toLowerCase() : value.replace(/\D/g, '');
        return normalize(profile.data[channel]) === normalize(contact)
          ? profile : unavailable('The API did not confirm your updated contact. Reload your profile before retrying.');
      },
      onQueryStarted: syncProfile,
      invalidatesTags: (_data, error) => error ? [] : ['Profile', 'AuthOnboardingSecurity'],
    }),
  }),
});

export const {
  useGetMyProfileQuery, useGetMyProfileAccessQuery, useGetMyProfileLoginHistoryQuery,
  useUpdateMyProfileMutation, useUploadMyProfilePhotoMutation,
  useRemoveMyProfilePhotoMutation, useRequestProfileContactChangeMutation, useVerifyProfileContactChangeMutation,
  useRequestProfileEmailVerificationMutation, useVerifyProfileEmailMutation,
} = profileApi;
