import { idealGas } from '../eos/ideal-gas.js';
import compounds from '../compounds/data.json';

const variables = ['P', 'V', 'T', 'n'];

const labels = {
  P: 'Pressure',
  V: 'Volume',
  T: 'Temperature',
  n: 'Moles',
};

/**
 * Create the Ideal Gas tab panel HTML.
 */
export function createIdealGasPanel() {
  const section = document.createElement('section');
  section.className = 'tab-content';
  section.id = 'tab-ideal-gas';

  section.innerHTML = `
    <div class="calculator">
      <div class="input-panel">
        <h2>Ideal Gas Law</h2>
        <p class="eos-desc">PV = nRT. Valid for low pressures and high temperatures.</p>

        <div class="field">
          <label for="ig-compound">Compound (optional)</label>
          <select id="ig-compound">
            <option value="">-- Select compound --</option>
          </select>
        </div>

        <div class="field">
          <label for="ig-solve-for">Solve for</label>
          <select id="ig-solve-for">
            <option value="P">Pressure (P)</option>
            <option value="V">Volume (V)</option>
            <option value="T">Temperature (T)</option>
            <option value="n">Moles (n)</option>
          </select>
        </div>

        <div class="field" id="ig-field-P">
          <label for="ig-input-P">Pressure (Pa)</label>
          <input type="number" id="ig-input-P" step="any" value="101325" />
        </div>

        <div class="field" id="ig-field-V">
          <label for="ig-input-V">Volume (m³)</label>
          <input type="number" id="ig-input-V" step="any" value="0.0224" />
        </div>

        <div class="field" id="ig-field-T">
          <label for="ig-input-T">Temperature (K)</label>
          <input type="number" id="ig-input-T" step="any" value="273.15" />
        </div>

        <div class="field" id="ig-field-n">
          <label for="ig-input-n">Moles (mol)</label>
          <input type="number" id="ig-input-n" step="any" value="1" />
        </div>

        <button id="ig-calculate-btn">Calculate</button>
      </div>

      <div class="result-panel">
        <h2>Result</h2>
        <div id="ig-result-output" class="result-placeholder">
          Select inputs and click Calculate
        </div>
        <div class="ig-note">
          All departure properties (H<sup>R</sup>, S<sup>R</sup>, G<sup>R</sup>, etc.) are zero
          for an ideal gas. Fugacity coefficient φ = 1, fugacity f = P.
        </div>
      </div>
    </div>
  `;

  return section;
}

/**
 * Wire up Ideal Gas event listeners.
 */
export function initIdealGasCalculator() {
  // Populate compound dropdown
  const select = document.getElementById('ig-compound');
  for (const c of compounds) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.formula})`;
    select.appendChild(opt);
  }
  select.value = 'methane';

  const solveForSelect = document.getElementById('ig-solve-for');
  const calculateBtn = document.getElementById('ig-calculate-btn');
  const resultOutput = document.getElementById('ig-result-output');

  function updateVisibleFields() {
    const solveFor = solveForSelect.value;
    for (const v of variables) {
      const field = document.getElementById(`ig-field-${v}`);
      field.style.display = v === solveFor ? 'none' : '';
      if (v === solveFor) {
        document.getElementById(`ig-input-${v}`).value = '';
      }
    }
  }

  solveForSelect.addEventListener('change', updateVisibleFields);
  updateVisibleFields();

  calculateBtn.addEventListener('click', () => {
    const solveFor = solveForSelect.value;

    const inputs = {};
    let valid = true;
    for (const v of variables) {
      if (v === solveFor) continue;
      const raw = document.getElementById(`ig-input-${v}`).value;
      if (raw === '' || isNaN(Number(raw))) {
        valid = false;
        break;
      }
      inputs[v] = Number(raw);
    }

    if (!valid) {
      resultOutput.className = 'result-error';
      resultOutput.textContent = 'Please fill in all input fields with valid numbers.';
      return;
    }

    try {
      const result = idealGas(inputs, solveFor);
      resultOutput.className = 'result-success';
      resultOutput.innerHTML = `
        <div class="result-value">
          <span class="result-label">${labels[result.variable]}</span>
          <span class="result-number">${formatValue(result.value)}</span>
          <span class="result-unit">${result.unit}</span>
        </div>
      `;
    } catch (err) {
      resultOutput.className = 'result-error';
      resultOutput.textContent = err.message;
    }
  });
}

export function formatValue(value) {
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.001 && value !== 0)) {
    return value.toExponential(4);
  }
  return value.toPrecision(6);
}
