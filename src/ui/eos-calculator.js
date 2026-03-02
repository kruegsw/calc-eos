import compounds from '../compounds/data.json';
import { formatValue } from './calculator.js';
import { computeProperties } from '../eos/properties.js';

/**
 * Create a standard EOS calculator panel (compound + T + P → results).
 * Used by all EOS except Ideal Gas.
 */
export function createEosPanel(eos) {
  const id = eos.id;
  const section = document.createElement('section');
  section.className = 'tab-content';
  section.id = `tab-${id}`;

  const yearStr = eos.year ? ` (${eos.year})` : '';

  section.innerHTML = `
    <div class="calculator">
      <div class="input-panel">
        <h2>${eos.name}${yearStr}</h2>
        <p class="eos-desc">${eos.description}</p>

        <div class="field">
          <label for="${id}-compound">Compound</label>
          <select id="${id}-compound">
            <option value="">-- Select compound --</option>
          </select>
        </div>

        <div class="field">
          <label for="${id}-input-T">Temperature (K)</label>
          <input type="number" id="${id}-input-T" step="any" value="300" />
        </div>

        <div class="field">
          <label for="${id}-input-P">Pressure (Pa)</label>
          <input type="number" id="${id}-input-P" step="any" value="101325" />
        </div>

        <button id="${id}-calc-btn">Calculate</button>
      </div>

      <div class="result-panel">
        <h2>Result</h2>
        <div id="${id}-result" class="result-placeholder">
          Select a compound, enter T and P, then click Calculate
        </div>
      </div>
    </div>
  `;

  return section;
}

/**
 * Wire up event listeners for a standard EOS panel.
 */
export function initEosPanel(eos) {
  const id = eos.id;

  // Populate compound dropdown
  const select = document.getElementById(`${id}-compound`);
  for (const c of compounds) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.formula})`;
    select.appendChild(opt);
  }
  select.value = 'methane';

  const btn = document.getElementById(`${id}-calc-btn`);
  const resultDiv = document.getElementById(`${id}-result`);

  btn.addEventListener('click', () => {
    const compoundId = select.value;
    if (!compoundId) {
      resultDiv.className = 'result-error';
      resultDiv.textContent = 'Please select a compound.';
      return;
    }

    const compound = compounds.find((c) => c.id === compoundId);

    const rawT = document.getElementById(`${id}-input-T`).value;
    const rawP = document.getElementById(`${id}-input-P`).value;

    if (rawT === '' || rawP === '' || isNaN(Number(rawT)) || isNaN(Number(rawP))) {
      resultDiv.className = 'result-error';
      resultDiv.textContent = 'Please enter valid Temperature and Pressure.';
      return;
    }

    try {
      const T = Number(rawT);
      const P = Number(rawP);
      const result = eos.solve(compound, T, P);

      // Compute derived properties
      let props = null;
      if (eos.params) {
        try {
          const p = eos.params(compound, T, P);
          props = computeProperties(result, p, compound);
        } catch (_) {
          // Properties computation failed — still show basic result
        }
      }

      resultDiv.className = 'result-success';
      resultDiv.innerHTML = renderResult(result, props);
    } catch (err) {
      resultDiv.className = 'result-error';
      resultDiv.textContent = err.message;
    }
  });
}

function renderResult(r, props) {
  let html = `<div class="pr-results">
    <div class="result-row">
      <span class="result-label">Phase</span>
      <span class="result-data">${r.phase}</span>
    </div>
    <div class="result-row">
      <span class="result-label">T<sub>r</sub></span>
      <span class="result-data">${r.Tr.toFixed(4)}</span>
    </div>
    <div class="result-row">
      <span class="result-label">P<sub>r</sub></span>
      <span class="result-data">${r.Pr.toFixed(4)}</span>
    </div>`;

  // Vapor phase
  html += renderPhaseBlock('Vapor', r.Zvapor, r.Vm_vapor, props?.vapor);

  // Liquid phase
  if (r.Zliquid !== null) {
    html += renderPhaseBlock('Liquid', r.Zliquid, r.Vm_liquid, props?.liquid);
  }

  html += `</div>`;
  return html;
}

function renderPhaseBlock(label, Z, Vm, phaseProps) {
  let html = `
    <div class="result-row phase-header">
      <span class="result-label"><strong>${label}</strong></span>
      <span class="result-data"></span>
    </div>
    <div class="result-row">
      <span class="result-label">Z</span>
      <span class="result-data">${Z.toFixed(6)}</span>
    </div>
    <div class="result-row">
      <span class="result-label">V<sub>m</sub></span>
      <span class="result-data">${formatValue(Vm)} m³/mol</span>
    </div>`;

  if (!phaseProps) return html;

  html += `
    <details class="props-section" open>
      <summary>Derived Properties</summary>
      <div class="props-grid">`;

  html += propRow('ρ (density)', formatValue(phaseProps.density), 'kg/m³');
  html += propRow('φ (fugacity coeff.)', phaseProps.phi.toFixed(6), '');
  html += propRow('f (fugacity)', formatValue(phaseProps.fugacity), 'Pa');
  html += propRow('H<sup>R</sup>', formatValue(phaseProps.HR), 'J/mol');
  html += propRow('S<sup>R</sup>', formatValue(phaseProps.SR), 'J/(mol·K)');
  html += propRow('U<sup>R</sup>', formatValue(phaseProps.UR), 'J/mol');
  html += propRow('G<sup>R</sup>', formatValue(phaseProps.GR), 'J/mol');
  html += propRow('A<sup>R</sup>', formatValue(phaseProps.AR), 'J/mol');
  html += propRow('κ<sub>T</sub>', formatValue(phaseProps.kappaT), '1/Pa');
  html += propRow('α<sub>P</sub>', formatValue(phaseProps.alphaP), '1/K');
  html += propRow('C<sub>v</sub><sup>R</sup>', formatValue(phaseProps.CvR), 'J/(mol·K)');
  html += propRow('C<sub>p</sub><sup>R</sup>', formatValue(phaseProps.CpR), 'J/(mol·K)');

  html += `</div></details>`;
  return html;
}

function propRow(label, value, unit) {
  return `
    <div class="result-row">
      <span class="result-label">${label}</span>
      <span class="result-data">${value}${unit ? ' ' + unit : ''}</span>
    </div>`;
}
