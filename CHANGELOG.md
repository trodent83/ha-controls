# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Room Status Card (`custom:room-status-card` v1.0.50)**:
  - Added optional `show_background` boolean configuration flag (`default: false`). Keeps all existing room status cards transparent inline by default so existing views remain completely unchanged.
  - Added glassmorphic background box styling (`background: var(--card-background-color, rgba(255, 255, 255, 0.04))`, border, backdrop blur, box shadow) when `show_background: true` is explicitly configured.
  - Added `_handleTap(ev, entityId)` method and click handlers to status badges and card headers to trigger Home Assistant `more-info` entity detail dialogs on tap.
  - Added `show_background` toggle switch to `room-status-card-editor.js` and `knownKeys`.
  - Bumped `room-status-card-loader.js`, `room-status-card.js`, and `room-status-card-editor.js` to `1.0.50`.

### Added
- **Comprehensive Visual Card Editor Coverage & Version Loader Bumps**:
  - **Radiator Control Card (`custom:radiator-control-card-editor` v1.0.19)**: Added missing `dehumidifier_entity` (switch / fan domain picker) to editor schema, `knownKeys`, and clean config handler. Bumped `radiator-control-card-loader.js` to `1.0.19`.
  - **Calendar List Card (`custom:calendar-list-card-editor` v1.0.28)**: Added missing `show_color_badges` ("Show category color badges") and `show_grouping_headers` ("Show date grouping headers") switches to Appearance tab, and `start_date` to `knownKeys`. Bumped `calendar-list-card-loader.js` to `1.0.28`.
  - **Navigation Bar Card (`custom:navigation-bar-card-editor` v1.0.7)**: Added missing `max_items` (number box) and `show_finished_events` (boolean switch) to navigation item schema grid and clean config handler. Bumped `navigation-bar-card-loader.js` to `1.0.7`.
  - **Calendar Grid Card (`custom:calendar-grid-card-editor` v0.4.59)**: Added missing `rolling_month` (30-day rolling view switch), `month_start` (month starting day input), `day_tap_action`, and `popup_config` to `knownKeys` and settings form. Bumped `calendar-grid-card-loader.js` to `0.4.59`.
  - **Progress Bar Feature (`custom:progress-bar-feature-editor` v0.1.36)**: Added missing `unit` (unit override text input), `show_icon`, `show_label`, and `show_value` boolean switches to feature schema form. Bumped `feature-renderer-card-loader.js` to `0.1.36`.

### Added
- **VGN Departure Card (`custom:vgn-departure-card` v1.6.0 & `custom:vgn-departure-card-editor`)**:
  - Added support for `alerts_enabled_switch` configuration parameter per watch row (e.g. `alerts_enabled_switch: "input_boolean.vgn_bus_486_alerts_enabled"`).
  - Renders an interactive, glassmorphism speaker toggle button (`mdi:volume-high` / `mdi:volume-off`) directly inside the watch row header to enable or mute verbal TTS departure warnings for each bus line.
  - Added `input_boolean` helper dropdown selector for `alerts_enabled_switch` in the visual card editor (`vgn-departure-card-editor.js`).
  - Bumped version in `vgn-departure-card.js`, `vgn-departure-card-editor.js`, and `vgn-departure-card-loader.js` to `1.6.0`.

- **New Custom Feature Module: Progress Bar Feature (`custom:progress-bar-feature`)**:
  - Created first-class custom feature module `progress-bar-feature.js`, `progress-bar-feature.css`, and `progress-bar-feature-editor.js` under `ha-controls/feature-renderer-card/`.
  - Supports nesting inside `multi-state-card`, `multi-property-card`, `room-status-card`, or native Tile cards via `features: [{ type: "custom:progress-bar-feature" }]`.
  - Renders a sleek full-width progress bar track (`.progress-bar-track`) with animated fill (`.progress-bar-fill`), icon, title label, and live numeric value display (`.progress-value`).
  - Supports `min`, `max`, `reverse`, custom icons, threshold coloring/animations, and conditional visibility expressions.
  - Registered in `feature-renderer-card-loader.js` (bumped `VERSION` to `0.1.35`).

- **Modern GUI Styling & System Defaults**:
  - **Tactile Touch Feedback**: Integrated hardware-accelerated `transform: scale(0.96)` scaling with `will-change: transform` on active button tap states for `multi-state-card`, `universal-select-card`, and `vacuum-select-card`.
  - **Micro Glass Borders**: Replaced heavy drop shadows with subtle 1px translucent micro-borders (`border: 1px solid rgba(255, 255, 255, 0.08)`) across custom card containers (`multi-state-card`, `universal-select-card`, `vacuum-select-card`).
  - **Rounded Pill Status Badges**: Added `border-radius: 9999px` soft alpha background badges (`background: rgba(255, 255, 255, 0.05)`) to `room-status-card` indicators.
  - **Smart Control System Defaults**: Baked fallback property definitions into custom controls, allowing card templates to omit repetitive default configurations (`show_header`, `show_icon`, padding, border radii).
  - Bumped version loader strings in `multi-state-card-loader.js` (`0.1.38`), `feature-renderer-card-loader.js` (`0.1.34`), `universal-select-card-loader.js` (`1.0.38`), `vacuum-select-card-loader.js` (`1.0.28`), and `room-status-card-loader.js` (`1.0.48`).

### Fixed
- **Weather Grid Card (`weather-grid-card`)**:
  - **UV Index & Parameter Fallback Resolution**: Added parameter key fallbacks for `uv_index` (`day.uv_index`, `day.uv`, `stateObj.attributes.uv_index`, `stateObj.attributes.uv`, `stateObj.attributes.uv_index_max`) and automatic fallback to standalone HA UV sensors (`sensor.uv_index`, `sensor.current_uv_index`, `sensor.uv`). Added attribute fallbacks for `precipitation`, `precipitation_probability`, `humidity`, `pressure`, and `wind_speed`.
  - **Hourly Dialog Runtime Exception Fix**: Fixed `this._getConditionIcon` and `this._getConditionColor` scoping bug in `WeatherGridCardDialog` that caused runtime `TypeError` crashes when rendering the hourly timeline.
  - **Summary Mode Next Days Detail & Instant Load**: Enhanced summary mode (`mode: summary`) to render High / Low temperature ranges (e.g. `24° / 14°`) and rain probability percentages (e.g. `40%`). Added immediate initial attribute population from `stateObj.attributes.forecast` in `_subscribeForecasts()` for instant rendering without waiting on WebSocket responses. Respected `max_days` configuration parameter in summary mode.
  - Bumped `VERSION` string to `1.2.0` in `weather-grid-card-loader.js`.

- **Feature Renderer Card (`feature-renderer-card`)**:
  - **Translation Path Compliance**: Implemented `translationPath` and `translationVersion` getters in `FeatureRendererCard`, `FeatureRendererEditorCard`, and `FeatureSelector` classes per control rules.
  - Bumped `VERSION` string to `0.1.33` in `feature-renderer-card-loader.js`.

- **Fit Grid Layout Card (`fit-grid-layout`)**:
  - **Transform Reset & Premature Guard Fix**: Fixed a measurement bug in `_calculateScale()` where step 2 temporarily reset `container.style.transform = 'none'` to measure natural content size, but an early return guard check evaluated `true` and returned *before* re-applying the calculated CSS `scale(...)` transform, leaving the container unscaled and causing layout overflow off-screen.
  - **Kiosk Mode Vertical Space Offset Calculation**: Fixed `topOffset` computation when `rect.top === 0` (e.g. wall tablets running non-admin kiosk mode with hidden headers), preventing unnecessary 56px fallback subtractions from available viewport height.
  - **Host Width Fallback**: Enhanced width measurement fallback (`this.clientWidth || rect.width || window.innerWidth`).
  - Bumped `VERSION` string to `1.1.18` in `fit-grid-layout.js` and `fit-grid-layout-loader.js`.

### Added
- **VGN Departure Card (`vgn-departure-card`)**:
  - **Window-Targeted API Querying (`itdTime`)**: Added dynamic time querying. When current local time is earlier than a card's configured `time_from` (e.g. viewing afternoon `13:00–20:00` return window in the morning), the card queries the VGN EFA API with `itdTime = time_from` (`1300`). Prevents API result limits from truncating future window schedules.
  - **Strict Window Bounds Enforcement**: Enforces `[time_from, time_to]` filtering per card. Departures outside a card's configured window are excluded, preventing morning cards from displaying afternoon buses and vice versa.
  - **Gone for the Day Status Differentiation**: Implemented `isGoneForDay` detection. When current local time is past `time_to` and all window departures for today have completed, the card renders `"All departures completed for today"` (`gone_for_day` in `en.json` / `"Alle Abfahrten für heute beendet"` in `de.json`), distinguishing it clearly from `"No departures found"`.
  - **Page Visibility API & Adaptive Polling**: Pauses polling when off-screen and scales poll intervals dynamically.
  - **Configurable `max_departures` & Visual Editor Integration**: Added `max_departures` card parameter (default `10`) and visual editor input control ("Max. Abfahrten"), allowing users to customize the maximum number of departure rows displayed per card.
  - **Moving / Rolling Time Window (`rolling_hours`)**: Added relative moving time window option (`rolling_hours: 3`). When configured, displays all upcoming departures within the next N hours relative to current local time (e.g. next 3 hours), overriding fixed `time_from`/`time_to` constraints. Included `rolling_hours` field in visual card editor and dynamic localized header label (`Next 3h` / `Nächste 3 Std.`).
  - **Multimodal Transport Support (Bus, Tram, U-Bahn, S-Bahn, Regionaltrain)**: Expanded card and VAG/VGN API integrations to support all public transport modes. Added dynamic MDI mode icons (`mdi:subway`, `mdi:train-variant`, `mdi:train`, `mdi:tram`, `mdi:bus`), VGN network color branding for U-Bahn, S-Bahn, Tram, and Regional trains, custom `color` and `icon` overrides, and visual editor transport mode selectors.
  - Bumped version string to `1.5.0` in `vgn-departure-card-loader.js`, `vgn-departure-card.js`, and `vgn-departure-card-editor.js`.
- **HTML Formatting Utility (`utilities/html-parser.js`)**:
  - Added a new safe client-side HTML parser that parses and sanitizes text with formatting tags (e.g., `<b>`, `<i>`, `<u>`, `<br>`) to support styled descriptions.
- **State Value Feature (`state-value-feature`)**:
  - Added support for Javascript-based expressions (`prefix_expression`, `suffix_expression`, `color_expression`, and `animation_expression`) to allow fully dynamic renderings and style assignments.

### Fixed
- **Base Control Class (`ha-control-base.js`)**:
  - Fixed watched entity caching bug in `_getWatchedEntities()`: when `this.stateObj` was assigned after initial card instantiation, components (e.g. `icon-card-feature` and `state-value-feature` inside `multi-state-card`) cached an empty watched entity list (`[]`), causing `shouldUpdate()` to reject reactive state changes until manual browser reload.
  - Added dynamic `this.stateObj.entity_id` validation and automatic cache invalidation in `shouldUpdate()` whenever `stateObj` or `config` properties update.
  - Bumped cache-busting version strings across all control loaders (`multi-state-card`, `feature-renderer-card`, `calendar-grid-card`, `calendar-list-card`, `fit-grid-layout`, `light-control-card`, `multi-property-card`, `navigation-bar-card`, `radiator-control-card`, `room-status-card`, `task-list-card`, `universal-select-card`, `vacuum-map-card`, `vacuum-select-card`, `vgn-departure-card`, `weather-grid-card`).

### Optimized
- **Base Control Class (`ha-control-base.js`)**:
  - Refactored the translation loading system to run inside `willUpdate` instead of `updated`. Cached translation strings are now resolved synchronously *before* rendering, rendering translation text on the very first frame and eliminating a duplicate rendering pass.
  - Implemented Promise sharing/request de-duplication: parallel card instances loading at boot share a single in-progress fetch Promise, avoiding duplicate HTTP requests to translation files during boot storms.
  - Bumped imported version parameter to `?v=0.6.9` in imports of `ha-control-base.js` across all 44 JavaScript control files.
- **Calendar Grid Card (`calendar-grid-card`)**:
  - Guarded `updated()` to only call `_checkAndFetch()` when an actual calendar entity state changes. Previously every hass update (any entity) triggered a debounce timer restart — now only calendar entity changes do.
  - Pre-built a `date → events` Map once per render in `render()` to avoid an O(days × events) scanning loop inside the 35-cell grid map. Events are now looked up in O(1) per cell.
  - Bumped `VERSION` to `0.4.22`.
- **Calendar List Card (`calendar-list-card`)**:
  - Added entity-state comparison guard to `shouldUpdate()` so that hass updates that don't affect any calendar entity are rejected before reaching render.
  - Guarded `updated()` with the same entity comparison pattern, ensuring `_checkAndFetch()` is only triggered on genuine calendar entity changes.
  - Bumped `VERSION` to `1.0.1`.
- **Navigation Bar Card (`navigation-bar-card`)**:
  - Added a synchronous pre-check in `_updateFilteredCounts()` that reads all tracked entity timestamps before entering the async WebSocket loop. If no entity has changed since the last fetch, the async work is skipped entirely.
  - Pre-compiled per-item filter regex patterns in `setConfig()` and removed per-call regex recompilation from both the todo and calendar fetch branches.
  - Bumped `VERSION` to `1.0.2`.
- **Task List Card (`task-list-card`)**:
  - Eliminated the duplicate entity change-detection loop: `shouldUpdate()` now sets a `_hassEntityChanged` flag when it detects a real change; `updated()` reads the flag directly instead of re-scanning all entities.
  - Memoized `_getEntities()` result into `this._entities` during `setConfig()`, removing array reconstruction on every render cycle.
- **Weather Grid Card (`weather-grid-card`)**:
  - Extracted `_getConditionIcon`, `_getConditionColor`, `_getConditionLabel`, and `_getYYYYMMDD` to module-level constants and functions, removing object literal recreation on every call and eliminating complete code duplication between `WeatherGridCard` and `WeatherGridCardDialog`.
  - Cached the popup dialog element reference (`this._dialog`) in `_openDetails()` so that `updated()` no longer queries `document.getElementById` on every hass state change.
  - Bumped `VERSION` to `1.0.1`.
- **Radiator Control Card (`radiator-control-card`)**:
  - Guarded the 1-second timer interval's `requestUpdate()` call: a render is now triggered only when the formatted countdown string changes, not unconditionally every tick.
  - Bumped `VERSION` to `1.0.1`.
- **Threshold Base Class (`ha-control-threshold-base.js`)**:
  - Added a `WeakMap`-based cache for the sorted numeric threshold array in `_getMatchedProperty()`. The array sort is now performed at most once per unique configuration object rather than on every render call.
  - Fixed `ha-control-threshold-base.js?v=0.6.8` import version to `?v=0.6.9` across all 7 files that imported it (`radiator-control-card`, `navigation-bar-card`, `multi-property-card`, and feature renderer cards).

### Changed
- **Fit Grid Layout Card (`fit-grid-layout`)**:
  - Fixed automatic viewport scaling when child controls change size after loading by attaching `ResizeObserver` and `MutationObserver` directly to child cards, item wrappers, and inner Shadow DOM trees.
  - Added capturing event listeners for `iron-resize`, `card-resized`, `ll-rebuild`, `location-changed`, `hass-api-called`, `load`, `transitionend`, and `animationend` events across child controls.
  - Implemented staggered post-update scale recalculations (50ms - 3000ms) to catch asynchronous card data fetches, weather forecasts, task list loads, and image rendering.
  - Refined available viewport height calculation using `getBoundingClientRect().top` to strictly cap available vertical space to the exact visible screen area below headers and navigation bars.
  - Enhanced content height measurement to evaluate physical bottom coordinates of all grid wrappers, child cards, and shadow DOM elements to prevent vertical page scrolling on tablet displays.
  - Bumped the loader version and card version to `1.1.14`.
- **Vacuum Select Card (`vacuum-select-card`)**:
  - Added missing translation keys (`general`, `rooms`, `clean`, `reset`) in `en.json` to resolve console warnings in the card config editor.
  - Bumped loader version to `1.0.23`.
- **Task List Card (`task-list-card`)**:
  - Integrated the safe HTML parser for task descriptions in `task-list-card-item.js` to render formatting tags.
  - Added visual loading overlay during initial task fetches on dashboard/tablet reload, suppressed false "No tasks" state during loading, disabled refresh action button while processing, and safely caught `reload_config_entry` errors on repeated refresh taps.
  - Bumped loader version to `1.0.32`.
- **Calendar List Card (`calendar-list-card`)**:
  - Integrated the safe HTML parser for event descriptions in list dialog popups, row lists, and calendar property features.
  - Bumped loader version to `1.0.25`.
- **Calendar Grid Card (`calendar-grid-card`)**:
  - Integrated the safe HTML parser for event descriptions in grid dialog popups.
  - Bumped loader version to `0.4.56`.
- **State Value Feature (`state-value-feature`)**:
  - Bumped loader version to `0.1.30`.
- **Radiator Control Card (`radiator-control-card`)**:
  - Added watched entity configuration and dynamic property binding for dehumidifier runtime tracking (`dehumidifier_run_time_entity`, `dehumidifier_threshold_entity`).
  - Added conditional rendering: when the card is set to `Dehumidify` mode, the thermostat adjusters and target labels are replaced with a dynamic blue runtime progress bar and text status display.
  - Added visual configuration editor selectors for the runtime and threshold entities, HSL progress bar CSS rules, and English localization for the status display.
  - Fixed state tracking and watched entity list invalidation so external scripts starting dehumidifying trigger GUI re-renders immediately, added active mode fallback when dehumidifier switch turns on, and updated the status text to display current runtime (e.g. `4.5 h`) instead of `4.5 / 6 h`.
  - Bumped loader version to `1.0.16`.

## [1.4.4] - 2026-06-30

### Fixed
- **Vacuum Map Card (`vacuum-map-card`)**:
  - Fixed a merging bug where default room icons and names from the physical vacuum's map state attributes were lost for rooms configured on the dashboard map grid overlays.
  - Bumped loader version to `1.3.17`.

## [1.4.3] - 2026-06-30

### Added
- **Calendar Day Popup Card (`calendar-day-popup-card`)**:
  - Created a dedicated `calendar-day-popup-card` component to render detailed day schedules inside the calendar grid day clicks popup. This isolates the popup list display to avoid layout and style regressions from changes to other lists.
  - Inlined the list row render markup in a single component to simplify resources and registered as a dynamic Custom Card.
  - Fixed a bug where entity filter config objects were discarded during event loading, ensuring regex filters are correctly applied inside the day popup list.
  - Fixed an off-by-one date range fetching error (`max_days`) where query endpoints fetched the following day's events, displaying tomorrow's appointments in today's popup.

### Changed
- **Calendar Grid Card (`calendar-grid-card`)**:
  - Updated the day click handler to dispatch popups with `custom:calendar-day-popup-card` instead of the generic list card.
  - Filtered the list of entities passed to the popup card to respect calendar toggles/disabled states selected in the monthly grid sidebar.
  - Added new localized translation strings for today, tomorrow, yesterday, and due-in calculations to prevent 404 translation requests during clicks.
  - Bumped loader version to `0.4.55`.
- **Calendar List Card (`calendar-list-card`)**:
  - Restored formatting and design parity of `custom:calendar-list-card` with `custom:task-list-card` by applying matching row paddings, margins, sizes, and font-weights.
  - Injected `calendar-list-card-row.css` inside the card's Shadow DOM to compile and apply list-row styles correctly.
  - Corrected the date range bounds calculation (`max_days`) to only query the exact requested number of days.
  - Bumped loader version to `1.0.24`.

## [1.4.2] - 2026-06-29

### Changed
- **All Popup Cards**:
  - Implemented dynamic unscaled dimensions expansion (via `--fit-popup-overlay-width/height` and `--fit-popup-max-width/height` CSS custom properties) to prevent the inner card layout/context from squishing on small displays before scaling.
  - Positioned and scaled the `.dialog-overlay` from `top left` to visual full screen (`100vw/vh`), giving internal flex layouts the maximum virtual viewport width/height to organize texts and grids cleanly.
- **Fit Grid Layout Card (`fit-grid-layout`)**:
  - Dynamically computed and set popup unscaled max-width/max-height and overlay size variables on both host element and `document.documentElement` root.
  - Bumped loader version to `1.1.11`.
- **Weather Grid Card (`weather-grid-card`)**:
  - Reset `.dialog-card` scaling keyframes to transition to `1.0` scale inside the portaled dynamic overlay scale transform.
  - Bumped loader version to `1.1.7`.
- **Calendar Grid Card (`calendar-grid-card`)**:
  - Reset `.dialog-card` scaling keyframes to transition to `1.0` scale inside the portaled dynamic overlay scale transform.
  - Bumped loader version to `0.4.52`.
- **Calendar List Card (`calendar-list-card`)**:
  - Reset `.dialog-card` scaling keyframes to transition to `1.0` scale inside the portaled dynamic overlay scale transform.
  - Bumped loader version to `1.0.22`.

## [1.4.1] - 2026-06-29

### Changed
- **Fit Grid Layout Card (`fit-grid-layout`)**:
  - Propagated computed viewport-fitting dimensions (`--fit-available-width`, `--fit-available-height`) and scale factor (`--fit-layout-scale`) as CSS custom properties globally on `document.documentElement` and `:host`.
  - Updated popup window container styles to scale proportionally using the dynamic layout scale factor (`--fit-layout-scale`), preventing popups from rendering oversized on wall tablets or phone displays.
  - Bumped loader version to `1.1.10`.
- **Weather Grid Card (`weather-grid-card`)**:
  - Refactored daily forecast details dialog into a portal-appended custom web component (`WeatherGridCardDialog`) mounted directly to `document.body` to bypass Lovelace scale transform constraints.
  - Configured weather dialog cards to scale dynamically using the layout's `--fit-layout-scale` variable.
  - Resolved dynamic weather units (temperature, wind speed, precipitation, pressure) from target entity attributes.
  - Optimized websocket lifecycle to skip manual forecast service calls when live forecasts subscriptions are active.
  - Bumped loader version to `1.1.6`.
- **Calendar Grid Card (`calendar-grid-card`)**:
  - Scaled day click details dialog cards dynamically using the layout's `--fit-layout-scale` variable.
  - Bumped loader version to `0.4.51`.
- **Calendar List Card (`calendar-list-card`)**:
  - Scaled event list dialog cards dynamically using the layout's `--fit-layout-scale` variable.
  - Bumped loader version to `1.0.21`.

## [1.4.0] - 2026-06-29

### Added
- **Weather Grid Card (`weather-grid-card`)**:
  - Created a brand new custom weather component supporting summary/grid modes.
  - Implemented summary mode which links directly to `/eg-dashboard/weather-forecast` for clean voice/dashboard navigation.
  - Implemented grid mode which lists daily forecasts and highlights weather condition icons and max/min temperatures.
  - Added support for opening a detailed dialog popup on day cell clicks, resolving apparent temperature ranges, humidity, wind speed, pressure, UV index, and precipitation.
  - Programmed a horizontal scrollable hourly timeline inside the day cell popup.
  - Added severe weather warning alerts via `warning_entity` configuration right at the top of the card.
  - Added support for forecast lengths limitations via `max_days`.

## [1.3.1] - 2026-06-29

### Added
- **Calendar Grid Card (`calendar-grid-card`)**:
  - Implemented clickable day cells to execute tap actions.
  - Added a default `day_tap_action` of type `popup` that dispatches the `show-grid-popup` custom event to open a detailed list popup of events scheduled on the clicked day.
  - Added the `popup_config` configuration parameter, letting users customize the list-card displayed inside day click popups directly from dashboard configurations.
  - Introduced the `month_start: today` configuration parameter to support a rolling monthly view. This aligns the monthly grid starting point to the week of the current date and shows a 5-week (35 days) layout.
  - Styled day cells with custom hover highlights and transition animations for enhanced interaction.
  - Updated the month header text to display spanned month ranges (e.g. "Jun - Aug 2026") when the rolling month view is active.
  - Integrated `homeassistant.update_entity` service triggers into the manual reload action to force remote server updates.
  - Bumped loader to version `0.4.49` to force cache-busting.

- **Calendar List Card (`calendar-list-card`)**:
  - Added support for the `start_date` configuration parameter, allowing dynamic calendar event list queries starting from a custom ISO date string instead of always defaulting to today.
  - Added horizontal borders (`border-bottom`) between sequential rows to serve as visual dividers.
  - Color-coded icons and text for individual property features (time, location, attendees, description, calendar name) with distinct defaults to enhance readability.
  - Made the `show_due_date` check robust against string `'false'` values.
  - Integrated `homeassistant.update_entity` service triggers into the manual reload action to force remote server updates.
  - Bumped loader to version `1.0.19` to force cache-busting.

## [1.3.0] - 2026-06-28

### Changed
- **Radiator Control Card (`radiator-control-card`)**:
  - Replaced the active rotating animation on the Dehumidify mode button with a custom smooth bouncing animation (`bounce`).
  - Replaced the active pulsing animation on the Heating mode button with a slow-blinking opacity animation (`blink-slow`).
  - Bumped loader to version `1.0.13` to force cache-busting.

### Added
- **Vacuum Map Card (`vacuum-map-card`)**:
  - Implemented automatic layout coordinates extraction from Home Assistant map camera entities (`camera.*_map*`), parsing absolute coordinates and mapping them to 0-100% card percentage boundaries.
  - Added support for extracting coordinates directly from the room's geometry `outline` points array attribute as a fallback.
  - Added layout transformation actions (**Flip H**, **Flip V**, and **Rotate 90°** clockwise) in the editor toolbar to instantly align room overlay configurations.
  - Integrated Home Assistant room name entities (`select.*_room_*_name`) to display and dynamically update room names globally directly from the card editor dropdown.
  - Replaced the deprecated `<ha-textfield>` element with standard `<ha-input>` elements in the visual editor configurations repository-wide.
  - Rearranged the coordinates layout grid in the editor panel to a spacious 2-column layout to prevent fields from collapsing.
  - Disabled and visual-dimmed the "Select All" toggle button in edit mode to prevent altering active cleaning queues while editing room coordinates.
  - Removed visual drag-resizing handles from map overlay blocks to simplify placement. Room overlay sizing is configured exclusively via the card editor's numeric text input fields.
  - Added support for configuring L-shaped or custom rooms using multiple layout shape segments (`shapes: [{x, y, w, h}]`) in the YAML settings, shifting all segments in lockstep when the room block is dragged.
  - Implemented a shape management interface inside the room configuration accordion tabs, allowing users to add, edit coordinates (aligned in a spacious 2x2 grid layout), and delete extra shape segments visually.
  - Upgraded the **Auto-Extract** tool to automatically decompose multi-vertex polygon outlines (like L-shapes) from map cameras into multiple grid-checked rectangular segments, saving them directly as extra room shapes.
  - Bumped loader to version `1.3.16` to force cache-busting.

## [1.2.11] - 2026-06-27

### Added
- **Vacuum Map Card (`vacuum-map-card`)**:
  - Implemented visual interactive drag-and-drop dragging (`x`, `y`) and corner handle resizing (`w`, `h`) directly on the live map preview block element.
  - Added a delete handle overlay (close icon) on each room block to remove the room layout visually from the map preview.
  - Built a custom Rooms configuration panel in the GUI editor containing a room addition form, expandable entries accordions for all properties (Label, Icon, Color, Active Animation, coordinates, disabled state), and deletion buttons.
  - Upgraded the card engine to merge state-reported vacuum rooms and custom configuration-defined rooms seamlessly.
  - Bumped loader to version `1.2.0` and cache-busted the elements.

## [1.2.10] - 2026-06-27

### Fixed
- **Fit Grid Layout Card (`fit-grid-layout`)**:
  - Fixed scaling calculation issues and prevented infinite ResizeObserver trigger loops by caching and comparing host element available client dimensions.
  - Dynamically set host element height using the configured dashboard layout height setting, preventing grid content from collapsing.
  - Resolved view layout styling issues inside the shadow DOM by defining a valid `translationPath` to correctly reference `fit-grid-layout.css`.
  - Added support for hyphenated CSS Grid layout keys (`grid-area`, `place-self`, etc.) when parsing `view_layout` parameters.
- **Multi State Card (`multi-state-card`)**:
  - Fixed `fire-dom-event` tap/hold actions by directly dispatching the `"ll-custom"` event from the card element with `bubbles: true` and `composed: true`, ensuring bubbling to view containers.

## [1.2.9] - 2026-06-27

### Added
- **Fit Grid Layout Card (`fit-grid-layout`)**:
  - Implemented dynamic popup overlay support, locking background dashboard interaction and showing custom card/control popups at 1:1 scale under `:host`.
  - Added support for standard Lovelace action triggers (`action: fire-dom-event` intercepting `ll-custom` events) to show/close popups generically.
  - Added nested popup configuration support via `grid_popup` and `group_popup` details supporting custom `heading` labels and `body` card parameters.
  - Built a multi-tab visual configuration editor (`fit-grid-layout-editor.js` and `fit-grid-layout-editor.css`) for Layout, Background, and Popups configuration.
  - Documented popup actions and schemas in `docs/fit-grid-layout.md` and bumped loader to version `1.0.1`.

## [1.2.8] - 2026-06-26

### Added
- **Fit Grid Layout Card (`fit-grid-layout`)**:
  - Created a custom viewport-fitting layout engine that wraps Lovelace grid dashboard structures and auto-scales down content proportionally using CSS transform scaling and a debounced ResizeObserver.
  - Added documentation under `docs/fit-grid-layout.md` and catalog registration in `README.md`.

## [1.2.7] - 2026-06-26

### Added
- **Light Control Card (`light-control-card`)**:
  - Created a custom Lovelace card with glowing icons and horizontal sliders to toggle state and adjust brightness, Kelvin temperature, and RGB/HSL color hue.
  - Added a visual editor (`light-control-card-editor.js` and `light-control-card-editor.css`) allowing dashboard customization of controls visibility.
  - Documented features in [docs/light-control-card.md](docs/light-control-card.md) and registered loaders in [README.md](README.md).

## [1.2.6] - 2026-06-26

### Added
- **Navigation Bar Card (`navigation-bar-card`)**:
  - Created a custom Lovelace navigation card with capsule badges that auto-detects active views, supports dynamic thresholds, and renders counter notification badges.
  - Implemented async counter calculations for `todo` and `calendar` lists, utilizing the same custom exclusion filters, due dates (`max_days`), completed filter (`show_completed`), and max limits (`max_items`) configured in display cards. Resolved threshold rule evaluation mismatches by mapping main todo/calendar rules to evaluate against these filtered values instead of raw entity state counts.
  - Added a rich visual configuration editor (`navigation-bar-card-editor.js` and `navigation-bar-card-editor.css`) allowing dashboard customization of tabs, icons, actions, regex filters, and threshold rules.
  - Added [navigation-bar-card.md](docs/navigation-bar-card.md) documentation and registered it in the main [README.md](README.md).

## [1.2.5] - 2026-06-26

### Changed
- Unified Lovelace dashboard header cards by replacing all `type: heading` cards with `custom:room-status-card` inside `main_view.yaml` and `overview_view.yaml`.
- Integrated battery percentage (for Main Door and Robot Vacuum) and vacuum state inline badges inside the newly unified headers.
- Replaced `custom:vacuum-map-card` with `custom:vacuum-select-card` in the main view dashboard to render a clean, dynamic button grid for selecting cleaning zones.

## [1.2.4] - 2026-06-26

### Fixed
- **Shared Base Class (`HAControlThresholdBase`)**:
  - Fixed a bug in `_getMatchedProperty` where thresholds were pre-filtered by the presence of the requested property. This caused properties to incorrectly fall through and match lower thresholds (e.g. battery icon blinking green all the time because the 0% threshold was the only one specifying `animation: blink`). The method now correctly finds the matching threshold by value first, then resolves the property.
  - Updated the import version query parameter (`?v=0.6.7`) for all cards and feature cards referencing `ha-control-threshold-base.js`.
- **Radiator Control Card (`radiator-control-card`)**:
  - Fixed a bug where target temperature adjustments (using the + and - buttons) failed for radiator climate entities with a target temperature step size of 1.0°C (e.g. Tuya-based oil radiators). The control now dynamically reads the `target_temp_step` attribute from the climate entity to align temperature changes with the device's step size.
  - Added support for automatically turning on the radiator (setting `hvac_mode` to `heat` or the first available active mode) if the device is currently in the `off` state when adjusting target temperature.
  - Added visual and interactive disabled state styling (`pointer-events: none`, `opacity: 0.5`) to target temperature adjusters when the climate entity is in an `unavailable` or `unknown` offline state. In this state, target temperature is displayed as `--`.
  - Added support to deactivate and disable individual mode segmented selector buttons when their respective devices (radiator climate or dehumidifier switch) go offline (`unavailable` or `unknown`), changing the button icon to an offline cloud icon and appending `(Offline)` to the label text.
  - Removed the unused `"Fan"` mode option from the radiator control card, its English localization file, the washroom control helper config, and the module's documentation.
- **Feature Renderer Card (`feature-renderer-card`)**:
  - Fixed a bug in `icon-card-feature` where configuring an icon feature without custom thresholds resulted in `_getMatchedProperty` returning `null`, blocking fallback to configured `icon`, `color`, and `animation` values because of strict `=== undefined` checks. Switched to `== null` checks.
  - Resolved a CSS transition conflict in `icon-card-feature.css` where transition on the `transform` property interfered with and stalled the CSS keyframe `rotating` (and other transform-based) animations on the `<ha-icon>`.
  - Added GPU layers/performance optimization (`will-change: transform`, `translateZ(0)`) to transform-based keyframe animations in `shared-animations.css`, and changed the host `<ha-icon>` display setting to `inline-block` to ensure transforms apply reliably across different browser versions.
  - Overrode `createRenderRoot` to render `FeatureRendererCard` in the light DOM, allowing parent stylesheets (e.g., in `room-status-card` and `multi-state-card`) to correctly style and vertically/horizontally center nested child features using flexbox.
  - Bumped `feature-renderer-card-loader.js` to `0.1.28`, `multi-property-card-loader.js` to `1.0.39`, and `radiator-control-card-loader.js` to `1.0.11`, and bumped internal `icon-card-feature` version to `1.0.2` to bust browser cache.
- **Room Status Card (`room-status-card`)**:
  - Fixed vertical alignment mismatch in room status badges where nested text features were rendered higher than their adjacent icon features. Added `display: inline-flex` and `align-items: center` to both the `<feature-renderer-card>` elements and their nested child feature components (e.g. `<state-value-feature>`) inside `room-status-card.css`.
  - Bumped `room-status-card-loader.js` to `1.0.44` to bust browser cache.
- **Washroom Scripts (`ha-scripts`)**:
  - Updated the start/extend script `radiator_start_or_extend.yaml` and the capping script `radiator_cap_timer.yaml` to include template conditions verifying the state of `input_select.washroom_control` and checking that the target device (`climate.kesser_oil_radiator` for "Heating", or `switch.dehumidifier_power_control` for "Dehumidify") is online (not `unavailable` or `unknown`) before managing the timer.

## [1.2.3] - 2026-06-25

### Fixed
- **Shared Base Class (`HAControlBase`)**:
  - Fixed a critical change-detection bug where custom feature cards (such as `state-value-feature` or `icon-card-feature`) failed to react to state updates if they relied on the parent card's `stateObj` without configuring an explicit `entity` override in their configuration. The base class `shouldUpdate` and `_getWatchedEntities` methods have been upgraded to automatically register and monitor the parent `stateObj.entity_id` when it is provided.
  - Upgraded `shouldUpdate` to immediately clear cached watched entities and return `true` whenever `stateObj` itself changes reference.
  - Added optional and togglable console debug logging inside `shouldUpdate` to trace watched entities and state changes in the browser. Logging can be enabled dynamically via `window.haControlsDebug = true`, appending `?ha_debug` to the URL, or adding `debug: true` to the card YAML config.
- **Feature Renderer Card (`feature-renderer-card`)**:
  - Fixed alignment issues for custom features that display text (`state-value-feature`, `attribute-value-feature`, and `constant-text-feature`) by adding `:host` styles with `display: block` and `width: 100%`. This enables configured `text_align` property settings to correctly apply across their parent container width.
  - Standardized the default text alignment to `'center'` for `state-value-feature` and `attribute-value-feature` (matching `constant-text-feature`) to maintain centered layouts in dashboard columns, status cards, and badges by default without requiring manual YAML configuration changes.
  - Bumped the card loader version to `0.1.18` and other card loaders to propagate cache-busting of the updated base classes.

## [1.2.2] - 2026-06-25

### Fixed
- **Multi State Card (`multi-state-card`)**:
  - Fixed an issue where column buttons (`.btn` and `.multi-state-entity`) did not stretch to 100% width, causing nested features to remain left-aligned inside flex rows.
  - Bumped the card loader version to `0.1.26`.

## [1.2.1] - 2026-06-25

### Fixed
- **Multi State Card (`multi-state-card`)**:
  - Optimized the update lifecycle (`shouldUpdate`) to dynamically discover and track state updates for all entities referenced inside JS expression strings (such as `hass.states['...']`), resolving UI refresh lag.
  - Standardized the layout of nested card features (`icon-card-feature`, `state-value-feature`, etc.) to align center vertically and horizontally by default.
  - Bumped the card loader version to `0.1.25`.

## [1.2.0] - 2026-06-22

### Added
- **Radiator Control Card (`radiator-control-card`)**:
  - Reusable climate control card consolidating thermostat controls, target adjustments, and mode selects.
  - Interactive plus/minus target temperature adjusters.
  - Temperature sensor threshold mapping for room temperature badge coloring.
  - Natively renders active timer countdown ticks every second.
  - Hardware-accelerated blinking effects when climate is actively heating.

## [1.1.0] - 2026-06-20

### Added
- **Vacuum Map Card (`vacuum-map-card`)**:
  - Interactive 2D layout map-based room selector showing rooms defined in vacuum attributes.
  - Positioning and sizing configurations (percentages `x`, `y`, `w`, `h`) to scale cleanly when resized.
  - Support for room-specific custom colors.
  - Active cleaning animations (pulsing, blinking, flashing) matching selected color styles.
  - Optional toggle configuration option `show_names` (default: `true`) to show/hide room name text labels inside the interactive room blocks.
- **Calendar List Card (`calendar-list-card`)**:
  - Chronological vertical list mapping events across multiple Home Assistant calendar entities.
  - Relative remaining day count formatting (e.g., "Today", "Tomorrow", "In 3 days").
  - Advanced query constraints mapping (configurable search depth via `max_days` and maximum output limits via `max_items`).
  - Regular expression patterns filtering supporting case-sensitivity exclusions.
  - Dynamic threshold date text coloring driven by custom comparison operator thresholds.
  - Divider separator configuration supporting day, week, or month grouping boundaries.
  - Seamless child feature rendering via `custom:calendar-property-feature` (extracting time, location, description, or attendees).

## [1.0.4] - 2026-06-17

### Fixed
- **Configuration Cleaning and Default Values Pruning**:
  - Implemented dynamic default-value pruning in visual editor `_cleanConfig()` methods across all 7 custom cards (`calendar-grid-card`, `task-list-card`, `vacuum-select-card`, `universal-select-card`, `room-status-card`, `multi-state-card`, `multi-property-card`).
  - Added an `addIfDiff` helper logic to sanitize and prune configurations containing properties matching their explicit default values, keeping Lovelace dashboard YAML configs minimal and clean.
  - Bumped version numbers on all 7 custom loader files to force browser caching updates.
- **Future Task Completion Blocking**:
  - Fixed timezone and layout mismatch bug in `isFuture` parsing of `Task` objects. Replaced timezone-offset translation calculations with direct UTC-midnight comparison matching the card's row grouping date string (`substring(0, 10)`).
  - Bumped task-list-card loader version to `1.0.22` to reload changes immediately.
- **Universal Import Versioning**:
  - Versioned all remaining unversioned utility/DTO imports to conform with caching guidelines. Added version query strings to `CalendarDataManager` inside `calendar-grid-card.js` and `CalendarEventModel` inside `calendar-data-manager.js`.

## [1.0.3] - 2026-06-17

### Added
- **Calendar Event Detail Dialog & Modular Features**:
  - Replaced inline calendar cell event description expansions with a premium viewport-level glassmorphic modal dialog.
  - Implemented modular, configurable event feature extensions (`time`, `location`, `description`, `attendees`) inside the detail dialog.
  - Enabled clickable location mapping using Google Maps external search queries.
  - Added support for attendee response status indicators (Accepted, Declined, Tentative, Unknown).

### Fixed
- **Task List Future Completion Blocking**:
  - Implemented robust regex-based due date parser for checking if tasks are scheduled in the future, correctly evaluating ISO date-only and ISO datetime strings against the user's local day boundaries.
  - Normalized visual editor configuration toggle validation checking for `block_future_toggles` to handle string-based `"false"` values safely alongside standard booleans.

## [1.0.2] - 2026-06-17

### Added
- **Task List Loading Overlay**:
  - Implemented a premium glassmorphism loading overlay with a centered spinning progress indicator (`mdi:loading`) that overlays the task list container during refresh operations.
- **Calendar Grid Loading Overlay**:
  - Implemented a premium glassmorphism loading overlay with a centered spinning progress indicator (`mdi:loading`) that overlays the calendar grid container during event-fetching operations.

### Fixed
- **Migration of Deprecated UI Components**:
  - Replaced the deprecated `<ha-textfield>` element with `<ha-input>` in HTML templates and CSS stylesheet selectors repository-wide.
  - Replaced the deprecated `<mwc-list-item>` element with `<ha-list-item>` in HTML templates inside select dropdowns to support Web Awesome standards.
- **Task List Loading Issue**:
  - Fixed a race condition where task items were not fetched on the initial load because `hass` was unset when `setConfig` ran, and the first lifecycle update cycle was erroneously skipped. Added an immediate fetch operation in the first update cycle when `oldHass` is undefined.
- **Documentation**:
  - Added a list of standard Home Assistant UI component dependencies to `README.md`.
  - Added a verification guideline to `CONTRIBUTING.md` instructing contributors to verify UI elements support on Home Assistant updates.

## [1.0.1] - 2026-06-17

### Fixed
- **Dropdown Event Handling and Reactive Configuration**:
  - Replaced `@selected` with `@closed` on editor `ha-select` dropdown elements to prevent infinite render/update loops in Home Assistant dashboard editor.
  - Formally typed `_config` as `{ type: Object }` in all custom card editor properties definitions (`task-list-card`, `multi-property-card`, `multi-state-card`, `calendar-grid-card`) to resolve reactive binding issues.
  - Restored proper display/alignment styles for due date color rows in the Task List Card visual editor.
  - Added defensive value fallback checks (`rule.days !== undefined` and `rule.color ?? ''`) inside due date colors editor textfields to prevent rendering literal "undefined" or "null" strings when values are not set in the YAML configuration.

## [1.0.0] - 2026-06-17

### Added
- **Dynamic Localization Framework (`ha-control-base.js`)**:
  - Implemented dynamic loading and caching of JSON-based translations.
  - Automatically listens to Home Assistant language changes with fallback to English.
  - Added support for localized validation warning alerts and config sanitation.
- **Cache-Busted Card Loader (`ha-control-loader.js`)**:
  - Implemented module/script dynamically loading with a `VERSION` query string parameter for cache-busting.
- **Calendar Grid Card (`calendar-grid-card`)**:
  - Weekly and monthly calendar grid layouts.
  - Sidebar toggling for active calendars, saving preferences to `localStorage`.
  - Configurable today highlights, custom borders, and layout orientation (horizontal/vertical).
- **Task List Card (`task-list-card`)**:
  - Single or multi-todo entity listing.
  - Tasks grouping by day, week, or month with custom separator lines.
  - "Sweep" feature to clean up completed tasks.
  - Optional restriction to prevent checking off future tasks.
- **Universal Select Card (`universal-select-card`)**:
  - Segmented button option controls for `input_select` entities.
  - Supports custom icons, active/inactive state coloring, and layout rows/columns.
  - Support for custom long-press actions (`call-service`, `navigate`, `url`, `more-info`).
- **Vacuum Select Card (`vacuum-select-card`)**:
  - Dynamic grid-based room selector showing rooms defined in vacuum attributes.
  - Binds room selections to helper input entities as JSON sequences.
  - Respects pre-configured room cleaning sequences.
  - Displays pulses, spins, and highlights on the button of the room currently being cleaned.
- **Room Status Card (`room-status-card`)**:
  - Minimalist room header with configuration rules for status badges (e.g. temp, motion, battery).
  - Customizable color mapping and CSS animations (pulse, blink) driven by numeric thresholds.
- **Multi Property Card (`multi-property-card`)**:
  - Advanced grid mapping multiple entities with custom icons, labels, and status colors.
  - Supports JavaScript evaluations (`eval`) to control element visibility and state-matching dynamically.
- **Multi State Card (`multi-state-card`)**:
  - Fully modular grid layout composed of state buttons, fully configured via child features.
- **Feature Renderer Card & Features (`feature-renderer-card`)**:
  - Unified component for rendering custom card features.
  - **`timer-card-feature`**: Real-time timer countdown overlay with play/pause service controls.
  - **`constant-text-feature`**: Renders custom static strings or labels.
  - **`state-value-feature`**: Formats and renders parent/overridden entity state values with prefix, suffix, and color thresholds.
  - **`attribute-value-feature`**: Formats and renders specific entity attributes with prefix, suffix, and color thresholds.
  - **`image-card-feature`**: Renders static local images, entity pictures, or live camera feeds.
  - **`icon-card-feature`**: Highly customized icon rendering with color mapping, threshold rules, and animated effects.
