const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

// The company-facing API identifies a company by its trucker user ID.
export function companySession(session, profile) {
  const user = session.user;
  if (!profile || profile.id !== user.id || profile.role !== 'TRUCKER' || profile.truckerType !== 'COMPANY') {
    throw new Error('This account does not have a confirmed trucking-company profile. Use your company account or contact support.');
  }
  const fullName = [profile.firstName, profile.middleName, profile.lastName].map(text).filter(Boolean).join(' ');
  const account = {
    id: profile.id,
    name: fullName || text(profile.contactName) || '—',
    email: text(profile.email) || '—',
    phone: text(profile.phone) || '—',
    role: text(user.teamRole) || 'Owner',
    roleId: text(user.teamRole) || 'owner',
    apiRole: profile.role,
    truckerType: profile.truckerType,
    actualUserId: text(user.actualUserId),
    permissions: Array.isArray(user.permissions) ? user.permissions.filter((value) => typeof value === 'string') : null,
    companyIds: [profile.id],
    companyName: text(profile.businessName) || '—',
    title: '—',
    emailVerified: typeof profile.emailVerified === 'boolean' ? profile.emailVerified : null,
    phoneVerified: typeof profile.phoneVerified === 'boolean' ? profile.phoneVerified : null,
    onboardingComplete: typeof profile.onboarding?.complete === 'boolean' ? profile.onboarding.complete : null,
    onboardingStep: text(profile.onboarding?.nextStep),
    photoUrl: text(profile.avatarUrl),
    dateOfBirth: text(profile.dateOfBirth)?.slice(0, 10) || null,
    businessAddress: text(profile.businessAddress),
    cacNumber: text(profile.cacNumber),
    businessType: text(profile.businessType),
    contactName: text(profile.contactName),
  };
  return { account, activeCompanyId: profile.id, accessToken: session.accessToken, refreshToken: session.refreshToken };
}
