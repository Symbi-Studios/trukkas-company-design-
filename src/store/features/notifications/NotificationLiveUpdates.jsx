'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { io } from 'socket.io-client';
import { notificationsApi } from './notificationsApi.js';

const sessionKey = (auth) => JSON.stringify([auth.account?.id, auth.account?.actualUserId, auth.activeCompanyId, auth.accessToken]);

/** One authenticated connection for the existing bell and notification feeds. */
export function NotificationLiveUpdates() {
  const dispatch = useDispatch();
  const store = useStore();
  const token = useSelector((state) => state.auth.accessToken);
  const companyId = useSelector((state) => state.auth.account?.id);
  const personId = useSelector((state) => state.auth.account?.actualUserId ?? state.auth.account?.id);
  const activeCompanyId = useSelector((state) => state.auth.activeCompanyId);

  useEffect(() => {
    if (!token || !companyId || !personId) return undefined;
    let origin;
    try {
      const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://trukkas-backend.onrender.com/api/v1');
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
      origin = url.origin;
    } catch { return undefined; }
    const session = sessionKey(store.getState().auth);
    let stopped = false;
    let accepted = false;
    let timer;
    const current = () => !stopped && sessionKey(store.getState().auth) === session;
    const refresh = () => {
      if (!current() || timer !== undefined) return;
      // Coalesce bursts and use REST as the authority, including read actions
      // that may finish while an event is arriving. Never invent unread totals.
      timer = setTimeout(() => {
        timer = undefined;
        if (current()) dispatch(notificationsApi.util.invalidateTags(['Notifications']));
      }, 200);
    };
    const socket = io(origin, { auth: { token }, transports: ['websocket'], autoConnect: false, forceNew: true });
    socket.on('connected', (message) => {
      if (!current() || message?.userId !== personId) return;
      accepted = true;
      refresh(); // Recover arrivals missed during a disconnect or token refresh.
    });
    socket.on('notification.new', (message) => {
      if (!accepted || !current() || typeof message?.notification?.id !== 'string'
        || !message.notification.id.trim() || !Number.isSafeInteger(message.unreadCount) || message.unreadCount < 0) return;
      refresh();
    });
    socket.on('disconnect', () => { accepted = false; });
    socket.connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, companyId, personId, activeCompanyId, dispatch, store]);

  return null;
}
