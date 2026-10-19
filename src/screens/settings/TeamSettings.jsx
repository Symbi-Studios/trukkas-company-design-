import { useEffect, useState } from 'react';
import {
  Avatar, Badge, Banner, Button, Checkbox, DataTable, DropdownMenu, Icon, IconButton, Modal, SectionCard, Select, SkeletonRow, Tag, TextField, Textarea,
} from '../../ds.js';
import { useGetSettingsRolesQuery, useGetSettingsTeamQuery, useInviteSettingsMemberMutation, useUpdateSettingsMemberMutation, useRemoveSettingsMemberMutation, useResendSettingsInviteMutation, useSaveSettingsRoleMutation, useDeleteSettingsRoleMutation, settingsPermissionState, toggleSettingsPermission, settingsRoleNeedsApproval } from '../../store/features/settings/settingsTeamApi.js';
import { useGetMyProfileAccessQuery } from '../../store/features/profile/profileApi.js';
import { useGetOnboardingSecurityQuery, useSaveOnboardingPinMutation } from '../../store/features/auth/onboardingApi.js';
import { getApiErrorMessage } from '../../store/api/getApiErrorMessage.js';
import { PERMISSION_GROUPS, grantsFinance, roleById } from '../../domain/access.js';
import { PinPrompt } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

const STATUS_TONE = { Active: 'success', Invited: 'info', Suspended: 'warning' };

function InviteModal({ open, onClose, roles, onDone, security, createPin }) {
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', roleId: '' });
  const [inviteMember] = useInviteSettingsMemberMutation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  useEffect(() => { if (open) { setDraft({ name: '', email: '', phone: '', roleId: '' }); setError(''); } }, [open]);
  const role = roleById(roles, draft.roleId);
  const financeRole = grantsFinance(role?.permissions ?? []);
  const needsPin = security?.pin?.set === true || financeRole;

  async function invite(pin) {
    setBusy(true);
    try {
      const member = await inviteMember({ ...draft, pin }).unwrap();
      setPinOpen(false);
      onDone(member);
    } catch (err) { throw new Error(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!draft.name.trim() || !/^\S+@\S+\.\S+$/.test(draft.email)) { setError('Enter a name and a valid email.'); return; }
    if (!role) { setError('Choose a role from the company role list.'); return; }
    if (typeof security?.pin?.set !== 'boolean') { setError('Load your transaction PIN status before inviting a member.'); return; }
    if (needsPin) { setPinOpen(true); return; }
    try { await invite(); } catch (err) { setError(err.message); }
  }

  return (
    <Modal open={open} onClose={onClose} width={520} title="Invite Team Member" description="They’ll get an email to set a password and join your company."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="invite-form" type="submit" icon="send" disabled={busy}>{busy ? 'Sending…' : 'Send Invite'}</Button></>}>
      <form id="invite-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Full Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextField label="Work Email" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <TextField label="Phone (optional)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+234 800 000 0000" />
        <Select label="Role" value={draft.roleId} options={roles.filter((r) => r.id && r.id !== 'owner').map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => setDraft({ ...draft, roleId: e.target.value })} />
        {role && <span className="tk-meta">{role.description} · {role.permissions?.length ?? '—'} permissions</span>}
        {financeRole && <Banner tone="info" title="PIN required">This role can move money, so granting it needs your transaction PIN.</Banner>}
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <PinPrompt open={pinOpen} onClose={() => setPinOpen(false)} confirmLabel="Send Invite" description={financeRole ? `Grant ${role?.name} access (includes finance permissions).` : role?.name} securityState={security ?? null} createPin={createPin} onConfirm={invite} />
    </Modal>
  );
}

export function TeamSettings({ onToast }) {
  const { data, error: loadError, isLoading } = useGetSettingsTeamQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: roleData } = useGetSettingsRolesQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: access } = useGetMyProfileAccessQuery();
  const { data: security } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const [savePin, { isLoading: savingPin }] = useSaveOnboardingPinMutation();
  const [updateMember, { isLoading: updating }] = useUpdateSettingsMemberMutation();
  const [removeMember, { isLoading: removing }] = useRemoveSettingsMemberMutation();
  const [resendInvite, { isLoading: resending }] = useResendSettingsInviteMutation();
  const members = data?.members ?? [];
  const roles = roleData?.roles ?? [];
  const canManage = access?.isOwner === true;
  const busy = updating || removing || resending || savingPin;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  async function createPin(values) {
    if (!canManage || security?.pin?.set !== false) throw new Error('Load your transaction PIN status before creating a PIN.');
    try { await savePin(values).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  async function updateTeamMember(id, changes, pin) {
    try { return await updateMember({ id, changes, pin }).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  async function run(action, message) {
    if (busy || !canManage) return;
    setMenu(null); setError('');
    try { await action(); onToast(message); } catch (err) { setError(err instanceof Error ? err.message : getApiErrorMessage(err)); }
  }

  async function changeRole(member, roleId) {
    const role = roleById(roles, roleId);
    await changeMember(member, { roleId }, `${member.name} is now ${role?.name ?? '—'}.`, 'Change Role');
  }
  async function changeMember(member, changes, message, confirmLabel) {
    if (busy || !canManage) return;
    setMenu(null); setError('');
    if (member.kind === 'invite') { setError('Pending invitations cannot be suspended. Remove the invitation to cancel it.'); return; }
    if (typeof security?.pin?.set !== 'boolean') { setError('Load your transaction PIN status before changing a member.'); return; }
    if (security.pin.set || grantsFinance(roleById(roles, changes.roleId)?.permissions ?? [])) {
      setPending({ member, changes, message, confirmLabel }); return;
    }
    await run(() => updateTeamMember(member.id, changes), message);
  }

  return (
    <>
      <SectionCard
        title="Team Members" description="People who can sign in to your company workspace."
        action={<Button icon="user-plus" disabled={!canManage || !roleData || busy} onClick={() => setInviteOpen(true)}>Invite Member</Button>}
        pad="none"
      >
        {(error || loadError || data?.warning) && <div style={{ padding: '0 var(--tk-card-pad) 12px' }}><Banner tone="danger" title="Couldn’t update member">{error || (loadError ? getApiErrorMessage(loadError) : data.warning)}</Banner></div>}
        {isLoading ? <SkeletonRow columns={5} /> : !data && !loadError && <span className="tk-meta">—</span>}
        <DataTable
          rows={members}
          rowKey={(m, i) => `${m.kind}:${m.id ?? i}`}
          columns={[
            {
              key: 'member', header: 'Member', render: (m) => (
                <span className={styles.member}><Avatar name={m.name} size={32} /><span><strong>{m.name}</strong><small>{m.email}</small></span></span>
              ),
            },
            {
              key: 'role', header: 'Role', width: 190, render: (m) => (m.roleId === 'owner'
                ? <Badge tone="purple">Owner</Badge>
                : <Select value={m.roleId ?? ''} placeholder={m.roleName} disabled={!canManage || busy || !m.id || m.kind === 'invite'} options={roles.filter((r) => r.id && r.id !== 'owner').map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => changeRole(m, e.target.value)} style={{ minWidth: 160 }} />),
            },
            { key: 'status', header: 'Status', render: (m) => <Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge> },
            { key: '2fa', header: '2FA', render: (m) => (m.twoFactor === null ? <Tag>—</Tag> : m.twoFactor ? <Tag tone="success" icon={<Icon name="shield-check" size={11} />}>On</Tag> : <Tag>Off</Tag>) },
            { key: 'active', header: 'Last Active', render: (m) => <span className="tk-meta">{m.lastActive}</span> },
            {
              key: 'actions', header: '', width: 56, render: (m) => (m.roleId === 'owner' ? null : (
                <span style={{ position: 'relative' }}>
                  <IconButton icon="ellipsis" tone="outline" size={30} disabled={!canManage || busy || !m.id} label={`Actions for ${m.name}`} onClick={() => setMenu(menu === m.id ? null : m.id)} />
                  {menu === m.id && (
                    <span style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20 }}>
                      <DropdownMenu width={200} items={[
                        ...(m.status === 'Invited' ? [{ label: 'Resend Invite', icon: 'send', onClick: () => run(() => resendInvite(m.id).unwrap(), `Invite re-sent to ${m.email}.`) }] : []),
                        m.status === 'Suspended'
                          ? { label: 'Reactivate', icon: 'user-check', onClick: () => changeMember(m, { status: 'Active' }, `${m.name} reactivated.`, 'Reactivate') }
                          : { label: 'Suspend Access', icon: 'user-x', onClick: () => changeMember(m, { status: 'Suspended' }, `${m.name} suspended.`, 'Suspend Access') },
                        { divider: true },
                        { label: 'Remove from Team', icon: 'trash-2', tone: 'danger', onClick: () => run(() => removeMember({ id: m.id, kind: m.kind }).unwrap(), `${m.name === '—' ? m.email : m.name} removed.`) },
                      ]} />
                    </span>
                  )}
                </span>
              )),
            },
          ]}
        />
      </SectionCard>
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles} security={security} createPin={createPin} onDone={(m) => { setInviteOpen(false); onToast(`Invite sent to ${m.email}.`); }} />
      <PinPrompt
        open={!!pending} onClose={() => setPending(null)} confirmLabel={pending?.confirmLabel ?? 'Change Role'}
        description={pending ? pending.changes.roleId && grantsFinance(roleById(roles, pending.changes.roleId)?.permissions ?? []) ? `Give ${pending.member.name} the ${roleById(roles, pending.changes.roleId)?.name} role, which includes finance permissions.` : pending.member.name : ''}
        securityState={security ?? null} createPin={createPin}
        onConfirm={async (pin) => { await updateTeamMember(pending.member.id, pending.changes, pin); onToast(pending.message); setPending(null); }}
      />
    </>
  );
}

export function RolesSettings({ onToast }) {
  const { data, error: loadError, isLoading } = useGetSettingsRolesQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: access } = useGetMyProfileAccessQuery();
  const { data: security } = useGetOnboardingSecurityQuery(undefined, { refetchOnMountOrArgChange: true });
  const [savePin, { isLoading: savingPin }] = useSaveOnboardingPinMutation();
  const [saveRole, { isLoading: saving }] = useSaveSettingsRoleMutation();
  const [deleteRole, { isLoading: deleting }] = useDeleteSettingsRoleMutation();
  const roles = data?.roles ?? [];
  const canManage = access?.isOwner === true;
  const busy = saving || deleting || savingPin;
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [pendingRole, setPendingRole] = useState(null);
  const selected = roleById(roles, selectedId) || roles[0];

  useEffect(() => { if (selected) setDraft({ ...selected, permissions: [...(selected.permissions ?? [])] }); else setDraft(null); setError(''); }, [selected?.id, selected]);
  if (!draft) return <SectionCard title="Roles & Permissions" description="Control what each role can see and do. Permissions marked with a lock also need the transaction PIN." action={<Button variant="secondary" icon="plus" disabled={!canManage || busy || !data?.supportedKeys} onClick={create}>New Role</Button>}>{isLoading ? <SkeletonRow columns={2} /> : <span className="tk-meta">{loadError ? getApiErrorMessage(loadError) : error || '—'}</span>}</SectionCard>;

  const dirty = JSON.stringify([...draft.permissions].sort()) !== JSON.stringify([...(selected?.permissions || [])].sort()) || draft.name !== selected?.name || draft.description !== selected?.description;
  const toggle = (key) => setDraft((d) => ({ ...d, permissions: toggleSettingsPermission(d.permissions, data?.permissionBindings?.[key]) }));

  async function save() {
    setError('');
    if (busy || !canManage) return;
    const approval = settingsRoleNeedsApproval(draft, selected, security?.pin?.set);
    if (approval === null) { setError('Load your transaction PIN status before saving role permissions.'); return; }
    if (approval) { setPendingRole({ ...draft, permissions: [...draft.permissions] }); return; }
    try { await persistRole(draft); } catch (err) { setError(err.message); }
  }
  async function persistRole(values, pin) {
    if (!canManage) throw new Error('Only the company owner can manage roles.');
    try {
      const role = await saveRole({ ...values, pin }).unwrap();
      setSelectedId(role.id); setPendingRole(null); onToast(`${role.name} role saved.`);
    } catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  async function createPin(values) {
    if (!canManage || security?.pin?.set !== false) throw new Error('Load your transaction PIN status before creating a PIN.');
    try { await savePin(values).unwrap(); }
    catch (err) { throw new Error(getApiErrorMessage(err)); }
  }
  async function create() {
    if (busy || !canManage) return;
    try { const role = await saveRole({ name: 'New Role', description: 'Custom role', permissions: [] }).unwrap(); setSelectedId(role.id); }
    catch (err) { setError(getApiErrorMessage(err)); }
  }

  return (
    <SectionCard title="Roles & Permissions" description="Control what each role can see and do. Permissions marked with a lock also need the transaction PIN."
      action={<Button variant="secondary" icon="plus" disabled={!canManage || busy || !data?.supportedKeys} onClick={create}>New Role</Button>}>
      <div className={styles.rolesGrid}>
        <div className={styles.roleList}>
          {roles.map((r, i) => (
            <button key={r.id ?? i} type="button" className={r.id === selected?.id ? styles.active : ''} disabled={!r.id} onClick={() => setSelectedId(r.id)}>
              <strong>{r.name}{r.locked && <Icon name="lock" size={12} color="var(--tk-ink-400)" />}{r.system === false && <Tag tone="blue">Custom</Tag>}</strong>
              <small>{r.memberCount ?? '—'} member(s) · {r.permissions?.length ?? '—'} permissions</small>
            </button>
          ))}
        </div>
        <div>
          <div className={styles.form} style={{ maxWidth: 'none' }}>
            <TextField label="Role Name" value={draft.name} disabled={draft.locked || !canManage || busy} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Textarea label="Description" rows={1} value={draft.description} disabled={draft.locked || !canManage || busy} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.group} className={styles.permGroup}>
              <h4><Icon name={group.icon} size={15} color="var(--tk-blue)" />{group.group}</h4>
              <div className={styles.permList}>
                {group.permissions.map((p) => (
                  <Checkbox key={p.key} disabled={draft.locked || !canManage || busy || !data?.permissionBindings?.[p.key]?.length} indeterminate={settingsPermissionState(draft.permissions, data?.permissionBindings?.[p.key]) === null} checked={settingsPermissionState(draft.permissions, data?.permissionBindings?.[p.key]) === true} onChange={() => toggle(p.key)}
                    label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{p.label}{p.pin && <Icon name="lock-keyhole" size={12} color="var(--tk-warning)" />}</span>} />
                ))}
              </div>
            </div>
          ))}
          {(error || loadError) && <p className={styles.error}>{error || getApiErrorMessage(loadError)}</p>}
          {!draft.locked && (
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button icon="check" disabled={!dirty || !canManage || busy || selected?.permissions === null} onClick={save}>Save Role</Button>
              {dirty && <Button variant="outline" onClick={() => setDraft({ ...selected, permissions: [...(selected.permissions ?? [])] })}>Discard</Button>}
              {!draft.system && (
                <Button variant="danger" icon="trash-2" disabled={!canManage || busy} style={{ marginLeft: 'auto' }}
                  onClick={async () => { try { await deleteRole(draft.id).unwrap(); setSelectedId(''); onToast('Role deleted.'); } catch (err) { setError(getApiErrorMessage(err)); } }}>
                  Delete Role
                </Button>
              )}
            </div>
          )}
          <p className={styles.hint} style={{ marginTop: 12 }}>These settings control what the app shows each person. Trukkas also enforces them on the server.</p>
        </div>
      </div>
      <PinPrompt open={!!pendingRole} onClose={() => setPendingRole(null)} confirmLabel="Save Role" description={pendingRole?.name}
        securityState={security ?? null} createPin={createPin} onConfirm={(pin) => persistRole(pendingRole, pin)} />
    </SectionCard>
  );
}
