import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.2.0';

/**
 * VGN/VAG API endpoint for departures using the VGN outer-network EFA endpoint.
 * Accepts DHID stop IDs (de:XXXXXX:XXXXX format).
 */
const VGN_EFA_BASE = "https://efa.vgn.de/vgnExt_oeffi/XML_DM_REQUEST";
const VAG_API_BASE = "https://start.vag.de/dm/api/v1/abfahrten/VGN";

/**
 * Shared in-flight fetch Promise cache across multiple card instances.
 */
const IN_FLIGHT_FETCHES = new Map();

function _fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function _fmtTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}${m}`;
}

/**
 * Persistent module-level cache for fetched departure data per stop DHID.
 * Preserves data across view navigation so switching back to a view renders instantly.
 */
const DEPARTURES_CACHE = new Map(); // dhid -> { result, timestamp }

async function fetchStopDeparturesShared(dhid, dateObj) {
  const cacheKey = `${dhid}_${_fmtDate(dateObj)}_${_fmtTime(dateObj)}`;
  if (IN_FLIGHT_FETCHES.has(cacheKey)) {
    return IN_FLIGHT_FETCHES.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const numericId = dhid.split(':').pop();
      try {
        const vagUrl = `${VAG_API_BASE}/${numericId}?product=Bus`;
        const resp = await fetch(vagUrl);
        if (resp.ok) {
          const data = await resp.json();
          if (data?.Abfahrten?.length > 0) {
            const res = { type: 'vag', data: data.Abfahrten };
            DEPARTURES_CACHE.set(dhid, { result: res, timestamp: new Date() });
            return res;
          }
        }
      } catch (e) {
        // Fall through
      }

      const efaParams = new URLSearchParams({
        outputFormat: 'rapidJSON',
        coordOutputFormat: 'WGS84[DD.DDDDD]',
        mode: 'direct',
        type_dm: 'stop',
        name_dm: dhid,
        itdDate: _fmtDate(dateObj),
        itdTime: _fmtTime(dateObj),
        useRealtime: '1',
        limit: '30',
        useProxFootSearch: '0'
      });

      const efaResp = await fetch(`${VGN_EFA_BASE}?${efaParams}`);
      if (!efaResp.ok) throw new Error(`EFA API returned ${efaResp.status}`);
      const efaData = await efaResp.json();
      const res = { type: 'efa', data: efaData?.stopEvents || efaData?.departureList || [] };
      DEPARTURES_CACHE.set(dhid, { result: res, timestamp: new Date() });
      return res;
    } finally {
      IN_FLIGHT_FETCHES.delete(cacheKey);
    }
  })();

  IN_FLIGHT_FETCHES.set(cacheKey, promise);
  return promise;
}

/**
 * VGNDepartureCard
 * A custom Lovelace card that polls the VGN/VAG real-time departure API and
 * displays upcoming bus departures for configured lines at a given stop.
 * Writes minutes-until-departure to `input_number` helpers for automation use.
 *
 * Config shape:
 *   stop_dhid: "de:09371:18001"      # DHID of the departure stop
 *   stop_name: "Sulzbach-Rosenberg"  # Display name for the header
 *   time_from: "06:00"               # Start of the monitoring window (HH:MM)
 *   time_to:   "08:30"               # End of the monitoring window (HH:MM)
 *   poll_interval: 60                # Poll interval in seconds (default 60)
 *   watches:                         # List of buses to watch
 *     - line: "486"
 *       direction: "Amberg"          # Partial match, case-insensitive
 *       helper: "input_number.vgn_bus_486_minutes"
 *       alert_minutes: 10            # Highlight threshold
 *     - line: "456"
 *       direction: "Amberg"
 *       helper: "input_number.vgn_bus_456_minutes"
 *       alert_minutes: 25
 *
 * @extends HAControlBase
 */
class VGNDepartureCard extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      config: {},
      _departures: { state: true },
      _lastUpdated: { state: true },
      _error: { state: true },
      _loading: { state: true },
    };
  }

  get translationPath() { return "/local/ha-controls/vgn-departure-card/translations"; }
  get translationVersion() { return VERSION; }

  static getConfigElement() {
    return document.createElement("vgn-departure-card-editor");
  }

  static getStubConfig() {
    return {
      stop_dhid: "de:09371:18001",
      stop_name: "Sulzbach-Rosenberg, Bischof-Heckel-Str.",
      time_from: "06:00",
      time_to: "08:30",
      poll_interval: 60,
      watches: [
        {
          line: "486",
          direction: "Amberg",
          helper: "input_number.vgn_bus_486_minutes",
          alert_minutes: 10
        },
        {
          line: "456",
          direction: "Amberg",
          helper: "input_number.vgn_bus_456_minutes",
          alert_minutes: 25
        }
      ]
    };
  }

  constructor() {
    super();
    this._departures = {};
    this._lastUpdated = null;
    this._error = null;
    this._loading = false;
    this._pollTimer = null;
    this._nextDepartures = {}; // cache of { [line]: minutesUntil }
    this._goneForDay = {}; // cache of { [line]: isGoneForDayBoolean }
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
  }

  setConfig(config) {
    if (!config.stop_dhid && (!config.watches || !config.watches.some(w => w.stop_dhid))) {
      throw new Error("stop_dhid is required in card config or watches");
    }
    if (!config.watches || !Array.isArray(config.watches) || config.watches.length === 0) {
      throw new Error("At least one watch entry is required");
    }
    this.config = {
      stop_name: config.stop_name || config.stop_dhid || "VGN Abfahrten",
      time_from: "00:00",
      time_to: "23:59",
      poll_interval: 60,
      ...config
    };
    this._unrecognizedKeys = this._validateConfigKeys(config, [
      'stop_dhid', 'stop_name', 'time_from', 'time_to', 'days', 'poll_interval', 'watches', 'debug'
    ]);
  }

  connectedCallback() {
    super.connectedCallback();
    this._restoreFromCache();
    this._startPolling();
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
  }

  _restoreFromCache() {
    if (!this.config) return;
    const dhids = new Set();
    if (this.config.stop_dhid) dhids.add(this.config.stop_dhid);
    for (const w of (this.config.watches || [])) {
      if (w.stop_dhid) dhids.add(w.stop_dhid);
    }

    const cachedResults = {};
    let latestTs = null;
    for (const dhid of dhids) {
      const entry = DEPARTURES_CACHE.get(dhid);
      if (entry) {
        cachedResults[dhid] = entry.result;
        if (!latestTs || entry.timestamp > latestTs) {
          latestTs = entry.timestamp;
        }
      }
    }

    if (Object.keys(cachedResults).length > 0) {
      this._processAllWatches(cachedResults);
      if (latestTs) this._lastUpdated = latestTs;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopPolling();
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
  }

  _handleVisibilityChange() {
    if (document.hidden) {
      // Screen off / tab hidden -> pause timer to save battery & CPU
      this._stopPolling();
    } else {
      // Screen on / tab restored -> fetch immediately & resume polling
      this._startPolling();
    }
  }

  /**
   * Calculates an adaptive polling interval based on how far away the next departure is.
   * - Next bus <= 30 mins: poll every 60s (or config.poll_interval)
   * - Next bus 30-60 mins: poll every 3 mins (180s)
   * - Next bus > 60 mins or no upcoming bus: poll every 5 mins (300s)
   * @returns {number} Interval in milliseconds
   */
  _getAdaptiveInterval() {
    const baseInterval = (this.config?.poll_interval || 60) * 1000;
    if (!this._nextDepartures) return baseInterval;

    let minMinutes = null;
    for (const line in this._nextDepartures) {
      const val = this._nextDepartures[line];
      if (val !== null && val !== undefined && val >= 0) {
        if (minMinutes === null || val < minMinutes) {
          minMinutes = val;
        }
      }
    }

    if (minMinutes === null || minMinutes > 60) {
      return Math.max(baseInterval, 300000); // 5 mins
    } else if (minMinutes > 30) {
      return Math.max(baseInterval, 180000); // 3 mins
    }

    return baseInterval;
  }

  _startPolling() {
    this._stopPolling();
    if (document.hidden) return; // Do not start timer if screen is asleep/hidden

    this._fetchDepartures();
    const scheduleNext = () => {
      const interval = this._getAdaptiveInterval();
      this._pollTimer = setTimeout(() => {
        this._fetchDepartures().finally(() => {
          if (this._pollTimer) scheduleNext();
        });
      }, interval);
    };
    scheduleNext();
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  /**
   * Determines if the current time and day fall within the configured monitoring window.
   * @returns {boolean}
   */
  _isInTimeWindow() {
    if (!this.config) return false;
    const now = new Date();
    const hm = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const from = hm(this.config.time_from || "00:00");
    const to = hm(this.config.time_to || "23:59");
    const timeOk = nowMin >= from && nowMin <= to;

    if (!timeOk) return false;

    if (this.config.days) {
      const dayList = Array.isArray(this.config.days)
        ? this.config.days
        : String(this.config.days).split(',').map(s => s.trim());
      if (dayList.length > 0) {
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDayName = dayNames[now.getDay()];
        const currentDayNum = now.getDay();
        const allowed = dayList.map(d => String(d).toLowerCase().trim());
        const dayOk = allowed.includes(currentDayName) || allowed.includes(String(currentDayNum));
        if (!dayOk) return false;
      }
    }

    return true;
  }

  /**
   * Checks if a given departure Date falls within the configured time_from/time_to window.
   * @param {Date} date
   * @returns {boolean}
   */
  _isDepartureInTimeRange(date) {
    if (!this.config?.time_from || !this.config?.time_to) return true;
    const hm = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const depMin = date.getHours() * 60 + date.getMinutes();
    const fromMin = hm(this.config.time_from);
    const toMin = hm(this.config.time_to);
    return depMin >= fromMin && depMin <= toMin;
  }

  /**
   * Fetches real-time departures from the VGN/VAG API for all stops configured across watches.
   * @param {boolean} [manualRefresh=false] - Optional parameter.
   */
  async _fetchDepartures(manualRefresh = false) {
    if (!this.config) return;

    this._loading = true;
    this._error = null;

    try {
      const defaultDhid = this.config.stop_dhid;
      const dhids = new Set();
      if (defaultDhid) dhids.add(defaultDhid);

      for (const watch of (this.config.watches || [])) {
        if (watch.stop_dhid) {
          dhids.add(watch.stop_dhid);
        }
      }

      if (dhids.size === 0) {
        throw new Error("No stop_dhid specified");
      }

      const results = {};
      await Promise.all(
        Array.from(dhids).map(async (dhid) => {
          results[dhid] = await this._fetchSingleStopDepartures(dhid);
        })
      );

      this._processAllWatches(results);
    } catch (err) {
      console.error('[VGNDepartureCard] Fetch error:', err);
      this._error = err.message || 'Failed to fetch departures';
    } finally {
      this._loading = false;
      this._lastUpdated = new Date();
      this.requestUpdate();
    }
  }

  async _fetchSingleStopDepartures(dhid) {
    return fetchStopDeparturesShared(dhid, new Date());
  }

  _formatEFADate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  _formatEFATime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}${m}`;
  }

  _processAllWatches(stopResults) {
    const now = new Date();
    const newDepartures = {};
    const newNext = {};
    const newGoneForDay = {};

    for (const watch of (this.config.watches || [])) {
      const line = watch.line;
      const dir = (watch.direction || '').toLowerCase();
      const stopDhid = watch.stop_dhid || this.config.stop_dhid;
      const stopResult = stopResults[stopDhid] || { type: 'efa', data: [] };

      let allMapped = [];
      if (stopResult.type === 'vag') {
        const matching = stopResult.data.filter(a => {
          const matchLine = String(a.Linienname || a.line || '') === String(line);
          const matchDir = !dir || (a.Richtungstext || a.direction || '').toLowerCase().includes(dir);
          return matchLine && matchDir;
        });

        allMapped = matching.map(a => {
          const planned = new Date(a.AbfahrtszeitSoll || a.plannedDeparture);
          const delay = (a.Verspätung ?? a.delay ?? 0);
          const realtime = new Date(planned.getTime() + delay * 60000);
          const minutesUntil = Math.round((realtime - now) / 60000);
          return { planned, realtime, minutesUntil, delay, direction: a.Richtungstext || a.direction };
        });
      } else {
        const stopEvents = stopResult.data;
        const matching = stopEvents.filter(e => {
          const transportation = e.transportation || e;
          const lineName = transportation?.number || transportation?.disassembledName || '';
          const destination = transportation?.destination?.name || e.routeDescription || '';
          const matchLine = String(lineName) === String(line);
          const matchDir = !dir || destination.toLowerCase().includes(dir);
          return matchLine && matchDir;
        });

        allMapped = matching.map(e => {
          const depTime = e.departureTimePlanned || e.dateTime?.departure;
          const realTime = e.departureTimeEstimated || depTime;
          const planned = depTime ? new Date(depTime) : null;
          const realtime = realTime ? new Date(realTime) : planned;
          if (!realtime) return null;
          const minutesUntil = Math.round((realtime - now) / 60000);
          const delay = planned ? Math.round((realtime - planned) / 60000) : 0;
          const destination = e.transportation?.destination?.name || e.routeDescription || '';
          return { planned, realtime, minutesUntil, delay, direction: destination };
        }).filter(Boolean);
      }

      // Upcoming departures for the day (minutesUntil >= -1) allow full day schedule planning
      const upcoming = allMapped
        .filter(d => d.minutesUntil >= -1)
        .sort((a, b) => a.minutesUntil - b.minutesUntil);

      // Flag as gone for the day if all scheduled departures for today have already completed
      const isGoneForDay = allMapped.length > 0 && upcoming.length === 0;

      newDepartures[line] = upcoming;
      newNext[line] = upcoming.length > 0 ? upcoming[0].minutesUntil : null;
      newGoneForDay[line] = isGoneForDay;
    }

    this._departures = newDepartures;
    this._nextDepartures = newNext;
    this._goneForDay = newGoneForDay;
    this._writeHelpers();
  }

  /**
   * Writes the next departure time (in minutes) to configured input_number helpers.
   * Writes -1 if no upcoming departure is found.
   */
  _writeHelpers() {
    if (!this.hass) return;
    const inWindow = this._isInTimeWindow();
    for (const watch of (this.config.watches || [])) {
      if (!watch.helper) continue;
      const minutes = inWindow ? this._nextDepartures[watch.line] : null;
      const value = minutes !== null && minutes !== undefined ? minutes : -1;
      this.hass.callService('input_number', 'set_value', {
        entity_id: watch.helper,
        value: Math.max(-1, value)
      });
    }
  }

  /**
   * Formats a minutes value as a human-readable string.
   * @param {number} min
   * @returns {string}
   */
  _formatMinutes(min) {
    if (min === null || min === undefined) return '—';
    if (min <= 0) return this._localize('now') || 'Now';
    return `${min} min`;
  }

  /**
   * Formats a Date to HH:MM string.
   * @param {Date} date
   * @returns {string}
   */
  _formatTime(date) {
    if (!date) return '—';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  _formatDays(days) {
    if (!days) return '';
    const list = Array.isArray(days) ? days : String(days).split(',').map(s => s.trim());
    if (list.length === 0) return '';
    const map = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
    const formatted = list.map(d => map[d.toLowerCase()] || d).join(', ');
    return `${formatted} `;
  }

  render() {
    if (!this.config) return html``;

    const inWindow = this._isInTimeWindow();
    const watches = this.config.watches || [];
    const lastUpdatedStr = this._lastUpdated
      ? this._formatTime(this._lastUpdated)
      : '—';

    return html`
      ${this.renderStyle('vgn-departure-card.css')}
      ${this.renderConfigValidationWarning()}
      <ha-card class="vgn-card ${inWindow ? 'in-window' : 'out-window'}">
        <div class="vgn-header">
          <div class="vgn-header-left">
            <ha-icon icon="mdi:bus-clock" class="vgn-bus-icon"></ha-icon>
            <div class="vgn-header-info">
              <div class="vgn-stop-name">${this.config.stop_name}</div>
              <div class="vgn-window-label">
                ${this._formatDays(this.config.days)}${this.config.time_from} – ${this.config.time_to}
                ${!inWindow ? html`<span class="vgn-outside-badge">${this._localize('outside_window') || 'Outside window'}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="vgn-header-right">
            ${this._loading ? html`<ha-icon icon="mdi:loading" class="vgn-loading-icon spin"></ha-icon>` : ''}
            <div class="vgn-updated">${this._localize('updated') || 'Updated'}: ${lastUpdatedStr}</div>
          </div>
        </div>

        ${this._error ? html`
          <div class="vgn-error">
            <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
            ${this._error}
          </div>
        ` : ''}

        <div class="vgn-watches">
          ${watches.map(watch => this._renderWatch(watch))}
        </div>

        <div class="vgn-footer">
          <button class="vgn-refresh-btn" @click="${() => this._fetchDepartures(true)}">
            <ha-icon icon="mdi:refresh"></ha-icon>
            ${this._localize('refresh') || 'Refresh'}
          </button>
        </div>
      </ha-card>
    `;
  }

  _renderWatch(watch) {
    const line = watch.line;
    const alertMin = watch.alert_minutes ?? 15;
    const departures = this._departures[line] || [];
    const nextMin = this._nextDepartures[line];
    const isAlert = nextMin !== null && nextMin !== undefined && nextMin <= alertMin;
    const isEmpty = departures.length === 0;

    return html`
      <div class="vgn-watch ${isAlert ? 'alert' : ''} ${isEmpty ? 'empty' : ''}">
        <div class="vgn-watch-header">
          <div class="vgn-line-badge" style="background: ${this._lineColor(line)}">
            ${line}
          </div>
          <div class="vgn-watch-info">
            <div class="vgn-watch-direction">
              <ha-icon icon="mdi:arrow-right-circle-outline"></ha-icon>
              ${watch.direction || '—'}
            </div>
            ${watch.helper ? html`
              <div class="vgn-helper-label">
                <ha-icon icon="mdi:link-variant"></ha-icon>
                ${watch.helper}
              </div>
            ` : ''}
          </div>
          <div class="vgn-next-time ${isAlert ? 'alert-pulse' : ''}">
            ${isEmpty
              ? html`<span class="vgn-no-service">—</span>`
              : html`
                <span class="vgn-minutes ${nextMin <= 0 ? 'now' : nextMin <= alertMin ? 'urgent' : ''}">${this._formatMinutes(nextMin)}</span>
              `
            }
          </div>
        </div>

        ${departures.length > 0 ? html`
          <div class="vgn-departures">
            ${departures.slice(0, 4).map((dep, i) => html`
              <div class="vgn-dep-row ${i === 0 ? 'first' : ''}">
                <div class="vgn-dep-time">
                  <span class="vgn-dep-planned">${this._formatTime(dep.planned)}</span>
                  ${dep.delay > 0 ? html`<span class="vgn-dep-delay">+${dep.delay}</span>` : ''}
                  ${dep.delay < 0 ? html`<span class="vgn-dep-early">${dep.delay}</span>` : ''}
                </div>
                <div class="vgn-dep-realtime">${this._formatTime(dep.realtime)}</div>
                <div class="vgn-dep-until ${dep.minutesUntil <= alertMin ? 'urgent' : ''}">
                  ${this._formatMinutes(dep.minutesUntil)}
                </div>
              </div>
            `)}
          </div>
        ` : html`
          <div class="vgn-no-departures">
            ${this._loading && !this._lastUpdated
              ? (this._localize('loading') || 'Loading...')
              : (this._goneForDay[line]
                  ? (this._localize('gone_for_day') || 'All departures completed for today')
                  : (this._localize('no_departures') || 'No departures found'))}
          </div>
        `}
      </div>
    `;
  }

  /**
   * Returns a consistent color for a given line number.
   * @param {string} line
   * @returns {string} CSS color
   */
  _lineColor(line) {
    const colors = {
      '486': '#e8501a',
      '456': '#1a78e8',
      default: '#555'
    };
    return colors[line] || colors['default'];
  }
}

customElements.define("vgn-departure-card", VGNDepartureCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "vgn-departure-card",
  name: "VGN Departure Card",
  description: "Zeigt Echtzeitabfahrten für VGN/VAG Buslinien und schreibt die nächste Abfahrtzeit in input_number Helfer für Automationen.",
  preview: true
});
