/**
 * MapAdapter - Abstract interface for map providers.
 *
 * All map provider implementations (AMap, Mapbox, Google Maps, etc.)
 * must implement this interface. WorldMap.jsx and other components
 * should only interact with this interface, never with provider-specific code.
 */
export class MapAdapter {
  /**
   * Load the map SDK. Returns a promise that resolves when ready.
   * @returns {Promise<void>}
   */
  async loadSdk() {
    throw new Error('Not implemented')
  }

  /**
   * Create a map instance in the given container.
   * @param {HTMLElement} container
   * @param {object} options - { center: [lon, lat], zoom, pitch, mapStyle }
   * @returns {object} - The map instance (provider-specific, opaque)
   */
  createMap(container, options) {
    throw new Error('Not implemented')
  }

  /**
   * Set the map center.
   * @param {number} lon
   * @param {number} lat
   */
  setCenter(lon, lat) {
    throw new Error('Not implemented')
  }

  /**
   * Set the map zoom level.
   * @param {number} zoom
   */
  setZoom(zoom) {
    throw new Error('Not implemented')
  }

  /**
   * Set all markers of a given type. Replaces existing markers of that type.
   * @param {Array<object>} markers - Array of marker descriptors
   * @param {'poi'|'landmark'|'tavern'} type
   * @param {object} opts - { activePoiId, familiarityMap, onMarkerClick, activeTavernId, onTavernClick }
   */
  setMarkers(markers, type, opts) {
    throw new Error('Not implemented')
  }

  /**
   * Fit the map view to show all given positions.
   * @param {Array<[number,number]>} positions - Array of [lon, lat]
   * @param {number} [padding=80]
   * @param {number} [zoom]
   */
  fitBounds(positions, padding, zoom) {
    throw new Error('Not implemented')
  }

  /**
   * Collect visible tile images from the map container.
   * Used for snapshot capture.
   * @param {HTMLElement} container
   * @returns {Array<object>} - Array of { src, left, top, width, height }
   */
  collectTiles(container) {
    throw new Error('Not implemented')
  }

  /**
   * Get current map state for snapshot payload.
   * @returns {{ center: {lng, lat}, zoom: number, size: {width, height} }}
   */
  getMapState() {
    throw new Error('Not implemented')
  }

  /**
   * Check if the SDK is loaded and map is ready.
   * @returns {boolean}
   */
  isReady() {
    throw new Error('Not implemented')
  }

  /**
   * Get a human-readable name for this provider.
   * @returns {string}
   */
  getProviderName() {
    throw new Error('Not implemented')
  }

  /**
   * Clean up all map resources.
   */
  destroy() {
    throw new Error('Not implemented')
  }
}
