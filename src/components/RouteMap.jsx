import { Icon, MapPanel } from '../ds.js';
import { osmDirectionsUrl, osmEmbedUrl, positionAlong } from '../domain/geo.js';
import { estimateDuration, shortPlace } from '../domain/trips.js';
import styles from './RouteMap.module.css';

const chip = {
  position: 'absolute', display: 'grid', gap: 2, padding: '7px 10px', borderRadius: 'var(--tk-r-sm)',
  background: 'rgba(255,255,255,.96)', boxShadow: 'var(--tk-shadow-card)', pointerEvents: 'none',
  font: '600 12px/16px var(--tk-font-sans)', color: 'var(--tk-ink-900)',
};

/**
 * Pickup → delivery route in the DS MapPanel, on real OpenStreetMap tiles.
 * `progress` places the marker along the route for live trips; omit it to pin
 * the destination. Coordinates come from domain/geo.js until the API sends them.
 */
export function RouteMap({
  title = 'Live Location', description, origin, destination, distanceKm, progress, lastUpdated,
  truckLabel, height = 240, style,
}) {
  const marker = progress != null ? positionAlong(origin, destination, progress) : null;
  const src = osmEmbedUrl(origin, destination, marker);
  return (
    <MapPanel
      title={title}
      description={description || (lastUpdated ? `Last updated: ${lastUpdated}` : undefined)}
      height={height}
      onExpand={() => window.open(osmDirectionsUrl(origin, destination), '_blank', 'noopener,noreferrer')}
      style={style}
    >
      <span className={styles.hook} aria-hidden="true" />
      {src ? (
        <iframe
          title={`Map of ${origin} to ${destination}`}
          src={src}
          loading="lazy"
          style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
        />
      ) : (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--tk-ink-400)' }}>
          <Icon name="map" size={28} />
        </div>
      )}
      <span style={{ ...chip, left: 10, top: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="map-pin" size={13} color="var(--tk-success)" />{shortPlace(origin)}
        <Icon name="arrow-right" size={12} color="var(--tk-ink-400)" />
        <Icon name="map-pin" size={13} color="var(--tk-danger)" />{shortPlace(destination)}
      </span>
      {distanceKm != null && (
        <span style={{ ...chip, right: 10, bottom: 26, textAlign: 'center' }}>
          ~ {distanceKm.toLocaleString()} km
          <span style={{ font: '400 11px/14px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{estimateDuration(distanceKm)}</span>
        </span>
      )}
      {truckLabel && (
        <span style={{ ...chip, left: 10, top: 44, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="truck" size={14} color="var(--tk-orange-ink)" />{truckLabel}
        </span>
      )}
    </MapPanel>
  );
}
