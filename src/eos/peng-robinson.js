// Peng-Robinson Equation of State (1976)
//
// P = RT/(Vm - b) - a·α / (Vm² + 2bVm - b²)
//
// a = 0.45724 · R²Tc² / Pc
// b = 0.07780 · R·Tc / Pc
// α = [1 + κ(1 - √(T/Tc))]²
// κ = 0.37464 + 1.54226ω - 0.26992ω²
//
// Cubic in Z: Z³ - (1-B)Z² + (A - 3B² - 2B)Z - (AB - B² - B³) = 0
//
// Generic cubic form: eps=1-√2, sig=1+√2, Theta=a·alpha

import { R, solveCubic, buildResult } from './solver.js';

const SQRT2 = Math.SQRT2;

function getParams(compound) {
  const { Tc, Pc, omega } = compound;
  const kappa = 0.37464 + 1.54226 * omega - 0.26992 * omega * omega;
  const a = 0.45724 * R * R * Tc * Tc / Pc;
  const b = 0.07780 * R * Tc / Pc;
  return { a, b, kappa, Tc };
}

function getAlpha(T, kappa, Tc) {
  const sqrtTr = Math.sqrt(T / Tc);
  const sqrtTTc = Math.sqrt(T * Tc);
  const f = 1 + kappa * (1 - sqrtTr);
  const dfdT = -kappa / (2 * sqrtTTc);
  const d2fdT2 = kappa / (4 * T * sqrtTTc);
  const alpha = f * f;
  const dAlphadT = 2 * f * dfdT;
  const d2AlphadT2 = 2 * dfdT * dfdT + 2 * f * d2fdT2;
  return { alpha, dAlphadT, d2AlphadT2 };
}

export default {
  id: 'peng-robinson',
  name: 'Peng-Robinson',
  year: 1976,
  description: 'Industry standard cubic EOS. Good for VLE and liquid density predictions.',

  solve(compound, T, P) {
    const { a, b, kappa, Tc } = getParams(compound);
    const { alpha } = getAlpha(T, kappa, Tc);

    const A = (a * alpha * P) / (R * R * T * T);
    const B = (b * P) / (R * T);

    const c2 = -(1 - B);
    const c1 = A - 3 * B * B - 2 * B;
    const c0 = -(A * B - B * B - B * B * B);

    const roots = solveCubic(c2, c1, c0);
    return buildResult(roots, compound, T, P);
  },

  params(compound, T, P) {
    const { a, b, kappa, Tc } = getParams(compound);
    const { alpha, dAlphadT, d2AlphadT2 } = getAlpha(T, kappa, Tc);
    return {
      type: 'cubic',
      Theta: a * alpha,
      dThetadT: a * dAlphadT,
      d2ThetadT2: a * d2AlphadT2,
      b,
      epsilon: 1 - SQRT2,
      sigma: 1 + SQRT2,
    };
  },
};
