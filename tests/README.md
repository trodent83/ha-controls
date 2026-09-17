# 🧪 Automated Testing

This directory contains automated unit, integration, and regression test suites for custom Home Assistant Lovelace cards in this repository.

The test runner utilizes Node's built-in test runner (`node:test` and `node:assert/strict`), requiring **no external test libraries or npm installations** (such as Jest, Mocha, or JSDOM).

---

## 🚀 How to Run the Tests

### 1. Run All Test Suites

From the repository root (`ha-controls/`):

```bash
node --test tests/test_task_list_card.js tests/test_vgn_departure_card.js
```

Or on PowerShell:

```powershell
node --test (Get-ChildItem -Path tests/*.js).FullName
```

If `package.json` is present:

```bash
npm test
```

---

### 2. Run Individual Test Suites

#### Task List Card (`task-list-card`)
Verifies event propagation (single dispatch, no double toggling), hold suppression, `_fetchItems` synchronization, and task/day completion vanishing logic:

```bash
node --test tests/test_task_list_card.js
```

#### VGN Departure Card (`vgn-departure-card`)
Verifies date and time formatting helpers (`_fmtDate`, `_fmtTime`, `_fmtTimeHM`), shared in-flight request deduplication, calendar cache TTL and cross-instance deduplication, safe refresh script execution guards, entity watchers, and time window filters:

```bash
node --test tests/test_vgn_departure_card.js
```

---

## 🧱 Architecture & Conventions

1. **Zero External Dependencies**: All tests run directly on standard Node.js (v18+) without requiring `npm install`.
2. **Browser & DOM Mocking**: Since cards are written as ES modules extending `HAControlBase` / `LitElement`, tests define lightweight global shims for `window`, `document`, `customElements`, and `LitElement` prior to dynamic module import:
   ```javascript
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
     customElements: { get: () => MockLitElement, define: () => {} },
     customCards: []
   });
   globalThis.window = windowTarget;
   globalThis.LitElement = MockLitElement;
   globalThis.customElements = windowTarget.customElements;
   ```
3. **Anti-Regression Checks**: Every card test suite must include static contract tests verifying:
   - Version consistency: `VERSION` declared in `<card>-loader.js` strictly matches the version in `<card>.js` and `<card>-editor.js`.
   - Fallback translation files: `<card>/translations/en.json` exists and parses as valid JSON.
   - Base class contracts: `translationPath` and `translationVersion` getters are implemented.
