# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.3.0] - 2026-06-28

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
  - Bumped loader to version `1.3.12` to force cache-busting.

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
