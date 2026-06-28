---
trigger: always_on
---

Guidelines in CONTRIBUTING.md must be followed.
README.md and the corresponding documentation page in the docs/ directory must be updated for all added features or settings.
CHANGELOG.md must always be updated to document the changes under the correct version header.
Avoid deprecated/unsupported Home Assistant UI controls. Specifically, do NOT use `<ha-textfield>` (use `<ha-input>` instead) and do NOT use `<mwc-list-item>` (use `<ha-list-item>` instead).