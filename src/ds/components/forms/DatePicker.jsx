'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../assets/icons/Icon.jsx';
import { clampDate, dateAllowed, dateValue, moveDays, moveMonth, parseDate, todayValue } from './datePickerDates.js';
import styles from './DatePicker.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const useBrowserLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
const readableDate = (date, long = false) => new Intl.DateTimeFormat('en-NG', {
  day: 'numeric', month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC',
}).format(date);

/** Shared date-only field. The hidden native input preserves form contracts. */
export function DatePicker({ label, required, hint, error, icon, suffix, disabled, readOnly, style,
  value, defaultValue, onChange, min, max, step, autoFocus, placeholder = 'Select date', id: suppliedId,
  mode = 'date', variant = 'field', allowedMonths, ...rest }) {
  const generatedId = React.useId();
  const id = suppliedId || generatedId;
  const native = React.useRef(null);
  const trigger = React.useRef(null);
  const popup = React.useRef(null);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '');
  const selected = value !== undefined ? value : uncontrolledValue;
  const monthMode = mode === 'month';
  const selectedDay = monthMode && selected ? `${selected}-01` : selected;
  const minimum = monthMode && min ? `${min}-01` : min;
  const maxMonth = monthMode ? parseDate(`${max}-01`) : null;
  const maximum = monthMode ? maxMonth ? dateValue(moveDays(moveMonth(maxMonth, 1), -1)) : undefined : max;
  const [open, setOpen] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const [active, setActive] = React.useState(null);
  const [view, setView] = React.useState('days');
  const [position, setPosition] = React.useState({ visibility: 'hidden' });
  const activeDate = parseDate(active);
  const year = activeDate?.getUTCFullYear();
  const month = activeDate?.getUTCMonth();
  const selectedDate = parseDate(selectedDay);
  const limits = { min, max, step, base: value !== undefined ? value : defaultValue };
  const allowed = (date) => dateAllowed(date, limits);
  const monthAllowed = (nextYear, nextMonth) => periodAvailable(nextYear, nextMonth)
    && (!allowedMonths || allowedMonths.includes(`${String(nextYear).padStart(4, '0')}-${String(nextMonth + 1).padStart(2, '0')}`));
  const yearStart = year ? Math.floor((year - 1) / 12) * 12 + 1 : 1;
  const describedBy = [rest['aria-describedby'], (error || hint) ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

  function show() {
    if (disabled || readOnly) return;
    const initial = monthMode && !selectedDate && allowedMonths?.length ? `${[...allowedMonths].sort().at(-1)}-01` : selectedDay;
    setActive(clampDate(initial, minimum, maximum));
    setView(monthMode ? 'months' : 'days');
    setPosition({ visibility: 'hidden' });
    setOpen(true);
  }

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  function choose(next) {
    if (disabled || readOnly || (next && (monthMode ? !monthAllowed(parseDate(next).getUTCFullYear(), parseDate(next).getUTCMonth()) : !allowed(next)))) return;
    const nextValue = monthMode ? next.slice(0, 7) : next;
    if (nextValue !== String(selected ?? '')) {
      // Bypass React's value tracker so consumers receive a real input event.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(native.current, nextValue);
      native.current.dispatchEvent(new Event('input', { bubbles: true }));
      native.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setInvalid(false);
    close(true);
  }

  function periodAvailable(nextYear, nextMonth) {
    if (nextYear < 1 || nextYear > 9999) return false;
    const start = `${String(nextYear).padStart(4, '0')}-${String(nextMonth === undefined ? 1 : nextMonth + 1).padStart(2, '0')}-01`;
    const endDate = parseDate(start);
    endDate.setUTCMonth(nextMonth === undefined ? 12 : nextMonth + 1, 0);
    const end = dateValue(endDate);
    return !(parseDate(minimum) && end < minimum) && !(parseDate(maximum) && start > maximum)
      && (!monthMode || !allowedMonths || allowedMonths.some((entry) => `${entry}-01` >= start && `${entry}-01` <= end));
  }

  function changePeriod(nextYear, nextMonth, nextView) {
    const next = `${String(nextYear).padStart(4, '0')}-${String(nextMonth + 1).padStart(2, '0')}-01`;
    setActive(clampDate(next, minimum, maximum));
    setView(nextView);
  }

  function navigate(amount) {
    if (view === 'days') setActive(clampDate(dateValue(moveMonth(activeDate, amount)), min, max));
    else if (view === 'months') {
      const years = [...new Set(allowedMonths?.map((entry) => Number(entry.slice(0, 4))) ?? [])].sort((a, b) => a - b);
      const nextYear = monthMode && allowedMonths ? amount < 0 ? years.filter((entry) => entry < year).at(-1) : years.find((entry) => entry > year) : year + amount;
      if (nextYear) changePeriod(nextYear, month, 'months');
    }
    else changePeriod(Math.min(9999, Math.max(1, year + amount * 12)), month, 'years');
  }

  function canNavigate(amount) {
    if (monthMode && allowedMonths) return allowedMonths.some((entry) => {
      const nextYear = Number(entry.slice(0, 4));
      return amount < 0 ? nextYear < (view === 'years' ? yearStart : year) : nextYear > (view === 'years' ? yearStart + 11 : year);
    });
    if (view === 'days') {
      const next = moveMonth(activeDate, amount);
      return periodAvailable(next.getUTCFullYear(), next.getUTCMonth());
    }
    if (view === 'months') return periodAvailable(year + amount);
    const start = yearStart + amount * 12;
    return Array.from({ length: 12 }, (_, index) => start + index).some((entry) => periodAvailable(entry));
  }

  React.useEffect(() => { if (disabled || readOnly) setOpen(false); }, [disabled, readOnly]);

  React.useEffect(() => {
    const form = native.current?.form;
    function reset() { setUncontrolledValue(defaultValue ?? ''); setInvalid(false); setOpen(false); }
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [defaultValue, rest.form]);

  useBrowserLayoutEffect(() => {
    if (!open) return undefined;
    function place() {
      const rect = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 12;
      const topEdge = (viewport?.offsetTop ?? 0) + 12;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 24;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 24;
      const width = Math.min(320, rightEdge - leftEdge);
      const height = Math.min(popup.current.scrollHeight + 2, bottomEdge - topEdge);
      const below = Math.max(0, bottomEdge - rect.bottom - 6);
      const above = Math.max(0, rect.top - topEdge - 6);
      const flip = height > below && above > below;
      const maxHeight = flip ? above : below;
      setPosition({ visibility: 'visible', width, maxHeight,
        left: Math.max(leftEdge, Math.min(rect.left, rightEdge - width)),
        top: flip ? rect.top - Math.min(height, maxHeight) - 6 : rect.bottom + 6 });
    }
    function outside(event) {
      if (!trigger.current?.contains(event.target) && !popup.current?.contains(event.target)) close();
    }
    function scroll(event) { if (!popup.current?.contains(event.target)) place(); }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(trigger.current);
    observer.observe(popup.current);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', scroll, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [open, view]);

  useBrowserLayoutEffect(() => {
    if (!open || position.visibility !== 'visible') return;
    const target = view === 'days' ? popup.current.querySelector(`[data-date="${active}"]:not(:disabled)`)
      : popup.current.querySelector('[aria-pressed="true"]:not(:disabled)');
    (target ?? popup.current.querySelector('[data-calendar-choice]:not(:disabled)') ?? popup.current.querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
  }, [open, active, view, position.visibility]);

  function dayKey(event) {
    const offset = (activeDate.getUTCDay() + 6) % 7;
    const amounts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -offset, End: 6 - offset };
    let next;
    if (Object.hasOwn(amounts, event.key)) next = moveDays(activeDate, amounts[event.key]);
    else if (event.key === 'PageUp' || event.key === 'PageDown') next = moveMonth(activeDate, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
    if (!next) return;
    event.preventDefault(); event.stopPropagation();
    if (next.getUTCFullYear() < 1 || next.getUTCFullYear() > 9999) return;
    setActive(clampDate(dateValue(next), min, max));
  }

  const days = activeDate ? (() => {
    const first = parseDate(`${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`);
    const start = moveDays(first, -((first.getUTCDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => moveDays(start, index));
  })() : [];

  return (
    <div className={`tk-field ${styles.field}`} style={style}>
      {label && variant !== 'filter' && <label htmlFor={id} id={`${id}-label`} className={styles.label}>{label}{required && <span className={styles.required}> *</span>}</label>}
      <input {...rest} ref={native} id={`${id}-native`} type={monthMode ? 'month' : 'date'} className={styles.native} tabIndex={-1} aria-hidden="true"
        value={value} defaultValue={value === undefined ? defaultValue : undefined} min={min} max={max} step={step}
        disabled={disabled} readOnly={readOnly} required={required}
        onChange={(event) => { setUncontrolledValue(event.target.value); setInvalid(false); onChange?.(event); }}
        onInvalid={(event) => { event.preventDefault(); rest.onInvalid?.(event); setInvalid(true); trigger.current?.focus(); show(); }} />
      <button ref={trigger} id={id} type="button" className={styles.trigger} data-variant={variant} disabled={disabled} autoFocus={autoFocus}
        data-open={open} data-invalid={!!error || invalid} aria-haspopup="dialog" aria-expanded={open}
        aria-controls={open ? `${id}-calendar` : undefined} aria-required={required || undefined} aria-readonly={readOnly || undefined}
        aria-invalid={!!error || invalid || rest['aria-invalid']} aria-labelledby={label ? `${id}-label ${id}-value` : rest['aria-labelledby']}
        aria-label={rest['aria-label'] || (!label ? 'Choose date' : undefined)} aria-describedby={describedBy}
        onFocus={rest.onFocus} onBlur={rest.onBlur} onClick={() => open ? close() : show()}
        onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } }}>
        {icon && <Icon name={icon} size={16} className={styles.icon} aria-hidden="true" />}
        <span className={styles.copy}>
          {label && variant === 'filter' && <span id={`${id}-label`} className={styles.filterLabel}>{label}</span>}
          <span id={`${id}-value`} className={styles.value} data-placeholder={!selectedDate}>{selectedDate ? monthMode ? `${MONTHS[selectedDate.getUTCMonth()].slice(0, 3)} ${selectedDate.getUTCFullYear()}` : readableDate(selectedDate) : placeholder}</span>
        </span>
        {suffix}<Icon name={variant === 'filter' ? 'chevron-down' : 'calendar-days'} size={17} className={styles.icon} aria-hidden="true" />
      </button>
      {(error || hint) && <span id={`${id}-hint`} className={styles.hint} data-error={!!error}>{error || hint}</span>}
      {open && activeDate && createPortal(
        <div ref={popup} id={`${id}-calendar`} role="dialog" aria-label={`${typeof label === 'string' ? label : 'Choose date'} calendar`}
          aria-describedby={`${id}-instructions`} className={styles.popup} style={position}
          onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); } }}>
          <span id={`${id}-instructions`} className={styles.instructions}>{monthMode ? 'Choose a year, then a month. Press Escape to close.' : 'Use arrow keys to navigate days, Page Up and Page Down to change months, Enter to select, and Escape to close.'}</span>
          <div className={styles.header}>
            <button type="button" className={styles.nav} aria-label={view === 'days' ? 'Previous month' : view === 'months' ? 'Previous year' : 'Previous years'} disabled={!canNavigate(-1)} onClick={() => navigate(-1)}><Icon name="chevron-left" size={17} aria-hidden="true" /></button>
            <div className={styles.heading} aria-live="polite">
              {view !== 'years' ? <>{!monthMode && <button type="button" aria-label="Choose month" onClick={() => setView(view === 'months' ? 'days' : 'months')}>{MONTHS[month]}</button>}<button type="button" aria-label="Choose year" onClick={() => setView('years')}>{year}</button></> : <button type="button" onClick={() => setView(monthMode ? 'months' : 'days')}>{yearStart}–{Math.min(9999, yearStart + 11)}</button>}
            </div>
            <button type="button" className={styles.nav} aria-label={view === 'days' ? 'Next month' : view === 'months' ? 'Next year' : 'Next years'} disabled={!canNavigate(1)} onClick={() => navigate(1)}><Icon name="chevron-right" size={17} aria-hidden="true" /></button>
          </div>
          {view === 'days' ? <>
            <div className={styles.week} aria-hidden="true">{WEEK.map((day) => <span key={day}>{day}</span>)}</div>
            <div role="grid" aria-label={`${MONTHS[month]} ${year}`} className={styles.days}>
              {Array.from({ length: 6 }, (_, row) => <div key={row} role="row" style={{ display: 'contents' }}>{days.slice(row * 7, row * 7 + 7).map((day) => {
                const next = dateValue(day);
                return <button key={next} type="button" role="gridcell" className={styles.day} data-date={next}
                  data-outside={day.getUTCMonth() !== month} data-today={next === todayValue()} aria-current={next === todayValue() ? 'date' : undefined}
                  aria-label={readableDate(day, true)} aria-selected={next === selected} aria-disabled={!allowed(next)}
                  tabIndex={next === active ? 0 : -1} onKeyDown={dayKey} onClick={() => choose(next)}>{day.getUTCDate()}</button>;
              })}</div>)}
            </div>
          </> : <div className={styles.periods}>
            {view === 'months' ? MONTHS.map((name, index) => <button key={name} type="button" className={styles.period} data-calendar-choice disabled={!monthAllowed(year, index)} aria-pressed={monthMode ? selected === `${year}-${String(index + 1).padStart(2, '0')}` : index === month} onClick={() => monthMode ? choose(`${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}-01`) : changePeriod(year, index, 'days')}>{name.slice(0, 3)}</button>)
              : Array.from({ length: 12 }, (_, index) => yearStart + index).map((entry) => <button key={entry} type="button" className={styles.period} data-calendar-choice disabled={!periodAvailable(entry)} aria-pressed={entry === year} onClick={() => changePeriod(entry, month, 'months')}>{entry}</button>)}
          </div>}
          <div className={styles.footer}><button type="button" disabled={monthMode ? !monthAllowed(parseDate(todayValue()).getUTCFullYear(), parseDate(todayValue()).getUTCMonth()) : !allowed(todayValue())} onClick={() => choose(todayValue())}>{monthMode ? 'This month' : 'Today'}</button><button type="button" disabled={!selected} onClick={() => choose('')}>Clear</button></div>
        </div>, document.body,
      )}
    </div>
  );
}
