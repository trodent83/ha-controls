import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.7.3';

/**
 * VGN/VAG API endpoint for departures using the VGN outer-network EFA endpoint.
 * Accepts DHID stop IDs (de:XXXXXX:XXXXX format).
 */
const VGN_EFA_BASE = "https://efa.vgn.de/vgnExt_oeffi/XML_DM_REQUEST";
const VAG_API_BASE = "https://start.vag.de/dm/api/v1/abfahrten/VGN";

/**
 * Shared in-flight fetch Promise cache across multiple card instances for online fallback.
 */
const IN_FLIGHT_FETCHES = new Map();

/**
 * Shared module-level calendar event cache and in-flight request deduplication across card instances.
 * When multiple cards (e.g. Card 1 for 486 and Card 2 for 456) are on the same view,
 * they share a single fetch call to Home Assistant's local calendar API.
 */
const CALENDAR_CACHE = new Map(); // entityId -> { events, timestamp }
const CALENDAR_IN_FLIGHT = new Map(); // entityId -> Promise

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

function _fmtTimeHM(date) {
  if (!date) return '—';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Persistent module-level cache for fetched departure data per stop DHID.
 */
const DEPARTURES_CACHE = new Map(); // dhid -> { result, timestamp }

async function fetchStopDeparturesShared(dhid, dateObj, targetTimeStr = null) {
  const timeQuery = targetTimeStr || _fmtTime(dateObj);
  const cacheKey = `${dhid}_${_fmtDate(dateObj)}_${timeQuery}`;
  if (IN_FLIGHT_FETCHES.has(cacheKey)) {
    return IN_FLIGHT_FETCHES.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const numericId = dhid.split(':').pop();
      try {
        const vagUrl = `${VAG_API_BASE}/${numericId}?product=Bus,Tram,UBahn,SBahn,Train`;
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
        // Fall through to EFA
      }

      const efaParams = new URLSearchParams({
        outputFormat: 'rapidJSON',
        coordOutputFormat: 'WGS84[DD.DDDDD]',
        mode: 'direct',
        type_dm: 'stop',
        name_dm: dhid,
        itdDate: _fmtDate(dateObj),
        itdTime: timeQuery,
        useRealtime: '1',
        limit: '200',
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
 * A custom Lovelace card that displays upcoming bus departures from a local Home Assistant
 * calendar (calendar.bus_scedule) or fallback online VGN/VAG API.
 * Supports per-bus verbal notification indicators, interactive selection/deselection,
 * and high-performance shared caching across dashboard card instances.
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
      calendar_entity: "calendar.bus_scedule",
      refresh_script: "script.vgn_bus_sync_calendar",
      disable_timer: true,
      alert_overrides_helper: "input_text.vgn_bus_alert_overrides",
      stop_name: "Bus Schedule",
      time_from: "06:00",
      time_to: "21:00",
      poll_interval: 600,
      watches: [
        {
          line: "486",
          direction: "Amberg",
          helper: "input_number.vgn_bus_486_minutes",
          alerts_enabled_switch: "input_boolean.vgn_bus_486_alerts_enabled",
          alert_minutes: 10
        },
        {
          line: "456",
          direction: "Amberg",
          helper: "input_number.vgn_bus_456_minutes",
          alerts_enabled_switch: "input_boolean.vgn_bus_456_alerts_enabled",
          alert_minutes: 10
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
    this._localTickTimer = null;
    this._nextDepartures = {};
    this._goneForDay = {};
    this._rawCalendarEvents = [];
    this._cachedOverridesStr = null;
    this._cachedTokensSet = null;
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._handleCalendarRefreshed = this._handleCalendarRefreshed.bind(this);
  }

  _getWatchedEntities(config) {
    const watched = new Set(super._getWatchedEntities(config));
    if (this.config?.calendar_entity) {
      watched.add(this.config.calendar_entity);
    }
    if (this.config?.alert_overrides_helper) {
      watched.add(this.config.alert_overrides_helper);
    }
    for (const watch of (this.config?.watches || [])) {
      if (watch.helper) watched.add(watch.helper);
      if (watch.alerts_enabled_switch) watched.add(watch.alerts_enabled_switch);
    }
    return Array.from(watched);
  }

  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has('hass') && this.config?.calendar_entity) {
      const oldHass = changedProps.get('hass');
      const calEntity = this.config.calendar_entity;
      if (oldHass && this.hass && oldHass.states[calEntity] !== this.hass.states[calEntity]) {
        // Automatically invalidate cache and re-fetch when calendar state changes
        CALENDAR_CACHE.delete(calEntity);
        this._fetchCalendarDepartures();
      }
    }
  }

  setConfig(config) {
    const calendarEntity = config.calendar_entity !== undefined ? config.calendar_entity : "calendar.bus_scedule";
    if (!calendarEntity && !config.stop_dhid && (!config.watches || !config.watches.some(w => w.stop_dhid))) {
      throw new Error("calendar_entity or stop_dhid is required in card config or watches");
    }
    if (!config.watches || !Array.isArray(config.watches) || config.watches.length === 0) {
      throw new Error("At least one watch entry is required");
    }
    const disableTimer = config.disable_timer !== undefined
      ? Boolean(config.disable_timer)
      : (Boolean(calendarEntity));
    const refreshScript = config.refresh_script !== undefined
      ? config.refresh_script
      : (calendarEntity ? "script.vgn_bus_sync_calendar" : "");

    this.config = {
      calendar_entity: calendarEntity,
      alert_overrides_helper: config.alert_overrides_helper || "input_text.vgn_bus_alert_overrides",
      stop_name: config.stop_name || (calendarEntity ? "Bus Schedule" : config.stop_dhid) || "VGN Abfahrten",
      time_from: "00:00",
      time_to: "23:59",
      poll_interval: config.poll_interval || (calendarEntity ? 600 : 60),
      max_departures: 12,
      rolling_hours: config.rolling_hours ? Number(config.rolling_hours) : null,
      disable_timer: disableTimer,
      refresh_script: refreshScript,
      ...config
    };
    this._unrecognizedKeys = this._validateConfigKeys(config, [
      'calendar_entity', 'alert_overrides_helper', 'stop_dhid', 'stop_name', 'time_from', 'time_to',
      'days', 'poll_interval', 'max_departures', 'rolling_hours', 'watches', 'debug',
      'disable_timer', 'refresh_script'
    ]);
  }

  connectedCallback() {
    super.connectedCallback();
    this._restoreFromCache();
    this._startPolling();
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
    window.addEventListener('vgn-calendar-refreshed', this._handleCalendarRefreshed);
  }

  _handleCalendarRefreshed(e) {
    if (this._loading || e?.detail?.source === this) return;
    if (this.config?.calendar_entity) {
      CALENDAR_CACHE.delete(this.config.calendar_entity);
      this._fetchCalendarDepartures(true);
    }
  }

  _restoreFromCache() {
    if (!this.config) return;
    if (this.config.calendar_entity) {
      const entry = CALENDAR_CACHE.get(this.config.calendar_entity);
      if (entry && entry.events?.length > 0) {
        this._rawCalendarEvents = entry.events;
        this._processCalendarWatches(entry.events);
        this._lastUpdated = entry.timestamp;
      }
      return;
    }

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
    window.removeEventListener('vgn-calendar-refreshed', this._handleCalendarRefreshed);
  }

  _handleVisibilityChange() {
    if (document.hidden) {
      this._stopPolling();
    } else {
      if (this.config?.disable_timer) {
        // Screen wake / active view: recompute countdowns and refresh departures without starting timers
        if (this.config.calendar_entity) {
          if (this._rawCalendarEvents && this._rawCalendarEvents.length > 0) {
            this._processCalendarWatches(this._rawCalendarEvents);
          }
          this._fetchCalendarDepartures();
        } else {
          this._fetchDepartures();
        }
      } else {
        this._startPolling();
      }
    }
  }

  _startPolling() {
    this._stopPolling();
    if (document.hidden) return;

    // Immediate initial fetch
    this._fetchDepartures();

    // Tablet power saving: if disable_timer is true, skip both local countdown loop and poll interval
    if (this.config?.disable_timer) {
      return;
    }

    // Align local countdown ticker with wall clock half-minute marks (:00, :30)
    // Ensures clean rollover of minutes without arbitrary timer phase drift
    const scheduleNextTick = () => {
      if (!this.isConnected || this.config?.disable_timer) return;
      const now = new Date();
      const msToNextBoundary = (30 - (now.getSeconds() % 30)) * 1000 - now.getMilliseconds();
      this._localTickTimer = setTimeout(() => {
        if (!this.isConnected || this.config?.disable_timer) return;
        this._recomputeLocalTick();
        scheduleNextTick();
      }, Math.max(500, msToNextBoundary));
    };
    scheduleNextTick();

    // Schedule periodic background refresh from local calendar
    const interval = (this.config?.poll_interval || 600) * 1000;
    if (interval > 0) {
      this._pollTimer = setInterval(() => {
        this._fetchDepartures();
      }, interval);
    }
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._localTickTimer) {
      clearTimeout(this._localTickTimer);
      this._localTickTimer = null;
    }
  }

  _getDeparturesSignature() {
    return Object.entries(this._departures)
      .map(([k, list]) => `${k}:${(list || []).map(d => d.minutesUntil).join(',')}`)
      .join('|');
  }

  _recomputeLocalTick() {
    if (this.config?.calendar_entity && this._rawCalendarEvents && this._rawCalendarEvents.length > 0) {
      const prevSig = this._getDeparturesSignature();
      this._processCalendarWatches(this._rawCalendarEvents);
      const newSig = this._getDeparturesSignature();

      // Only trigger a LitElement DOM re-render if visible countdown minutes actually changed
      if (prevSig !== newSig) {
        this.requestUpdate();
      }
    }
  }

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

  _isDepartureInTimeRange(date) {
    if (!date) return false;
    if (this.config?.rolling_hours && this.config.rolling_hours > 0) {
      const now = new Date();
      const diffMins = Math.round((date - now) / 60000);
      return diffMins >= -1 && diffMins <= (this.config.rolling_hours * 60);
    }
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

  async _fetchDepartures(manualRefresh = false) {
    if (!this.config) return;

    this._loading = true;
    this._error = null;
    this.requestUpdate();

    try {
      if (manualRefresh && this.config.refresh_script && this.hass) {
        const scriptId = this.config.refresh_script;
        const scriptName = scriptId.startsWith('script.') ? scriptId.substring(7) : scriptId;
        try {
          await this.hass.callService('script', scriptName, {});
        } catch (scriptErr) {
          console.warn('[VGNDepartureCard] Refresh script execution warning:', scriptErr);
        }
        if (this.config.calendar_entity) {
          CALENDAR_CACHE.delete(this.config.calendar_entity);
        }
        DEPARTURES_CACHE.clear();
      }

      if (this.config.calendar_entity) {
        await this._fetchCalendarDepartures(manualRefresh);
      } else {
        await this._fetchOnlineDepartures();
      }

      if (manualRefresh) {
        window.dispatchEvent(new CustomEvent('vgn-calendar-refreshed', {
          detail: { source: this, calendar: this.config.calendar_entity }
        }));
      }
    } catch (err) {
      console.error('[VGNDepartureCard] Fetch error:', err);
      this._error = err.message || 'Failed to fetch departures';
    } finally {
      this._loading = false;
      this._lastUpdated = new Date();
      this.requestUpdate();
    }
  }

  async _fetchCalendarDepartures(manualRefresh = false) {
    if (!this.hass || !this.config.calendar_entity) return;
    const calEntity = this.config.calendar_entity;
    const now = new Date();
    const ttl = 30000; // 30-second cross-instance deduplication cache

    if (manualRefresh) {
      CALENDAR_CACHE.delete(calEntity);
    }

    const cacheEntry = CALENDAR_CACHE.get(calEntity);
    let events;

    if (cacheEntry && (now - cacheEntry.timestamp < ttl)) {
      events = cacheEntry.events;
    } else if (CALENDAR_IN_FLIGHT.has(calEntity)) {
      events = await CALENDAR_IN_FLIGHT.get(calEntity);
    } else {
      const fetchPromise = (async () => {
        try {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          const startStr = startOfDay.toISOString();
          const endStr = endOfDay.toISOString();
          const path = `calendars/${calEntity}?start=${startStr}&end=${endStr}`;
          const rawEvents = await this.hass.callApi("GET", path);
          const res = Array.isArray(rawEvents) ? rawEvents.map(e => {
            const startStr = e.start?.dateTime || e.start;
            const parsedDate = startStr ? new Date(startStr) : null;
            const summary = e.summary || '';
            const desc = e.description || '';
            return {
              ...e,
              _parsedDate: parsedDate,
              _timeMs: parsedDate ? parsedDate.getTime() : null,
              _normalizedText: `${summary} ${desc}`.toLowerCase(),
              _cleanDest: summary ? summary.replace(/Bus\s*\d+\s*[-–:]\s*/i, '').trim() : ''
            };
          }) : [];
          CALENDAR_CACHE.set(calEntity, { events: res, timestamp: new Date() });
          return res;
        } finally {
          CALENDAR_IN_FLIGHT.delete(calEntity);
        }
      })();
      CALENDAR_IN_FLIGHT.set(calEntity, fetchPromise);
      events = await fetchPromise;
    }

    this._rawCalendarEvents = events;
    this._processCalendarWatches(events);
  }

  _processCalendarWatches(events) {
    const now = new Date();
    const nowMs = now.getTime();
    const hm = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const toMin = hm(this.config?.time_to || "23:59");

    const newDepartures = {};
    const newNext = {};
    const newGoneForDay = {};

    for (const watch of (this.config.watches || [])) {
      const line = String(watch.line || '');
      const lineLower = line.toLowerCase();
      const dir = (watch.direction || '').toLowerCase();

      const matching = events.filter(e => {
        const text = e._normalizedText !== undefined ? e._normalizedText : `${e.summary || ''} ${e.description || ''}`.toLowerCase();
        const matchLine = text.includes(lineLower);
        const matchDir = !dir || text.includes(dir);
        return matchLine && matchDir;
      });

      const allMapped = matching.map(e => {
        const depTime = e._parsedDate || (e.start?.dateTime || e.start ? new Date(e.start.dateTime || e.start) : null);
        if (!depTime) return null;
        const depTimeMs = e._timeMs || depTime.getTime();
        const minutesUntil = Math.round((depTimeMs - nowMs) / 60000);
        const destination = e._cleanDest || (e.summary ? e.summary.replace(/Bus\s*\d+\s*[-–:]\s*/i, '').trim() : (watch.direction || ''));
        return {
          planned: depTime,
          realtime: depTime,
          minutesUntil,
          delay: 0,
          direction: destination,
          summary: e.summary || '',
          description: e.description || '',
          calendarEvent: e
        };
      }).filter(Boolean);

      const upcoming = allMapped
        .filter(d => d.minutesUntil >= -1 && this._isDepartureInTimeRange(d.realtime))
        .sort((a, b) => a.minutesUntil - b.minutesUntil);

      const isGoneForDay = upcoming.length === 0 && (this.config?.rolling_hours ? false : nowMin > toMin);

      newDepartures[line] = upcoming;
      newNext[line] = upcoming.length > 0 ? upcoming[0].minutesUntil : null;
      newGoneForDay[line] = isGoneForDay;
    }

    this._departures = newDepartures;
    this._nextDepartures = newNext;
    this._goneForDay = newGoneForDay;
    this._writeHelpers();
  }

  async _fetchOnlineDepartures() {
    const defaultDhid = this.config.stop_dhid;
    const dhids = new Set();
    if (defaultDhid) dhids.add(defaultDhid);

    for (const watch of (this.config.watches || [])) {
      if (watch.stop_dhid) dhids.add(watch.stop_dhid);
    }

    if (dhids.size === 0) throw new Error("No stop_dhid specified");

    const results = {};
    await Promise.all(
      Array.from(dhids).map(async (dhid) => {
        results[dhid] = await this._fetchSingleStopDepartures(dhid);
      })
    );

    this._processAllWatches(results);
  }

  async _fetchSingleStopDepartures(dhid) {
    const now = new Date();
    if (this.config?.rolling_hours && this.config.rolling_hours > 0) {
      return fetchStopDeparturesShared(dhid, now, null);
    }
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const hm = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const fromMin = hm(this.config?.time_from || "00:00");

    let targetTimeStr = null;
    if (nowMin < fromMin) {
      targetTimeStr = (this.config.time_from || "00:00").replace(":", "");
    }

    return fetchStopDeparturesShared(dhid, now, targetTimeStr);
  }

  _processAllWatches(stopResults) {
    const now = new Date();
    const hm = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const toMin = hm(this.config?.time_to || "23:59");

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

      const upcoming = allMapped
        .filter(d => d.minutesUntil >= -1 && this._isDepartureInTimeRange(d.realtime))
        .sort((a, b) => a.minutesUntil - b.minutesUntil);

      const isGoneForDay = upcoming.length === 0 && (this.config?.rolling_hours ? false : nowMin > toMin);

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
   * Optimizes WebSocket traffic by only calling set_value if the numeric state has changed.
   */
  _writeHelpers() {
    if (!this.hass) return;
    const inWindow = this._isInTimeWindow();
    for (const watch of (this.config.watches || [])) {
      if (!watch.helper) continue;
      const minutes = inWindow ? this._nextDepartures[watch.line] : null;
      const targetVal = Math.max(-1, minutes !== null && minutes !== undefined ? minutes : -1);
      const currentVal = Number(this.hass.states[watch.helper]?.state);

      // Only dispatch service call if value actually changed
      if (currentVal !== targetVal) {
        this.hass.callService('input_number', 'set_value', {
          entity_id: watch.helper,
          value: targetVal
        });
      }
    }
  }

  /**
   * Retrieves or computes a cached Set of alert override tokens.
   * Invalidated only when the raw helper state changes.
   */
  _getOverrideTokens() {
    const overridesHelper = this.config?.alert_overrides_helper || 'input_text.vgn_bus_alert_overrides';
    const overridesStr = this.hass?.states[overridesHelper]?.state || '';
    if (this._cachedOverridesStr === overridesStr && this._cachedTokensSet) {
      return this._cachedTokensSet;
    }
    this._cachedOverridesStr = overridesStr;
    if (!overridesStr) {
      this._cachedTokensSet = new Set();
    } else {
      this._cachedTokensSet = new Set(overridesStr.split(',').map(s => s.trim()).filter(Boolean));
    }
    return this._cachedTokensSet;
  }

  /**
   * Checks if an individual bus departure is scheduled to trigger a verbal TTS announcement.
   * Employs O(1) Set lookup from input_text.vgn_bus_alert_overrides.
   */
  _isDepartureAlertActive(watch, dep) {
    const line = String(watch.line || '');
    const dir = (watch.direction || '').toLowerCase();
    const alertSwitchEntity = watch.alerts_enabled_switch;
    const isAlertsEnabled = alertSwitchEntity
      ? (this.hass?.states[alertSwitchEntity]?.state === 'on')
      : false;

    const depDate = dep.planned || dep.realtime;
    if (!depDate) return false;
    const depHour = depDate.getHours();
    const depDay = depDate.getDay();
    const isWeekday = depDay >= 1 && depDay <= 5;

    let baseActive = false;
    if (line === '486' && dir.includes('amberg')) {
      baseActive = isAlertsEnabled && isWeekday && (depHour >= 6 && depHour < 9);
    } else {
      baseActive = isAlertsEnabled;
    }

    const tokens = this._getOverrideTokens();
    if (tokens.size > 0) {
      const timeStr = this._formatTime(depDate);
      const busKey = `${line}@${timeStr}`;

      if (tokens.has(`-${busKey}`)) {
        return false;
      }
      if (tokens.has(`+${busKey}`)) {
        return true;
      }
    }
    return baseActive;
  }

  /**
   * Toggles verbal alert active state for an individual bus run and persists to helper.
   */
  _toggleDepartureAlert(watch, dep) {
    if (!this.hass) return;
    const line = String(watch.line || '');
    const depDate = dep.planned || dep.realtime;
    if (!depDate) return;
    const timeStr = this._formatTime(depDate);
    const busKey = `${line}@${timeStr}`;
    const currentlyActive = this._isDepartureAlertActive(watch, dep);

    const overridesHelper = this.config.alert_overrides_helper || 'input_text.vgn_bus_alert_overrides';
    const currentVal = this.hass?.states[overridesHelper]?.state || '';
    let items = currentVal.split(',').map(s => s.trim()).filter(Boolean);

    items = items.filter(k => k !== `+${busKey}` && k !== `-${busKey}`);

    if (currentlyActive) {
      items.push(`-${busKey}`);
    } else {
      items.push(`+${busKey}`);
    }

    const newVal = items.join(',');
    // Optimistic cache update for instant UI feedback
    this._cachedOverridesStr = newVal;
    this._cachedTokensSet = new Set(items);

    this.hass.callService('input_text', 'set_value', {
      entity_id: overridesHelper,
      value: newVal
    });
    this.requestUpdate();
  }

  _toggleAlerts(entityId) {
    if (!this.hass || !entityId) return;
    this.hass.callService('input_boolean', 'toggle', { entity_id: entityId });
  }

  _formatMinutes(min) {
    if (min === null || min === undefined) return '—';
    if (min <= 0) return this._localize('now') || 'Now';
    return `${min} min`;
  }

  _formatTime(date) {
    return _fmtTimeHM(date);
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
                ${this.config.rolling_hours > 0
                  ? `${this._formatDays(this.config.days)}${(this._localize('next_hours') || 'Next {hours}h').replace('{hours}', this.config.rolling_hours)}`
                  : `${this._formatDays(this.config.days)}${this.config.time_from} – ${this.config.time_to}`
                }
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
          <button
            class="vgn-refresh-btn ${this._loading ? 'loading' : ''}"
            ?disabled="${this._loading}"
            @click="${() => this._fetchDepartures(true)}"
          >
            <ha-icon icon="${this._loading ? 'mdi:loading' : 'mdi:refresh'}" class="${this._loading ? 'spin' : ''}"></ha-icon>
            ${this._loading
              ? (this._localize('refreshing') || 'Refreshing...')
              : (this._localize('refresh') || 'Refresh')}
          </button>
        </div>
      </ha-card>
    `;
  }

  _renderWatch(watch) {
    const line = watch.line;
    const hasAlertConfig = watch.alert_minutes !== undefined && watch.alert_minutes !== null && watch.alert_minutes !== false && watch.alert_minutes !== 0;
    const alertMin = hasAlertConfig ? watch.alert_minutes : 0;
    const alertSwitchEntity = watch.alerts_enabled_switch;
    const isAlertsEnabled = alertSwitchEntity
      ? (this.hass?.states[alertSwitchEntity]?.state !== 'off')
      : true;
    const departures = this._departures[line] || [];
    const nextMin = this._nextDepartures[line];
    const isAlert = hasAlertConfig && isAlertsEnabled && nextMin !== null && nextMin !== undefined && nextMin <= alertMin;
    const isEmpty = departures.length === 0;

    return html`
      <div class="vgn-watch ${isAlert ? 'alert' : ''} ${isEmpty ? 'empty' : ''}">
        <div class="vgn-watch-header">
          <div class="vgn-line-badge" style="background: ${this._lineColor(line, watch)}">
            ${line}
          </div>
          <div class="vgn-watch-info">
            <div class="vgn-watch-direction">
              <ha-icon icon="${this._modeIcon(line, watch.mode, watch.icon)}"></ha-icon>
              ${watch.direction || '—'}
            </div>
            ${watch.helper ? html`
              <div class="vgn-helper-label">
                <ha-icon icon="mdi:link-variant"></ha-icon>
                ${watch.helper}
              </div>
            ` : ''}
          </div>
          ${alertSwitchEntity ? html`
            <button class="vgn-alert-toggle-btn ${isAlertsEnabled ? 'enabled' : 'muted'}"
              @click="${(e) => { e.stopPropagation(); this._toggleAlerts(alertSwitchEntity); }}"
              title="${isAlertsEnabled ? (this._localize('alerts_enabled_title') || 'Voice alerts enabled') : (this._localize('alerts_muted_title') || 'Voice alerts muted')}">
              <ha-icon icon="${isAlertsEnabled ? 'mdi:volume-high' : 'mdi:volume-off'}"></ha-icon>
            </button>
          ` : ''}
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
            ${departures.slice(0, watch.max_departures || this.config?.max_departures || 12).map((dep, i) => {
              const isAlertActive = this._isDepartureAlertActive(watch, dep);
              const alertTooltip = isAlertActive
                ? (this._localize('alert_enabled') || 'Voice alert active (click to mute)')
                : (this._localize('alert_disabled') || 'Voice alert disabled (click to activate)');

              return html`
                <div class="vgn-dep-row ${i === 0 ? 'first' : ''} ${isAlertActive ? 'alert-active' : ''}">
                  <div class="vgn-dep-time">
                    <span class="vgn-dep-planned">${this._formatTime(dep.planned)}</span>
                    ${dep.delay > 0 ? html`<span class="vgn-dep-delay">+${dep.delay}</span>` : ''}
                    ${dep.delay < 0 ? html`<span class="vgn-dep-early">${dep.delay}</span>` : ''}
                  </div>
                  <div class="vgn-dep-realtime">${this._formatTime(dep.realtime)}</div>
                  <div class="vgn-dep-until ${dep.minutesUntil <= alertMin ? 'urgent' : ''}">
                    ${this._formatMinutes(dep.minutesUntil)}
                  </div>
                  <button
                    class="vgn-row-alert-btn ${isAlertActive ? 'active' : 'muted'}"
                    @click="${(e) => { e.stopPropagation(); this._toggleDepartureAlert(watch, dep); }}"
                    title="${alertTooltip}">
                    <ha-icon icon="${isAlertActive ? 'mdi:volume-high' : 'mdi:volume-off'}"></ha-icon>
                  </button>
                </div>
              `;
            })}
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

  _modeIcon(line, mode, watchIcon) {
    if (watchIcon) return watchIcon;
    const l = String(line || '').toUpperCase();
    const m = String(mode || '').toLowerCase();
    if (l.startsWith('U') || m === 'ubahn') return 'mdi:subway';
    if (l.startsWith('S') || m === 'sbahn') return 'mdi:train-variant';
    if (l.startsWith('RE') || l.startsWith('RB') || l.startsWith('IC') || l.startsWith('ICE') || m === 'train' || m === 'regionalzug') return 'mdi:train';
    if (l.startsWith('TRAM') || m === 'tram') return 'mdi:tram';
    return 'mdi:bus';
  }

  _lineColor(line, watch) {
    if (watch?.color) return watch.color;
    const l = String(line || '').toUpperCase();
    const colors = {
      '486': '#e8501a',
      '456': '#1a78e8',
      'U1': '#d01e38',
      'U2': '#cd126b',
      'U3': '#00893b'
    };
    if (colors[l]) return colors[l];
    if (l.startsWith('U')) return '#00509a';
    if (l.startsWith('S')) return '#008e4e';
    if (l.startsWith('RE') || l.startsWith('RB') || l.startsWith('IC') || l.startsWith('ICE')) return '#991b1b';
    if (l.startsWith('TRAM')) return '#dc2626';
    return '#475569';
  }
}

customElements.define("vgn-departure-card", VGNDepartureCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "vgn-departure-card",
  name: "VGN Departure Card",
  description: "Zeigt Abfahrten aus dem lokalen Kalender (oder VGN API) und ermöglicht sprachgesteuerte Benachrichtigungen pro Buslinie und Einzelfahrt.",
  preview: true
});
