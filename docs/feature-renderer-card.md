# 🧱 Dynamic Feature Renderer & Custom Card Features

The `feature-renderer-card` dynamically resolves and renders standard or custom Home Assistant card features inside parent host cards (such as the **Universal Select Card**, **Multi Property Card**, and **Multi State Card**).

By loading the centralized `feature-renderer-card-loader.js` resource, you gain access to a collection of helper custom features designed to enrich your button layouts.

---

## ⚙️ Core Renderer Option

When embedding features in a parent card, they are defined inside a `features` array block. Each feature element has a `type` identifying the feature, and can optionally define a `condition` string (a JavaScript expression evaluated to determine if the feature is visible).

---

## 🎨 Available Custom Features

Here is the reference schema and parameter configuration options for each custom card feature.

### 1. Timer Card Feature (`custom:timer-card-feature`)
Renders a real-time, tick-by-tick running countdown indicator. Tapping the timer will pause or resume (start) the underlying Home Assistant `timer.*` entity.

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:timer-card-feature`. |
| `entity` | string | No | Parent Entity | Optional timer entity ID override (e.g. `timer.laundry_timer`). |

---

### 2. Constant Text Feature (`custom:constant-text-feature`)
Renders a static text string or label inside button containers or grid slots.

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:constant-text-feature`. |
| `text` | string | **Yes** | — | The static text string to display. |
| `font_size` | string | No | — | CSS font size parameter (e.g., `12px` or `0.85rem`). |
| `font_weight`| string | No | `normal` | Text thickness weight class. Supported values: `normal`, `bold`. |
| `text_align` | string | No | `center` | Text alignment inside its slot. Supported values: `left`, `center`, `right`. |

---

### 3. State Value Feature (`custom:state-value-feature`)
Renders the localized main state value of the parent entity or an overridden entity.

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:state-value-feature`. |
| `entity` | string | No | Parent Entity | Optional entity ID override to read the state value from. |
| `prefix` | string | No | — | Text printed immediately before the state value. |
| `suffix` | string | No | — | Text printed immediately after the state value. |

---

### 4. Attribute Value Feature (`custom:attribute-value-feature`)
Renders a specific subproperty (attribute) of the parent entity or an overridden entity.

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:attribute-value-feature`. |
| `attribute` | string | **Yes** | — | The attribute key name to fetch (e.g. `temperature` or `brightness`). |
| `entity` | string | No | Parent Entity | Optional entity ID override to read the attribute from. |
| `prefix` | string | No | — | Text printed before the attribute value. |
| `suffix` | string | No | — | Text printed after the attribute value. |

---

### 5. Image Card Feature (`custom:image-card-feature`)
Renders static images, entity avatars (`entity_picture`), or camera snapshot feeds inside button grid slots.

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:image-card-feature`. |
| `image_url` | string | No* | — | URL path to the static image file (e.g., `/local/icons/stove.png`). |
| `use_entity_picture`| boolean | No* | `false` | Pulls the active `entity_picture` avatar attribute from the entity state. |
| `clip_shape` | string | No | `square` | Outer clipping shape. Supported values: `circle`, `square`. |
| `image_fit` | string | No | `contain` | CSS object-fit layout style. Supported values: `contain`, `cover`, `fill`. |
| `width` | string | No | — | Width dimensions (e.g., `40px`). |
| `height` | string | No | — | Height dimensions (e.g., `40px`). |

*\*Note: Either `image_url` must be defined or `use_entity_picture` must be set to `true`.*

---

### 6. Icon Card Feature (`custom:icon-card-feature`)
Renders a customizable, state-mapped, threshold-driven, or expression-driven icon with options for custom sizing, colors, and animations.

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:icon-card-feature`. |
| `icon` | string | No | Fallback | Default material design icon name (e.g. `mdi:fan`). |
| `icon_color` | string | No | — | Default icon color CSS style. |
| `icon_size` | string | No | — | Sizing layout dimensions (e.g. `24px`). |
| `animation` | string | No | `none` | Default animation. Supported: `spinning`, `pulsing`, `flash`, `bounce`, `shake`, `float`, `none`, `blink`. |
| `icon_expression`| string | No | — | JavaScript expression evaluated to resolve the active icon string dynamically. See [JS Expressions for Icons](#js-expressions-for-icons). |
| `color_expression`| string | No | — | JavaScript expression evaluated to resolve the active color dynamically. |
| `animation_expression`| string | No | — | JavaScript expression evaluated to resolve the active animation name dynamically. |

#### JS Expressions for Icons

When using expression parameters (`icon_expression`, `color_expression`, `animation_expression`), the string is evaluated as a JavaScript expression on every state update:
* **Context variables** available inside the evaluation scope:
  * `hass`: The global Home Assistant object.
  * `entity`: The parent entity's state object.
  * `state`: Short-hand for `entity.state`.
  * `attributes`: Short-hand for `entity.attributes`.
  * `color`: The inherited color defined by the badge/parent button configuration.
* *Example:* `color_expression: "state === 'on' ? 'var(--warning-color)' : 'var(--disabled-text-color)'"`

---

## 💡 YAML Configuration Example

```yaml
type: custom:multi-state-card
entities:
  - entity: climate.living_room
    features:
      - type: "custom:icon-card-feature"
        icon_size: "28px"
        icon_expression: "state === 'heat' ? 'mdi:radiator' : 'mdi:radiator-off'"
        color_expression: "state === 'heat' ? 'var(--error-color)' : 'var(--disabled-text-color)'"
        animation_expression: "state === 'heat' ? 'pulsing' : 'none'"
      - type: "custom:attribute-value-feature"
        attribute: current_temperature
        suffix: "°C"
```
