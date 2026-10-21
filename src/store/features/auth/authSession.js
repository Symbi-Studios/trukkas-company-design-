import { companyFormView, registrationTermsConsent } from './onboardingContracts.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

// The company-facing API identifies a company by its trucker user ID.
export function companySession(session, profile, access) {
  const user = session.user;
  if (!profile || profile.id !== user.id || profile.role !== 'TRUCKER' || profile.truckerType !== 'COMPANY') {
    throw new Error('This account does not have a confirmed trucking-company profile. Use your company account or contact support.');
  }
  if (!access || access.companyId !== profile.id || typeof access.isOwner !== 'boolean' || !text(access.userId)) {
    throw new Error('The API could not confirm your access to this company. Please sign in again.');
  }
  if (typeof profile.onboarding?.complete !== 'boolean'
    || (profile.onboarding.complete === false && !text(profile.onboarding.nextStep))) {
    throw new Error('The API did not return your company registration status. Please try signing in again.');
  }
  const fullName = [profile.firstName, profile.middleName, profile.lastName].map(text).filter(Boolean).join(' ');
  const account = {
    id: profile.id,
    name: fullName || text(profile.contactName) || '—',
    email: text(profile.email) || '—',
    phone: text(profile.phone) || '—',
    role: text(access.role?.name) ?? (access.isOwner ? 'Owner' : '—'),
    roleId: access.isOwner ? 'owner' : text(access.role?.id),
    apiRole: profile.role,
    truckerType: profile.truckerType,
    actualUserId: access.isOwner ? null : access.userId,
    isOwner: access.isOwner,
    permissions: Array.isArray(access.permissions) ? access.permissions.filter((value) => typeof value === 'string') : null,
    companyIds: [profile.id],
    companyName: text(profile.businessName) || '—',
    title: text(profile.title) ?? '—',
    emailVerified: typeof profile.emailVerified === 'boolean' ? profile.emailVerified : null,
    phoneVerified: typeof profile.phoneVerified === 'boolean' ? profile.phoneVerified : null,
    kycStatus: text(profile.kycStatus),
    kycRejectionReason: text(profile.kyc?.rejectionReason),
    registrationTermsConsent: registrationTermsConsent(profile),
    onboardingComplete: typeof profile.onboarding?.complete === 'boolean' ? profile.onboarding.complete : null,
    onboardingStep: text(profile.onboarding?.nextStep),
    photoUrl: text(profile.avatarUrl),
    dateOfBirth: text(profile.dateOfBirth)?.slice(0, 10) || null,
    businessAddress: text(profile.businessAddress),
    cacNumber: text(profile.cacNumber),
    businessType: text(profile.businessType),
    contactName: text(profile.contactName),
    onboardingCompany: companyFormView(profile),
  };
  return { account, activeCompanyId: profile.id, accessToken: session.accessToken, refreshToken: session.refreshToken };
}
