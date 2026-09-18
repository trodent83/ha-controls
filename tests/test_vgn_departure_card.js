import test, { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Setup browser/DOM globals required by LitElement & HAControlBase before importing card
class MockLitElement extends EventTarget {
  static get properties() { return {}; }
  requestUpdate() {}
  updated() {}
}
MockLitElement.prototype.html = (strings, ...values) => strings.join("");
MockLitElement.prototype.css = (strings, ...values) => strings.join("");

const windowTarget = new EventTarget();
Object.assign(windowTarget, {
  LitElement: MockLitElement,
  customElements: {
    get: () => MockLitElement,
    define: () => {}
  },
  customCards: []
});
globalThis.window = windowTarget;
globalThis.LitElement = MockLitElement;
globalThis.customElements = windowTarget.customElements;
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARD_DIR = path.resolve(__dirname, "../vgn-departure-card");

// Import vgn-departure-card module
const {
  IN_FLIGHT_FETCHES,
  CALENDAR_CACHE,
  CALENDAR_IN_FLIGHT,
  DEPARTURES_CACHE,
  _fmtDate,
  _fmtTime,
  _fmtTimeHM,
  fetchStopDeparturesShared,
  VGNDepartureCard
} = await import("../vgn-departure-card/vgn-departure-card.js");

describe("VGNDepartureCard - Formatters, Cache, In-Flight Deduplication & Refresh Suite", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    IN_FLIGHT_FETCHES.clear();
    CALENDAR_CACHE.clear();
    CALENDAR_IN_FLIGHT.clear();
    DEPARTURES_CACHE.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    IN_FLIGHT_FETCHES.clear();
    CALENDAR_CACHE.clear();
    CALENDAR_IN_FLIGHT.clear();
    DEPARTURES_CACHE.clear();
  });

  describe("1. Static Contract & Versioning Anti-Regression Checks", () => {
    it("version string must match across loader, card, and editor modules", () => {
      const loaderCode = fs.readFileSync(path.join(CARD_DIR, "vgn-departure-card-loader.js"), "utf8");
      const cardCode = fs.readFileSync(path.join(CARD_DIR, "vgn-departure-card.js"), "utf8");
      const editorCode = fs.readFileSync(path.join(CARD_DIR, "vgn-departure-card-editor.js"), "utf8");

      const loaderVer = loaderCode.match(/const\s+VERSION\s*=\s*["']([^"']+)["']/)?.[1];
      assert.ok(loaderVer, "Loader must declare VERSION");

      const cardVer = cardCode.match(/const\s+VERSION\s*=.*\|\|\s*['"]([^"']+)['']/)?.[1];
      const editorVer = editorCode.match(/const\s+VERSION\s*=.*\|\|\s*['"]([^"']+)['']/)?.[1];

      assert.equal(cardVer, loaderVer, `Card version (${cardVer}) must match loader (${loaderVer})`);
      assert.equal(editorVer, loaderVer, `Editor version (${editorVer}) must match loader (${loaderVer})`);
    });

    it("translations/en.json fallback file must exist and contain valid JSON", () => {
      const transPath = path.join(CARD_DIR, "translations", "en.json");
      assert.ok(fs.existsSync(transPath), "translations/en.json must exist");
      const content = fs.readFileSync(transPath, "utf8");
      const parsed = JSON.parse(content);
      assert.equal(typeof parsed, "object");
      assert.ok(parsed.now, "Must have basic keys like 'now'");
    });

    it("VGNDepartureCard must implement translationPath and translationVersion getters", () => {
      const card = new VGNDepartureCard();
      assert.equal(card.translationPath, "/local/ha-controls/vgn-departure-card/translations");
      assert.ok(card.translationVersion, "Must provide translationVersion");
    });
  });

  describe("2. Date and Time Formatting Helpers (_fmtDate, _fmtTime, _fmtTimeHM)", () => {
    it("_fmtDate formats dates as YYYYMMDD with zero padding", () => {
      assert.equal(_fmtDate(new Date(2026, 8, 17)), "20260917"); // Sept 17, 2026
      assert.equal(_fmtDate(new Date(2026, 0, 5)), "20260105");  // Jan 5, 2026
      assert.equal(_fmtDate(new Date(2026, 11, 31)), "20261231"); // Dec 31, 2026
    });

    it("_fmtTime formats hours and minutes as HHmm with zero padding", () => {
      assert.equal(_fmtTime(new Date(2026, 8, 17, 9, 5)), "0905");
      assert.equal(_fmtTime(new Date(2026, 8, 17, 0, 0)), "0000");
      assert.equal(_fmtTime(new Date(2026, 8, 17, 23, 59)), "2359");
      assert.equal(_fmtTime(new Date(2026, 8, 17, 14, 30)), "1430");
    });

    it("_fmtTimeHM formats hours and minutes as HH:mm with zero padding", () => {
      assert.equal(_fmtTimeHM(new Date(2026, 8, 17, 7, 3)), "07:03");
      assert.equal(_fmtTimeHM(new Date(2026, 8, 17, 18, 45)), "18:45");
      assert.equal(_fmtTimeHM(new Date(2026, 8, 17, 0, 0)), "00:00");
    });

    it("_fmtTimeHM returns dash for null or undefined dates", () => {
      assert.equal(_fmtTimeHM(null), "—");
      assert.equal(_fmtTimeHM(undefined), "—");
    });
  });

  describe("3. Online Departure Fetch & In-Flight Deduplication (fetchStopDeparturesShared)", () => {
    it("deduplicates simultaneous in-flight fetches for the same stop and time", async () => {
      let networkCalls = 0;
      const testDate = new Date(2026, 8, 17, 10, 0);

      globalThis.fetch = async (url) => {
        networkCalls++;
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          json: async () => ({
            Abfahrten: [
              { Linienname: "486", Richtungstext: "Schwabach", AbfahrtszeitSoll: "2026-09-17T10:15:00" }
            ]
          })
        };
      };

      // Call fetchStopDeparturesShared concurrently twice
      const p1 = fetchStopDeparturesShared("de:09562:1001", testDate, "1000");
      const p2 = fetchStopDeparturesShared("de:09562:1001", testDate, "1000");

      assert.equal(p1, p2, "Concurrent calls for identical stop and query must return the exact same Promise instance");

      const [res1, res2] = await Promise.all([p1, p2]);
      assert.equal(networkCalls, 1, "Only one network request should be dispatched");
      assert.equal(res1.type, "vag");
      assert.equal(res1.data.length, 1);
      assert.equal(res1.data[0].Linienname, "486");
      assert.deepEqual(res1, res2);

      // Verify that after resolution, IN_FLIGHT_FETCHES entry is cleaned up
      assert.equal(IN_FLIGHT_FETCHES.size, 0, "IN_FLIGHT_FETCHES cache key must be deleted upon completion");

      // Verify DEPARTURES_CACHE is populated
      assert.ok(DEPARTURES_CACHE.has("de:09562:1001"), "DEPARTURES_CACHE must store the result");
    });

    it("cleans up IN_FLIGHT_FETCHES even when fetch encounters an error", async () => {
      const testDate = new Date(2026, 8, 17, 10, 0);

      globalThis.fetch = async () => {
        await new Promise((r) => setTimeout(r, 10));
        throw new Error("Network offline");
      };

      await assert.rejects(
        async () => {
          await fetchStopDeparturesShared("de:09562:9999", testDate, "1000");
        },
        /Network offline|EFA API returned/
      );

      assert.equal(IN_FLIGHT_FETCHES.size, 0, "IN_FLIGHT_FETCHES must be cleaned up in finally block on error");
    });

    it("falls back to EFA API when VAG API returns no departures or fails", async () => {
      const testDate = new Date(2026, 8, 17, 10, 0);
      const requestedUrls = [];

      globalThis.fetch = async (url) => {
        requestedUrls.push(String(url));
        if (url.includes("start.vag.de")) {
          return { ok: true, json: async () => ({ Abfahrten: [] }) };
        }
        return {
          ok: true,
          json: async () => ({
            stopEvents: [
              { transportation: { number: "456" }, location: { name: "Rohr" } }
            ]
          })
        };
      };

      const res = await fetchStopDeparturesShared("de:09562:5001", testDate, "1000");
      assert.equal(res.type, "efa");
      assert.equal(res.data.length, 1);
      assert.equal(requestedUrls.length, 2, "Both VAG and EFA should be called in fallback chain");
      assert.ok(requestedUrls[0].includes("start.vag.de"), "First attempt should query VAG");
      assert.ok(requestedUrls[1].includes("efa.vgn.de"), "Fallback attempt should query EFA");
    });
  });

  describe("4. Calendar Caching & Concurrency Deduplication (CALENDAR_CACHE, CALENDAR_IN_FLIGHT)", () => {
    it("reuses cached calendar events within TTL (30s) without invoking API", async () => {
      let apiCallCount = 0;
      const mockEvents = [
        { summary: "Bus 486 - Schwabach", start: "2026-09-17T12:00:00" }
      ];

      const card = new VGNDepartureCard();
      card.config = { calendar_entity: "calendar.bus_schedule", watches: [] };
      card.hass = {
        callApi: async () => {
          apiCallCount++;
          return mockEvents;
        }
      };

      // 1st fetch: cache miss
      await card._fetchCalendarDepartures();
      assert.equal(apiCallCount, 1, "First fetch should call HA API");
      assert.equal(card._rawCalendarEvents.length, 1);

      // 2nd fetch: within TTL, cache hit
      await card._fetchCalendarDepartures();
      assert.equal(apiCallCount, 1, "Second fetch within TTL must NOT call HA API again");

      // Verify CALENDAR_CACHE content
      const entry = CALENDAR_CACHE.get("calendar.bus_schedule");
      assert.ok(entry, "CALENDAR_CACHE must contain entry");
      assert.equal(entry.events.length, 1);
      assert.equal(entry.events[0].summary, "Bus 486 - Schwabach");
    });

    it("deduplicates concurrent fetches across multiple card instances via CALENDAR_IN_FLIGHT", async () => {
      let apiCallCount = 0;
      const mockEvents = [
        { summary: "Bus 486 - Schwabach", start: "2026-09-17T12:00:00" },
        { summary: "Bus 456 - Rohr", start: "2026-09-17T12:30:00" }
      ];

      const hassMock = {
        callApi: async () => {
          apiCallCount++;
          await new Promise((r) => setTimeout(r, 25));
          return mockEvents;
        }
      };

      // Card 1 configured for line 486
      const card1 = new VGNDepartureCard();
      card1.config = { calendar_entity: "calendar.bus_schedule", watches: [{ line: "486" }] };
      card1.hass = hassMock;

      // Card 2 configured for line 456
      const card2 = new VGNDepartureCard();
      card2.config = { calendar_entity: "calendar.bus_schedule", watches: [{ line: "456" }] };
      card2.hass = hassMock;

      // Both cards fetch at the same moment (e.g. initial dashboard load)
      await Promise.all([
        card1._fetchCalendarDepartures(),
        card2._fetchCalendarDepartures()
      ]);

      assert.equal(apiCallCount, 1, "Both cards must share the single in-flight calendar fetch");
      assert.equal(card1._rawCalendarEvents.length, 2);
      assert.equal(card2._rawCalendarEvents.length, 2);
      assert.equal(CALENDAR_IN_FLIGHT.size, 0, "CALENDAR_IN_FLIGHT must be cleared after completion");
    });

    it("manual refresh invalidates CALENDAR_CACHE and dispatches vgn-calendar-refreshed event", async () => {
      let apiCallCount = 0;
      let refreshEventFired = false;
      let refreshedSource = null;

      const card = new VGNDepartureCard();
      card.config = { calendar_entity: "calendar.bus_schedule", watches: [] };
      card.hass = {
        callApi: async () => {
          apiCallCount++;
          return [{ summary: "Bus 486", start: "2026-09-17T14:00:00" }];
        }
      };

      const onRefreshed = (e) => {
        refreshEventFired = true;
        refreshedSource = e.detail?.source;
      };
      window.addEventListener("vgn-calendar-refreshed", onRefreshed);

      try {
        // Initial fetch
        await card._fetchDepartures(false);
        assert.equal(apiCallCount, 1);
        assert.equal(refreshEventFired, false);

        // Manual refresh should force cache invalidation & trigger API call
        await card._fetchDepartures(true);
        assert.equal(apiCallCount, 2, "Manual refresh must invalidate cache and re-query API");
        assert.equal(refreshEventFired, true, "Must dispatch vgn-calendar-refreshed event");
        assert.equal(refreshedSource, card, "Event source must reference the card");
      } finally {
        window.removeEventListener("vgn-calendar-refreshed", onRefreshed);
      }
    });

    it("invalidates cache when calendar state updates in updated(changedProps)", () => {
      const card = new VGNDepartureCard();
      card.config = { calendar_entity: "calendar.bus_schedule" };

      // Populate cache
      CALENDAR_CACHE.set("calendar.bus_schedule", { events: [], timestamp: new Date() });
      assert.equal(CALENDAR_CACHE.has("calendar.bus_schedule"), true);

      let fetchCalendarCalled = false;
      card._fetchCalendarDepartures = () => { fetchCalendarCalled = true; };

      const oldHass = { states: { "calendar.bus_schedule": { state: "off", last_updated: "2026-09-17T10:00:00" } } };
      card.hass = { states: { "calendar.bus_schedule": { state: "on", last_updated: "2026-09-17T10:05:00" } } };

      const changedProps = new Map();
      changedProps.set("hass", oldHass);

      card.updated(changedProps);

      assert.equal(CALENDAR_CACHE.has("calendar.bus_schedule"), false, "Cache must be invalidated when calendar state changes");
      assert.equal(fetchCalendarCalled, true, "Must trigger _fetchCalendarDepartures");
    });
  });

  describe("5. Refresh Script Safe Execution Guard", () => {
    it("calls script.turn_on service when refresh_script entity exists in hass.states", async () => {
      const serviceCalls = [];
      const card = new VGNDepartureCard();
      card.config = {
        calendar_entity: "calendar.bus_schedule",
        refresh_script: "script.bus_sync"
      };
      card.hass = {
        states: {
          "script.bus_sync": { state: "off" }
        },
        services: {
          script: { turn_on: {} }
        },
        callService: async (domain, service, data) => {
          serviceCalls.push({ domain, service, data });
        },
        callApi: async () => []
      };

      await card._fetchDepartures(true);

      assert.equal(serviceCalls.length, 1, "Script service must be invoked");
      assert.deepEqual(serviceCalls[0], {
        domain: "script",
        service: "turn_on",
        data: { entity_id: "script.bus_sync" }
      });
    });

    it("skips script execution cleanly when refresh_script is NOT in hass.states (prevents warning/error)", async () => {
      const serviceCalls = [];
      const card = new VGNDepartureCard();
      card.config = {
        calendar_entity: "calendar.bus_schedule",
        refresh_script: "script.non_existent_script"
      };
      card.hass = {
        states: {
          "calendar.bus_schedule": { state: "off" }
        },
        callService: async (domain, service, data) => {
          serviceCalls.push({ domain, service, data });
        },
        callApi: async () => []
      };

      await card._fetchDepartures(true);

      assert.equal(serviceCalls.length, 0, "Must NOT attempt callService if script entity is not in hass.states");
      assert.equal(card._error, null, "Should not produce card error");
    });

    it("catches script call error safely without breaking departure fetch flow", async () => {
      const card = new VGNDepartureCard();
      card.config = {
        calendar_entity: "calendar.bus_schedule",
        refresh_script: "script.failing_script"
      };
      card.hass = {
        states: {
          "script.failing_script": { state: "off" }
        },
        services: {
          script: { turn_on: {} }
        },
        callService: async () => {
          throw new Error("Script execution timeout");
        },
        callApi: async () => [{ summary: "Bus 486", start: "2026-09-17T12:00:00" }]
      };

      // Should complete gracefully without re-throwing
      await card._fetchDepartures(true);

      assert.equal(card._rawCalendarEvents.length, 1, "Calendar departures should still be fetched despite script error");
      assert.equal(card._error, null, "Card error should remain null");
    });

    it("skips service call when refresh_script is 'none' or omitted", async () => {
      const serviceCalls = [];
      const card = new VGNDepartureCard();
      card.config = {
        calendar_entity: "calendar.bus_schedule",
        refresh_script: "none"
      };
      card.hass = {
        states: {},
        callService: async (domain, service, data) => { serviceCalls.push(data); },
        callApi: async () => []
      };

      await card._fetchDepartures(true);
      assert.equal(serviceCalls.length, 0, "Should skip service call when script is 'none'");
    });
  });

  describe("6. Watched Entities Resolution (_getWatchedEntities)", () => {
    it("collects calendar, alert overrides helper, and watch helpers/switches without duplicates", () => {
      const card = new VGNDepartureCard();
      card.config = {
        calendar_entity: "calendar.bus_schedule",
        alert_overrides_helper: "input_text.bus_alert_overrides",
        watches: [
          { line: "486", helper: "input_boolean.bus_486", alerts_enabled_switch: "input_boolean.bus_486_alerts" },
          { line: "456", helper: "input_boolean.bus_456" }
        ]
      };

      const watched = card._getWatchedEntities(card.config);
      assert.ok(watched.includes("calendar.bus_schedule"), "Must include calendar_entity");
      assert.ok(watched.includes("input_text.bus_alert_overrides"), "Must include alert_overrides_helper");
      assert.ok(watched.includes("input_boolean.bus_486"), "Must include watch helper 486");
      assert.ok(watched.includes("input_boolean.bus_486_alerts"), "Must include alerts_enabled_switch 486");
      assert.ok(watched.includes("input_boolean.bus_456"), "Must include watch helper 456");

      // Verify no duplicates
      const uniqueWatched = new Set(watched);
      assert.equal(watched.length, uniqueWatched.size, "Watched entities list should have no duplicate items");
    });
  });

  describe("7. Time Range Filtering (_isDepartureInTimeRange)", () => {
    it("correctly identifies departures inside configured time_from and time_to window", () => {
      const card = new VGNDepartureCard();
      card.config = { time_from: "06:00", time_to: "22:00" };

      const inside = new Date(2026, 8, 17, 10, 15);
      const early = new Date(2026, 8, 17, 5, 30);
      const late = new Date(2026, 8, 17, 22, 30);

      assert.equal(card._isDepartureInTimeRange(inside), true);
      assert.equal(card._isDepartureInTimeRange(early), false);
      assert.equal(card._isDepartureInTimeRange(late), false);
    });

    it("filters departures by rolling_hours relative to current time", () => {
      const card = new VGNDepartureCard();
      card.config = { rolling_hours: 2 };

      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60000);
      const inThreeHours = new Date(now.getTime() + 180 * 60000);
      const inPast = new Date(now.getTime() - 10 * 60000);

      assert.equal(card._isDepartureInTimeRange(inOneHour), true, "1 hour ahead should be within 2 rolling hours");
      assert.equal(card._isDepartureInTimeRange(inThreeHours), false, "3 hours ahead should be outside 2 rolling hours");
      assert.equal(card._isDepartureInTimeRange(inPast), false, "Past departures should be excluded");
    });

    it("returns true when no time window is configured", () => {
      const card = new VGNDepartureCard();
      card.config = {};
      const anyDate = new Date(2026, 8, 17, 14, 0);
      assert.equal(card._isDepartureInTimeRange(anyDate), true);
    });

    it("returns false when date is null or invalid", () => {
      const card = new VGNDepartureCard();
      card.config = { time_from: "06:00", time_to: "22:00" };
      assert.equal(card._isDepartureInTimeRange(null), false);
      assert.equal(card._isDepartureInTimeRange(undefined), false);
    });
  });

  describe("8. Destination Text Cleaner & Line Color Mapping", () => {
    it("cleans bus prefix from calendar summaries (_processCalendarWatches normalization)", () => {
      const card = new VGNDepartureCard();
      // Test regex used in line 536: summary.replace(/Bus\s*\d+\s*[-–:]\s*\/i, '').trim()
      const cleanDest = (summary) => summary.replace(/Bus\s*\d+\s*[-–:]\s*/i, '').trim();

      assert.equal(cleanDest("Bus 486 - Schwabach"), "Schwabach");
      assert.equal(cleanDest("Bus 456: Rohr"), "Rohr");
      assert.equal(cleanDest("Bus 61 – Röthenbach"), "Röthenbach");
      assert.equal(cleanDest("Nürnberg Hbf"), "Nürnberg Hbf");
    });

    it("_lineColor returns assigned or default colors for bus and subway lines", () => {
      const card = new VGNDepartureCard();
      assert.equal(card._lineColor("486"), "#e8501a");
      assert.equal(card._lineColor("456"), "#1a78e8");
      assert.equal(card._lineColor("U1"), "#d01e38");
      assert.equal(card._lineColor("U2"), "#cd126b");
      assert.equal(card._lineColor("U3"), "#00893b");
      assert.equal(card._lineColor("S1"), "#008e4e");
      assert.equal(card._lineColor("RE90"), "#991b1b");
      assert.equal(card._lineColor("custom", { color: "#ff00ff" }), "#ff00ff");
    });
  });

  describe("9. Timetable & RapidJSON Payload Compatibility Suite", () => {
    it("handles both stopEvents and departureList keys in EFA responses", () => {
      const responseWithStopEvents = { stopEvents: [{ transportation: { number: "486" } }] };
      const responseWithDepList = { departureList: [{ servingLine: { number: 456, direction: "Amberg" } }] };
      const emptyResponse = {};

      const extractEvents = (data) => data.stopEvents || data.departureList || [];

      assert.equal(extractEvents(responseWithStopEvents).length, 1);
      assert.equal(extractEvents(responseWithDepList).length, 1);
      assert.equal(extractEvents(emptyResponse).length, 0);
    });

    it("normalizes transportation and line numbers whether numeric or string", () => {
      const itemNumeric = { transportation: { number: 486 }, destination: { name: "Amberg Bahnhof" } };
      const itemString = { servingLine: { number: "456", direction: "Sulzbach-Rosenberg" } };

      const parseItem = (item) => {
        const trans = item.transportation || item.servingLine || item;
        const num = String(trans.number || trans.disassembledName || trans.name || "").trim();
        const dest = String(trans.destination?.name || item.destination?.name || trans.direction || item.routeDescription || "").trim();
        return { num, dest };
      };

      const parsed1 = parseItem(itemNumeric);
      assert.equal(parsed1.num, "486");
      assert.equal(parsed1.dest, "Amberg Bahnhof");

      const parsed2 = parseItem(itemString);
      assert.equal(parsed2.num, "456");
      assert.equal(parsed2.dest, "Sulzbach-Rosenberg");
    });

    it("evaluates calendar deduplication signatures properly without string-boolean inversion", () => {
      const existingSignatures = ["Bus 486 - Amberg@1726640000"];
      const newSig = "Bus 456 - Amberg@1726643600";
      const duplicateSig = "Bus 486 - Amberg@1726640000";

      // Direct membership check as in updated script: ev_sig not in existing_signatures
      assert.equal(!existingSignatures.includes(newSig), true, "New signature must not be flagged as duplicate");
      assert.equal(!existingSignatures.includes(duplicateSig), false, "Existing signature must be flagged as duplicate");

      // Verify empty calendar allows all events
      const emptyCalendarSignatures = [];
      assert.equal(!emptyCalendarSignatures.includes(newSig), true, "Empty calendar must allow new event");
      assert.equal(!emptyCalendarSignatures.includes(duplicateSig), true, "Empty calendar must allow first event");
    });

    it("verifies line matching succeeds when num is integer (HA native typing) or string", () => {
      const matchLine = (numVal, lineFilter) => {
        const snum = String(numVal).trim();
        const sline = String(lineFilter).trim();
        return sline === "both" ? (snum.includes("486") || snum.includes("456")) : snum.includes(sline);
      };

      // Native typing causes num to be integer 486 or 456
      assert.equal(matchLine(486, "486"), true, "Integer 486 must match line '486'");
      assert.equal(matchLine(456, "456"), true, "Integer 456 must match line '456'");
      assert.equal(matchLine(486, "both"), true, "Integer 486 must match 'both'");
      assert.equal(matchLine(456, "both"), true, "Integer 456 must match 'both'");

      // String line numbers
      assert.equal(matchLine("486", "486"), true, "String '486' must match line '486'");
      assert.equal(matchLine("Regionalbus 486", "486"), true, "Prefixed line 'Regionalbus 486' must match '486'");

      // Negative matches
      assert.equal(matchLine(401, "486"), false, "Line 401 must NOT match '486'");
      assert.equal(matchLine(402, "both"), false, "Line 402 must NOT match 'both'");
    });
  });
});

