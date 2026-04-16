/**
 * MapAdapter factory.
 *
 * Creates the appropriate MapAdapter instance based on configuration.
 * Currently supports AMap. Designed to be extended for other providers
 * (Mapbox, Google Maps, Leaflet, etc.) by adding new adapter classes
 * and selecting based on environment variables or config.
 */

import { AMapAdapter } from './AMapAdapter'

/**
 * Create a map adapter instance.
 * The adapter type is determined by environment variables.
 *
 * Currently supported:
 * - AMap (高德地图) via VITE_MAP_PROVIDER=amap or default
 *
 * @returns {MapAdapter}
 */
export function createMapAdapter() {
  // Currently only AMap is supported.
  // Future: read from VITE_MAP_PROVIDER and instantiate the appropriate adapter.
  return new AMapAdapter()
}
