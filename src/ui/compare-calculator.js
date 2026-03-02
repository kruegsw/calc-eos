import { eosList } from '../eos/registry.js';
import compounds from '../compounds/data.json';
import { formatValue } from './calculator.js';
import { R } from '../eos/solver.js';
import { computeProperties, idealProps } from '../eos/properties.js';

export function createComparePanel() {
  const section = document.createElement('section');
  section.className = 'tab-content';
  section.id = 'tab-compare';

  section.innerHTML = `
    <div class="compare-panel">
      <h2>Compare All Equations of State</h2>
      <p class="eos-desc">Run every EOS on the same inputs and compare results side-by-side.</p>

      <div class="compare-inputs">
        <div class="field">
          <label for="cmp-compound">Compound</label>
          <select id="cmp-compound">
            <option value="">-- Select compound --</option>
          </select>
        </div>

        <div class="field">
          <label for="cmp-input-T">Temperature (K)</label>
          <input type="number" id="cmp-input-T" step="any" value="300" />
        </div>

        <div class="field">
          <label for="cmp-input-P">Pressure (Pa)</label>
          <input type="number" id="cmp-input-P" step="any" value="101325" />
        </div>

        <button id="cmp-calc-btn">Calculate All</button>
      </div>

      <div id="cmp-result" class="result-placeholder">
        Select a compound, enter T and P, then click Calculate All
      </div>
    </div>
  `;

  return section;
}

export function initComparePanel() {
  const select = document.getElementById('cmp-compound');
  for (const c of compounds) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.formula})`;
    select.appendChild(opt);
  }
  select.value = 'methane';

  const btn = document.getElementById('cmp-calc-btn');
  const resultDiv = document.getElementById('cmp-result');

  btn.addEventListener('click', () => {
    const compoundId = select.value;
    if (!compoundId) {
      resultDiv.className = 'result-error';
      resultDiv.textContent = 'Please select a compound.';
      return;
    }

    const compound = compounds.find((c) => c.id === compoundId);
    const rawT = document.getElementById('cmp-input-T').value;
    const rawP = document.getElementById('cmp-input-P').value;

    if (rawT === '' || rawP === '' || isNaN(Number(rawT)) || isNaN(Number(rawP))) {
      resultDiv.className = 'result-error';
      resultDiv.textContent = 'Please enter valid Temperature and Pressure.';
      return;
    }

    const T = Number(rawT);
    const P = Number(rawP);
    const M = compound.molarMass / 1000;

    // Ideal gas baseline
    const ZIdeal = 1;
    const VmIdeal = (R * T) / P;
    const igProps = idealProps(ZIdeal, VmIdeal, T, P, M);

    // Run all EOS
    const rows = [];

    // Ideal Gas row
    rows.push({
      name: 'Ideal Gas',
      Zvapor: ZIdeal,
      Zliquid: null,
      Vm_vapor: VmIdeal,
      Vm_liquid: null,
      phase: 'Ideal',
      error: null,
      vaporProps: igProps,
    });

    for (const eos of eosList) {
      try {
        const r = eos.solve(compound, T, P);
        let vaporProps = null;
        if (eos.params) {
          try {
            const p = eos.params(compound, T, P);
            const allProps = computeProperties(r, p, compound);
            vaporProps = allProps.vapor;
          } catch (_) {}
        }
        rows.push({
          name: eos.name,
          Zvapor: r.Zvapor,
          Zliquid: r.Zliquid,
          Vm_vapor: r.Vm_vapor,
          Vm_liquid: r.Vm_liquid,
          phase: r.phase,
          error: null,
          vaporProps,
        });
      } catch (err) {
        rows.push({
          name: eos.name,
          error: err.message,
        });
      }
    }

    resultDiv.className = 'compare-results';
    resultDiv.innerHTML = renderCompareTable(rows, compound, T, P);
  });
}

function renderCompareTable(rows, compound, T, P) {
  const Tr = T / compound.Tc;
  const Pr = P / compound.Pc;

  let html = `
    <div class="compare-meta">
      <span><strong>${compound.name}</strong> (${compound.formula})</span>
      <span>T = ${T} K</span>
      <span>P = ${formatValue(P)} Pa</span>
      <span>T<sub>r</sub> = ${Tr.toFixed(4)}</span>
      <span>P<sub>r</sub> = ${Pr.toFixed(4)}</span>
    </div>
    <div class="table-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th>Equation of State</th>
          <th>Z (vapor)</th>
          <th>V<sub>m</sub> vapor (m³/mol)</th>
          <th>Z (liquid)</th>
          <th>V<sub>m</sub> liquid (m³/mol)</th>
          <th>Phase</th>
          <th>φ (vapor)</th>
          <th>H<sup>R</sup> (J/mol)</th>
          <th>S<sup>R</sup> (J/(mol·K))</th>
          <th>ρ (kg/m³)</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const row of rows) {
    if (row.error) {
      html += `
        <tr class="row-error">
          <td>${row.name}</td>
          <td colspan="9" class="error-cell">${row.error}</td>
        </tr>`;
    } else {
      const vp = row.vaporProps;
      html += `
        <tr>
          <td class="eos-name-cell">${row.name}</td>
          <td>${row.Zvapor.toFixed(6)}</td>
          <td>${formatValue(row.Vm_vapor)}</td>
          <td>${row.Zliquid !== null ? row.Zliquid.toFixed(6) : '—'}</td>
          <td>${row.Vm_liquid !== null ? formatValue(row.Vm_liquid) : '—'}</td>
          <td>${row.phase}</td>
          <td>${vp ? vp.phi.toFixed(6) : '—'}</td>
          <td>${vp ? formatValue(vp.HR) : '—'}</td>
          <td>${vp ? formatValue(vp.SR) : '—'}</td>
          <td>${vp ? formatValue(vp.density) : '—'}</td>
        </tr>`;
    }
  }

  html += `</tbody></table></div>`;
  return html;
}
