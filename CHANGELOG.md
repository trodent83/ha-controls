# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
