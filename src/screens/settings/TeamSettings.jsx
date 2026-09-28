import { useEffect, useState } from 'react';
import {
  Avatar, Badge, Banner, Button, Checkbox, DataTable, DropdownMenu, Icon, IconButton, Modal, SectionCard, Select, Tag, TextField, Textarea,
} from '../../ds.js';
import { useCollection } from '../../mock/useCollection.js';
import { deleteRole, inviteTeamMember, removeTeamMember, saveRole, updateTeamMember } from '../../mock/api.js';
import { PERMISSION_GROUPS, grantsFinance, roleById } from '../../domain/access.js';
import { PinPrompt } from '../../components/SecurityInputs.jsx';
import styles from './Settings.module.css';

const STATUS_TONE = { Active: 'success', Invited: 'info', Suspended: 'warning' };

function InviteModal({ open, onClose, roles, onDone }) {
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', roleId: 'dispatcher' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  useEffect(() => { if (open) { setDraft({ name: '', email: '', phone: '', roleId: 'dispatcher' }); setError(''); } }, [open]);
  const role = roleById(roles, draft.roleId);
  const needsPin = grantsFinance(role?.permissions);

  async function invite(pin) {
    const member = await inviteTeamMember(draft, pin);
    setPinOpen(false);
    onDone(member);
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!draft.name.trim() || !/^\S+@\S+\.\S+$/.test(draft.email)) { setError('Enter a name and a valid email.'); return; }
    if (needsPin) { setPinOpen(true); return; }
    setBusy(true);
    try { await invite(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} width={520} title="Invite Team Member" description="They’ll get an email to set a password and join your company."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="invite-form" type="submit" icon="send" disabled={busy}>{busy ? 'Sending…' : 'Send Invite'}</Button></>}>
      <form id="invite-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Full Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextField label="Work Email" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <TextField label="Phone (optional)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+234 800 000 0000" />
        <Select label="Role" value={draft.roleId} options={roles.filter((r) => r.id !== 'owner').map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => setDraft({ ...draft, roleId: e.target.value })} />
        {role && <span className="tk-meta">{role.description} · {role.permissions.length} permissions</span>}
        {needsPin && <Banner tone="info" title="PIN required">This role can move money, so granting it needs your transaction PIN.</Banner>}
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <PinPrompt open={pinOpen} onClose={() => setPinOpen(false)} confirmLabel="Send Invite" description={`Grant ${role?.name} access (includes finance permissions).`} onConfirm={invite} />
    </Modal>
  );
}

export function TeamSettings({ onToast }) {
  const members = useCollection('teamMembers') || [];
  const roles = useCollection('roles') || [];
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  async function changeRole(member, roleId) {
    setError('');
    const role = roleById(roles, roleId);
    if (grantsFinance(role?.permissions)) { setPending({ member, roleId }); return; }
    try { await updateTeamMember(member.id, { roleId }); onToast(`${member.name} is now ${role.name}.`); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <SectionCard
        title="Team Members" description="People who can sign in to your company workspace."
        action={<Button icon="user-plus" onClick={() => setInviteOpen(true)}>Invite Member</Button>}
        pad="none"
      >
        {error && <div style={{ padding: '0 var(--tk-card-pad) 12px' }}><Banner tone="danger" title="Couldn’t update member">{error}</Banner></div>}
        <DataTable
          rows={members}
          rowKey={(m) => m.id}
          columns={[
            {
              key: 'member', header: 'Member', render: (m) => (
                <span className={styles.member}><Avatar name={m.name} size={32} /><span><strong>{m.name}</strong><small>{m.email}</small></span></span>
              ),
            },
            {
              key: 'role', header: 'Role', width: 190, render: (m) => (m.roleId === 'owner'
                ? <Badge tone="purple">Owner</Badge>
                : <Select value={m.roleId} options={roles.filter((r) => r.id !== 'owner').map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => changeRole(m, e.target.value)} style={{ minWidth: 160 }} />),
            },
            { key: 'status', header: 'Status', render: (m) => <Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge> },
            { key: '2fa', header: '2FA', render: (m) => (m.twoFactor ? <Tag tone="success" icon={<Icon name="shield-check" size={11} />}>On</Tag> : <Tag>Off</Tag>) },
            { key: 'active', header: 'Last Active', render: (m) => <span className="tk-meta">{m.lastActive}</span> },
            {
              key: 'actions', header: '', width: 56, render: (m) => (m.roleId === 'owner' ? null : (
                <span style={{ position: 'relative' }}>
                  <IconButton icon="ellipsis" tone="outline" size={30} label={`Actions for ${m.name}`} onClick={() => setMenu(menu === m.id ? null : m.id)} />
                  {menu === m.id && (
                    <span style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20 }}>
                      <DropdownMenu width={200} items={[
                        ...(m.status === 'Invited' ? [{ label: 'Resend Invite', icon: 'send', onClick: () => { setMenu(null); onToast(`Invite re-sent to ${m.email}.`); } }] : []),
                        m.status === 'Suspended'
                          ? { label: 'Reactivate', icon: 'user-check', onClick: async () => { setMenu(null); await updateTeamMember(m.id, { status: 'Active' }); onToast(`${m.name} reactivated.`); } }
                          : { label: 'Suspend Access', icon: 'user-x', onClick: async () => { setMenu(null); await updateTeamMember(m.id, { status: 'Suspended' }); onToast(`${m.name} suspended.`); } },
                        { divider: true },
                        { label: 'Remove from Team', icon: 'trash-2', tone: 'danger', onClick: async () => { setMenu(null); await removeTeamMember(m.id); onToast(`${m.name} removed.`); } },
                      ]} />
                    </span>
                  )}
                </span>
              )),
            },
          ]}
        />
      </SectionCard>
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles} onDone={(m) => { setInviteOpen(false); onToast(`Invite sent to ${m.email}.`); }} />
      <PinPrompt
        open={!!pending} onClose={() => setPending(null)} confirmLabel="Change Role"
        description={pending ? `Give ${pending.member.name} the ${roleById(roles, pending.roleId)?.name} role, which includes finance permissions.` : ''}
        onConfirm={async (pin) => { await updateTeamMember(pending.member.id, { roleId: pending.roleId }, pin); onToast(`${pending.member.name} is now ${roleById(roles, pending.roleId)?.name}.`); setPending(null); }}
      />
    </>
  );
}

export function RolesSettings({ onToast }) {
  const roles = useCollection('roles') || [];
  const members = useCollection('teamMembers') || [];
  const [selectedId, setSelectedId] = useState('fleet-manager');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const selected = roleById(roles, selectedId) || roles[0];

  useEffect(() => { if (selected) setDraft({ ...selected, permissions: [...selected.permissions] }); setError(''); }, [selected?.id, selected]);
  if (!draft) return null;

  const dirty = JSON.stringify([...draft.permissions].sort()) !== JSON.stringify([...(selected?.permissions || [])].sort()) || draft.name !== selected?.name || draft.description !== selected?.description;
  const toggle = (key) => setDraft((d) => ({ ...d, permissions: d.permissions.includes(key) ? d.permissions.filter((p) => p !== key) : [...d.permissions, key] }));

  async function save() {
    setError('');
    try { const role = await saveRole(draft); setSelectedId(role.id); onToast(`${role.name} role saved.`); } catch (err) { setError(err.message); }
  }
  async function create() {
    const role = await saveRole({ name: 'New Role', description: 'Custom role', permissions: ['jobs.view'] });
    setSelectedId(role.id);
  }

  return (
    <SectionCard title="Roles & Permissions" description="Control what each role can see and do. Permissions marked with a lock also need the transaction PIN."
      action={<Button variant="secondary" icon="plus" onClick={create}>New Role</Button>}>
      <div className={styles.rolesGrid}>
        <div className={styles.roleList}>
          {roles.map((r) => (
            <button key={r.id} type="button" className={r.id === selected?.id ? styles.active : ''} onClick={() => setSelectedId(r.id)}>
              <strong>{r.name}{r.locked && <Icon name="lock" size={12} color="var(--tk-ink-400)" />}{!r.system && <Tag tone="blue">Custom</Tag>}</strong>
              <small>{members.filter((m) => m.roleId === r.id).length} member(s) · {r.permissions.length} permissions</small>
            </button>
          ))}
        </div>
        <div>
          <div className={styles.form} style={{ maxWidth: 'none' }}>
            <TextField label="Role Name" value={draft.name} disabled={draft.locked} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Textarea label="Description" rows={1} value={draft.description} disabled={draft.locked} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.group} className={styles.permGroup}>
              <h4><Icon name={group.icon} size={15} color="var(--tk-blue)" />{group.group}</h4>
              <div className={styles.permList}>
                {group.permissions.map((p) => (
                  <Checkbox key={p.key} disabled={draft.locked} checked={draft.permissions.includes(p.key)} onChange={() => toggle(p.key)}
                    label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{p.label}{p.pin && <Icon name="lock-keyhole" size={12} color="var(--tk-warning)" />}</span>} />
                ))}
              </div>
            </div>
          ))}
          {error && <p className={styles.error}>{error}</p>}
          {!draft.locked && (
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Button icon="check" disabled={!dirty} onClick={save}>Save Role</Button>
              {dirty && <Button variant="outline" onClick={() => setDraft({ ...selected, permissions: [...selected.permissions] })}>Discard</Button>}
              {!draft.system && (
                <Button variant="danger" icon="trash-2" style={{ marginLeft: 'auto' }}
                  onClick={async () => { try { await deleteRole(draft.id); setSelectedId('viewer'); onToast('Role deleted.'); } catch (err) { setError(err.message); } }}>
                  Delete Role
                </Button>
              )}
            </div>
          )}
          <p className={styles.hint} style={{ marginTop: 12 }}>These settings control what the app shows each person. Trukkas also enforces them on the server.</p>
        </div>
      </div>
    </SectionCard>
  );
}
