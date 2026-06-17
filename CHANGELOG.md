# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
