// Soave-Redlich-Kwong Equation of State (1972)
//
// P = RT/(Vm - b) - a·α(T) / [Vm(Vm + b)]
//
// a = 0.42748 · R² · Tc² / Pc
// b = 0.08664 · R · Tc / Pc
// α = [1 + m(1 - √(T/Tc))]²
// m = 0.48 + 1.574ω - 0.176ω²
//
// Cubic in Z: Z³ - Z² + (A - B - B²)Z - AB = 0
// A = a·α·P/(R²T²), B = bP/(RT)
//
// Generic cubic form: eps=0, sig=1, Theta=a·alpha

import { R, solveCubic, buildResult } from './solver.js';

function getParams(compound) {
  const { Tc, Pc, omega } = compound;
  const a = 0.42748 * R * R * Tc * Tc / Pc;
  const b = 0.08664 * R * Tc / Pc;
  const m = 0.48 + 1.574 * omega - 0.176 * omega * omega;
  return { a, b, m, Tc };
}

function getAlpha(T, m, Tc) {
  const sqrtTr = Math.sqrt(T / Tc);
  const alpha = Math.pow(1 + m * (1 - sqrtTr), 2);
  // dα/dT = 2·[1+m(1-√Tr)]·(-m/(2√(T·Tc)))  = -m·(1+m(1-√Tr))/(√(T·Tc))
  // d²α/dT² = m/(2T) · [m/√(T·Tc)·1/√(T·Tc)·T + (1+m(1-√Tr))/(√(T·Tc))]  ... simplify:
  // Let f = 1+m(1-√Tr), then α = f²
  // dα/dT = 2f·df/dT, where df/dT = -m/(2√(T·Tc))
  // d²α/dT² = 2(df/dT)² + 2f·d²f/dT²
  // d²f/dT² = m/(4·T^(3/2)·√Tc) = m/(4·T·√(T·Tc))
  const sqrtTTc = Math.sqrt(T * Tc);
  const f = 1 + m * (1 - sqrtTr);
  const dfdT = -m / (2 * sqrtTTc);
  const d2fdT2 = m / (4 * T * sqrtTTc);
  const dAlphadT = 2 * f * dfdT;
  const d2AlphadT2 = 2 * dfdT * dfdT + 2 * f * d2fdT2;
  return { alpha, dAlphadT, d2AlphadT2 };
}

export default {
  id: 'srk',
  name: 'Soave-Redlich-Kwong',
  year: 1972,
  description: 'SRK. Adds acentric factor via Soave alpha function. Widely used for hydrocarbons.',

  solve(compound, T, P) {
    const { a, b, m, Tc } = getParams(compound);
    const { alpha } = getAlpha(T, m, Tc);

    const A = (a * alpha * P) / (R * R * T * T);
    const B = (b * P) / (R * T);

    const roots = solveCubic(-1, A - B - B * B, -A * B);
    return buildResult(roots, compound, T, P);
  },

  params(compound, T, P) {
    const { a, b, m, Tc } = getParams(compound);
    const { alpha, dAlphadT, d2AlphadT2 } = getAlpha(T, m, Tc);
    return {
      type: 'cubic',
      Theta: a * alpha,
      dThetadT: a * dAlphadT,
      d2ThetadT2: a * d2AlphadT2,
      b,
      epsilon: 0,
      sigma: 1,
    };
  },
};
