import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { setCredentials } from '../auth/authSlice.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const boolean = (value) => typeof value === 'boolean' ? value : null;
const unavailable = (error) => ({ error: { status: 'CUSTOM_ERROR', error } });
const displayDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';

export const EMPTY_PROFILE = {
  name: '—', email: '—', phone: '—', photoUrl: null, companyName: '—', joined: '—',
  emailVerified: null, phoneVerified: null,
  title: '—', bio: '—', language: '—', timezone: '—', loginHistory: null,
};

function personalAccountError(api) {
  const account = api.getState().auth.account;
  if (!account) return unavailable('Sign in to manage your profile.');
  if (account.actualUserId && account.actualUserId !== account.id) {
    return unavailable('The API does not document how to manage your personal profile while acting on behalf of a company.');
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
  } };
}

async function syncProfile(_arg, { dispatch, getState, queryFulfilled }) {
  const token = getState().auth.accessToken;
  try {
    const { data } = await queryFulfilled;
    const account = getState().auth.account;
    if (!data || token !== getState().auth.accessToken || account?.id !== data.id) return;
    dispatch(setCredentials({ account: {
      ...account, name: data.name, email: data.email, phone: data.phone,
      photoUrl: data.photoUrl, companyName: data.companyName,
      emailVerified: data.emailVerified, phoneVerified: data.phoneVerified,
    } }));
    dispatch(profileApi.util.updateQueryData('getMyProfile', undefined, () => data));
  } catch {
    // Keep the last confirmed account. The screen presents the request error.
  }
}

export const profileApi = baseApi.enhanceEndpoints({ addTagTypes: ['Profile'] }).injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query({
      async queryFn(_arg, api, _options, baseQuery) {
        const blocked = personalAccountError(api);
        if (blocked) return blocked;
        const result = await baseQuery('/profile');
        return result.error ? result : profileResult(result.data, api);
      },
      providesTags: ['Profile'],
      onQueryStarted: syncProfile,
    }),
    updateMyProfile: builder.mutation({
      async queryFn(changes, api, _options, baseQuery) {
        const blocked = personalAccountError(api);
        if (blocked) return blocked;
        const unsupported = Object.keys(changes).filter((key) => key !== 'name');
        if (unsupported.length) return unavailable('The API does not support saving job title, bio, language or time zone from this form.');
        const names = text(changes.name)?.split(/\s+/);
        if (!names || names.length < 2) return unavailable('Enter your first and last name.');
        const next = { firstName: names[0], middleName: names.slice(1, -1).join(' '), lastName: names.at(-1) };
        if (Object.values(next).some((part) => part.length > 60)) return unavailable('Each name must be 60 characters or fewer.');
        const current = profileApi.endpoints.getMyProfile.select()(api.getState()).data;
        if (!current) return unavailable('Load your profile before saving changes.');
        const body = Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== (current.nameParts[key] ?? '')));
        if (!Object.keys(body).length) return unavailable('There are no profile changes to save.');
        const result = await baseQuery({ url: '/profile', method: 'PATCH', body });
        return result.error ? result : profileResult(result.data, api);
      },
      onQueryStarted: syncProfile,
      invalidatesTags: (_data, error) => error ? [] : ['Profile'],
    }),
    uploadMyProfilePhoto: builder.mutation({
      async queryFn(file, api, _options, baseQuery) {
        const blocked = personalAccountError(api);
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
      invalidatesTags: (_data, error) => error ? [] : ['Profile'],
    }),
    removeMyProfilePhoto: builder.mutation({
      queryFn: () => unavailable('The API does not document profile photo removal.'),
    }),
    requestProfileContactChange: builder.mutation({
      async queryFn({ channel, value }, api, _options, baseQuery) {
        const blocked = personalAccountError(api);
        if (blocked) return blocked;
        if (!['email', 'phone'].includes(channel)) return unavailable('Choose email or phone.');
        return baseQuery({
          url: `/profile/request-${channel}-change`, method: 'POST',
          body: channel === 'email' ? { newEmail: value.trim() } : { newPhone: value.replace(/\s/g, '') },
        });
      },
    }),
    verifyProfileContactChange: builder.mutation({
      async queryFn({ channel, value, code }, api, _options, baseQuery) {
        const blocked = personalAccountError(api);
        if (blocked) return blocked;
        if (!['email', 'phone'].includes(channel)) return unavailable('Choose email or phone.');
        if (!/^\d{6}$/.test(code)) return unavailable('Enter the 6-digit verification code.');
        return baseQuery({
          url: `/profile/verify-${channel}-change`, method: 'POST',
          body: { ...(channel === 'email' ? { newEmail: value.trim() } : { newPhone: value.replace(/\s/g, '') }), code },
        });
      },
      invalidatesTags: (_data, error) => error ? [] : ['Profile'],
    }),
  }),
});

export const {
  useGetMyProfileQuery, useUpdateMyProfileMutation, useUploadMyProfilePhotoMutation,
  useRemoveMyProfilePhotoMutation, useRequestProfileContactChangeMutation, useVerifyProfileContactChangeMutation,
} = profileApi;
