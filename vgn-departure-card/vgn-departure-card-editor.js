import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.3.0';

/**
 * VGNDepartureCardEditor
 * Visual config editor for the VGN Departure Card.
 * Allows configuration of stop DHID, time window, poll interval and watch entries.
 *
 * @extends HAControlBase
 */
class VGNDepartureCardEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, config: {} };
  }

  get translationPath() { return "/local/ha-controls/vgn-departure-card/translations"; }
  get translationVersion() { return VERSION; }

  setConfig(config) {
    this.config = config;
  }

  _valueChanged(path, value) {
    if (!this.config) return;
    const newConfig = { ...this.config };

    if (path === 'watches') {
      newConfig.watches = value;
    } else {
      newConfig[path] = value;
    }

    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    }));
  }

  _watchChanged(idx, field, value) {
    const watches = [...(this.config.watches || [])];
    watches[idx] = { ...watches[idx], [field]: value };
    this._valueChanged('watches', watches);
  }

  _addWatch() {
    const watches = [...(this.config.watches || []), {
      line: '',
      direction: '',
      stop_dhid: '',
      helper: '',
      alert_minutes: 10
    }];
    this._valueChanged('watches', watches);
  }

  _removeWatch(idx) {
    const watches = (this.config.watches || []).filter((_, i) => i !== idx);
    this._valueChanged('watches', watches);
  }

  _getInputNumberEntities() {
    if (!this.hass) return [];
    return Object.keys(this.hass.states).filter(id => id.startsWith('input_number.')).sort();
  }

  render() {
    if (!this.config) return html``;
    const watches = this.config.watches || [];
    const inputNumbers = this._getInputNumberEntities();

    return html`
      ${this.renderStyle('vgn-departure-card-editor.css')}

      <div class="vgn-editor">
        <!-- Stop Configuration -->
        <div class="vgn-editor-section">
          <div class="vgn-editor-section-title">
            <ha-icon icon="mdi:map-marker-radius"></ha-icon>
            Haltestelle
          </div>

          <ha-textfield
            label="Haltestellen-DHID (z.B. de:09371:18001)"
            .value="${this.config.stop_dhid || ''}"
            @change="${e => this._valueChanged('stop_dhid', e.target.value)}"
            helper="Globale Haltestellennummer im Format de:XXXXX:XXXXX"
          ></ha-textfield>

          <ha-textfield
            label="Anzeigename der Haltestelle"
            .value="${this.config.stop_name || ''}"
            @change="${e => this._valueChanged('stop_name', e.target.value)}"
          ></ha-textfield>
        </div>

        <!-- Time Window -->
        <div class="vgn-editor-section">
          <div class="vgn-editor-section-title">
            <ha-icon icon="mdi:clock-outline"></ha-icon>
            Überwachungszeitraum
          </div>

          <div class="vgn-editor-row">
            <ha-textfield
              label="Von (HH:MM)"
              .value="${this.config.time_from || '06:00'}"
              @change="${e => this._valueChanged('time_from', e.target.value)}"
              pattern="[0-2][0-9]:[0-5][0-9]"
            ></ha-textfield>

            <ha-textfield
              label="Bis (HH:MM)"
              .value="${this.config.time_to || '08:30'}"
              @change="${e => this._valueChanged('time_to', e.target.value)}"
              pattern="[0-2][0-9]:[0-5][0-9]"
            ></ha-textfield>
          </div>

          <ha-textfield
            label="Wochentage (z.B. tue, wed, thu, fri)"
            .value="${Array.isArray(this.config.days) ? this.config.days.join(', ') : (this.config.days || '')}"
            @change="${e => this._valueChanged('days', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}"
            helper="Kommaseparierte Tage: mon, tue, wed, thu, fri, sat, sun"
          ></ha-textfield>

          <div class="vgn-editor-row">
            <ha-textfield
              label="Abfrageintervall (Sekunden)"
              type="number"
              min="10"
              max="300"
              .value="${String(this.config.poll_interval || 60)}"
              @change="${e => this._valueChanged('poll_interval', parseInt(e.target.value) || 60)}"
            ></ha-textfield>

            <ha-textfield
              label="Max. Abfahrten (z.B. 10)"
              type="number"
              min="1"
              max="30"
              .value="${String(this.config.max_departures || 10)}"
              @change="${e => this._valueChanged('max_departures', parseInt(e.target.value) || 10)}"
              helper="Maximale Anzahl angezeigter Abfahrtszeilen"
            ></ha-textfield>
          </div>
        </div>

        <!-- Watch Entries -->
        <div class="vgn-editor-section">
          <div class="vgn-editor-section-title">
            <ha-icon icon="mdi:bus-multiple"></ha-icon>
            Überwachte Linien
          </div>

          ${watches.map((watch, idx) => html`
            <div class="vgn-watch-editor">
              <div class="vgn-watch-editor-header">
                <div class="vgn-watch-editor-title">Linie ${idx + 1}</div>
                <ha-icon-button
                  .label="Entfernen"
                  @click="${() => this._removeWatch(idx)}"
                >
                  <ha-icon icon="mdi:delete-outline"></ha-icon>
                </ha-icon-button>
              </div>

              <div class="vgn-editor-row">
                <ha-textfield
                  label="Liniennummer (z.B. 486)"
                  .value="${watch.line || ''}"
                  @change="${e => this._watchChanged(idx, 'line', e.target.value)}"
                ></ha-textfield>

                <ha-textfield
                  label="Richtung (Teilname)"
                  .value="${watch.direction || ''}"
                  @change="${e => this._watchChanged(idx, 'direction', e.target.value)}"
                ></ha-textfield>
              </div>

              <ha-textfield
                label="Haltestelle DHID (optional)"
                .value="${watch.stop_dhid || ''}"
                @change="${e => this._watchChanged(idx, 'stop_dhid', e.target.value)}"
                helper="Optionale abweichende Haltestelle für diese Linie (z.B. de:09371:18002)"
              ></ha-textfield>

              <ha-select
                label="input_number Helfer (optional)"
                .value="${watch.helper || ''}"
                @selected="${e => this._watchChanged(idx, 'helper', e.detail.value)}"
                @closed="${e => e.stopPropagation()}"
              >
                <mwc-list-item value="">— kein Helfer —</mwc-list-item>
                ${inputNumbers.map(id => html`
                  <mwc-list-item value="${id}">${id}</mwc-list-item>
                `)}
              </ha-select>

              <ha-textfield
                label="Alarm-Schwelle (Minuten)"
                type="number"
                min="1"
                max="120"
                .value="${String(watch.alert_minutes ?? 10)}"
                @change="${e => this._watchChanged(idx, 'alert_minutes', parseInt(e.target.value) || 10)}"
                helper="Karte leuchtet auf wenn weniger als X Minuten"
              ></ha-textfield>
            </div>
          `)}

          <button class="vgn-add-watch-btn" @click="${() => this._addWatch()}">
            <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
            Linie hinzufügen
          </button>
        </div>

        <!-- YAML hint for helpers -->
        <div class="vgn-editor-section vgn-yaml-hint">
          <div class="vgn-editor-section-title">
            <ha-icon icon="mdi:information-outline"></ha-icon>
            HA Helfer (YAML-Referenz)
          </div>
          <div class="vgn-yaml-block">
            <pre>input_number:
  vgn_bus_486_minutes:
    name: "Bus 486 – Minuten"
    min: -1
    max: 120
    step: 1
    icon: mdi:bus-clock
  vgn_bus_456_minutes:
    name: "Bus 456 – Minuten"
    min: -1
    max: 120
    step: 1
    icon: mdi:bus-clock</pre>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("vgn-departure-card-editor", VGNDepartureCardEditor);
