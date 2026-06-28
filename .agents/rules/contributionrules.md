---
trigger: always_on
---

Guidelines in CONTRIBUTING.md must be followed.
README.md and the corresponding documentation page in the docs/ directory must be updated for all added features or settings.
CHANGELOG.md must always be updated to document the changes under the correct version header.
Avoid deprecated/unsupported Home Assistant UI controls. Specifically, do NOT use `<ha-textfield>` (use `<ha-input>` instead) and do NOT use `<mwc-list-item>` (use `<ha-list-item>` instead).
Always follow SemVer / .NET style versioning (`Major.Minor.Patch/Bug`) for version increments: Major is for breaking changes, Minor is for new features, and Patch/Bug is for bug fixes (e.g. 1.3.9 to 1.3.10, not 1.4.0).