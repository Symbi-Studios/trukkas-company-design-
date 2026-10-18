'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../assets/icons/Icon.jsx';
import styles from './Select.module.css';

/** Custom listbox backed by a native select for form values and validation. */
export function Select({ label, options = [], value, onChange, placeholder = 'Select…',
                         leadingDot, disabled, style, ...rest }) {
  const generatedId = React.useId();
  const id = rest.id || generatedId;
  const trigger = React.useRef(null);
  const native = React.useRef(null);
  const menu = React.useRef(null);
  const search = React.useRef({ text: '', time: 0 });
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [invalid, setInvalid] = React.useState(false);
  const [position, setPosition] = React.useState({});
  const items = options.map((option) => typeof option === 'string' ? { value: option, label: option } : option);
  const selected = items.findIndex((item) => String(item.value) === String(value ?? ''));
  const enabled = items.map((item, index) => !item.disabled ? index : -1).filter((index) => index >= 0);

  function show(index = selected >= 0 && !items[selected].disabled ? selected : enabled[0]) {
    if (disabled) return;
    const rect = trigger.current.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.bottom + 6, width: rect.width });
    setActive(index ?? -1);
    search.current = { text: '', time: 0 };
    setOpen(true);
  }

  function choose(index) {
    const item = items[index];
    if (!item || item.disabled || disabled) return;
    // Preserve the real select event expected by existing consumers.
    if (String(value ?? '') !== String(item.value)) {
      native.current.value = String(item.value);
      native.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setInvalid(false);
    setOpen(false);
    trigger.current.focus();
  }

  React.useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  React.useEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const height = Math.min(menu.current?.scrollHeight || 280, 280);
      const flip = below < height && above > below;
      const maxHeight = Math.max(0, Math.min(280, flip ? above : below));
      const width = Math.min(rect.width, window.innerWidth - 16);
      setPosition({ width, maxHeight,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: flip ? rect.top - Math.min(height, maxHeight) - 6 : rect.bottom + 6 });
    }
    function outside(event) {
      if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false);
    }
    function scroll(event) { if (!menu.current?.contains(event.target)) place(); }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(trigger.current);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open, options.length]);

  React.useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  function onKeyDown(event) {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      const index = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)
        : !open ? (enabled.includes(selected) ? selected : direction === 1 ? enabled[0] : enabled.at(-1))
          : enabled[(enabled.indexOf(active) + direction + enabled.length) % enabled.length];
      if (!open) show(index);
      else setActive(index ?? -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active);
      else show();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'Tab') setOpen(false);
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = now - search.current.time > 700 ? event.key : search.current.text + event.key;
      search.current = { text, time: now };
      const query = /^([\s\S])\1*$/.test(text) ? text[0] : text;
      const start = open ? active : selected;
      const match = [...enabled.filter((index) => index > start), ...enabled.filter((index) => index <= start)]
        .find((index) => String(items[index].label).toLowerCase().startsWith(query.toLowerCase()));
      if (match !== undefined) {
        if (open) setActive(match);
        else { show(match); search.current = { text, time: now }; }
      }
    }
  }

  return (
    <div className={`tk-field tk-select-field ${styles.field}`} style={style}>
      {label && <label id={`${id}-label`} htmlFor={id} className={styles.label}>{label}</label>}
      <select {...rest} id={`${id}-native`} ref={native} className={styles.native}
        value={value ?? ''} disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={onChange}
        onInvalid={(event) => {
          event.preventDefault();
          rest.onInvalid?.(event);
          setInvalid(true);
          trigger.current.focus();
          show();
        }}>
        {!value && !items.some((item) => String(item.value) === '') && <option value="">{placeholder}</option>}
        {items.map((item) => <option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>)}
      </select>
      <button ref={trigger} id={id} type="button" role="combobox" className={styles.trigger}
        disabled={disabled} data-open={open} data-invalid={invalid} aria-expanded={open} aria-haspopup="listbox"
        aria-controls={open ? `${id}-listbox` : undefined} aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-labelledby={label ? `${id}-label` : rest['aria-labelledby']}
        aria-label={rest['aria-label'] || (!label ? placeholder : undefined)}
        aria-describedby={rest['aria-describedby']} aria-required={rest.required || undefined} aria-invalid={invalid || rest['aria-invalid']}
        onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown} onBlur={() => setOpen(false)}>
        {leadingDot && <span className={styles.dot} style={{ background: leadingDot }} />}
        <span className={styles.value} data-placeholder={selected < 0}>{selected >= 0 ? items[selected].label : placeholder}</span>
        <Icon name="chevron-down" size={16} className={styles.chevron} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={menu} id={`${id}-listbox`} role="listbox" className={styles.menu} style={position}
          aria-labelledby={label ? `${id}-label` : undefined} aria-label={!label ? rest['aria-label'] || placeholder : undefined}
          onMouseDown={(event) => event.preventDefault()}>
          {items.length ? items.map((item, index) => (
            <div key={item.value} id={`${id}-option-${index}`} role="option" className={styles.option}
              aria-selected={index === selected} aria-disabled={item.disabled || undefined} data-active={index === active}
              onMouseMove={() => !item.disabled && setActive(index)} onClick={() => choose(index)}>
              <span>{item.label}</span>{index === selected && <Icon name="check" size={16} className={styles.check} aria-hidden="true" />}
            </div>
          )) : <div className={styles.empty}>No options available</div>}
        </div>, document.body,
      )}
    </div>
  );
}
