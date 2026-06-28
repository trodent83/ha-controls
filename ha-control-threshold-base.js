import { HAControlBase, html, css } from "./ha-control-base.js?v=0.6.8";

export { html, css };

/**
 * HAControlThresholdBase
 * Base class that adds utility methods for threshold checking and icon fallback resolution.
 * Inherits from HAControlBase.
 */
export class HAControlThresholdBase extends HAControlBase {
  /**
   * Helper utility checking numeric or string status thresholds.
   * Inspects configured threshold arrays and returns styling values (color/animation/icon)
   * matching the active state/attribute value.
   * 
   * @param {string|number} stateValue - State or attribute value to match
   * @param {Array<Object>} thresholds - Configured array of thresholds
   * @param {string} propertyName - Property to look up ('color', 'animation', 'icon', etc.)
   * @protected
   * @returns {string|null} The matched configuration value, or null if no threshold applies
   */
  _getMatchedProperty(stateValue, thresholds, propertyName) {
    if (!thresholds || !Array.isArray(thresholds) || stateValue === undefined || stateValue === null) return null;
    const stringState = String(stateValue).toLowerCase();

    // Exact string match
    const exactMatch = thresholds.find(t => String(t.value).toLowerCase() === stringState);
    if (exactMatch) {
      return exactMatch[propertyName] !== undefined ? exactMatch[propertyName] : null;
    }

    // Numeric comparison match (parseFloat)
    const numericValue = parseFloat(stateValue);
    if (!isNaN(numericValue)) {
      const numericThresholds = thresholds
        .filter(t => t.value !== undefined && t.value !== null && !isNaN(parseFloat(t.value)))
        .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

      const match = numericThresholds.find(t => numericValue >= parseFloat(t.value));
      if (match) {
        return match[propertyName] !== undefined ? match[propertyName] : null;
      }
    }
    return null;
  }

  /**
   * Fallback icon resolver mapping domains and device classes to material design icons.
   * 
   * @param {string} domain - The entity domain (e.g. 'light', 'sensor')
   * @param {string} deviceClass - Optional device_class attribute of the entity
   * @protected
   * @returns {string} Material Design Icon string
   */
  _getFallbackIcon(domain, deviceClass) {
    const defaults = {
      battery: 'mdi:battery', temperature: 'mdi:thermometer', humidity: 'mdi:water-percent',
      light: 'mdi:lightbulb', switch: 'mdi:flash', binary_sensor: 'mdi:checkbox-marked-circle-outline'
    };
    return defaults[deviceClass] || defaults[domain] || 'mdi:circle-outline';
  }
}
