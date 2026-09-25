'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Icon, Logo } from '../ds.js';

export function SignedOut() {
  const router = useRouter();
  const [serverUnconfirmed, setServerUnconfirmed] = React.useState(false);

  React.useEffect(() => {
    setServerUnconfirmed(new URLSearchParams(window.location.search).get('server') === 'unconfirmed');
  }, []);

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24,
                   background: 'linear-gradient(145deg, var(--tk-surface-page), var(--tk-blue-soft))' }}>
      <Card style={{ width: 'min(100%, 420px)', display: 'grid', justifyItems: 'center', gap: 18, padding: 32, textAlign: 'center' }}>
        <Logo />
        <span style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 999,
                       color: 'var(--tk-success)', background: 'var(--tk-success-soft)' }}>
          <Icon name="circle-check" size={26} />
        </span>
        <div style={{ display: 'grid', gap: 7 }}>
          <h1 className="tk-title" style={{ margin: 0 }}>You’re logged out</h1>
          <p className="tk-body" style={{ margin: 0, color: 'var(--tk-ink-400)' }}>Your session has ended on this device.</p>
        </div>
        {serverUnconfirmed && (
          <p role="alert" className="tk-meta" style={{ margin: 0, color: 'var(--tk-danger)' }}>
            We couldn’t confirm logout with the server. Your local session was cleared.
          </p>
        )}
        <Button fullWidth onClick={() => router.replace('/login')}>Sign back in</Button>
      </Card>
    </main>
  );
}
