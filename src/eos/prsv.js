// Peng-Robinson-Stryjek-Vera Equation of State (1986)
//
// Same form as Peng-Robinson:
// P = RT/(Vm - b) - a·α / (Vm² + 2bVm - b²)
//
// But uses an improved kappa correlation:
// κ = κ₀ + κ₁(1 + √Tr)(0.7 - Tr)
// κ₀ = 0.378893 + 1.4897153ω - 0.17131848ω² + 0.0196554ω³
//
// κ₁ is a compound-specific parameter (defaults to 0).
// Even with κ₁=0, PRSV differs from PR due to the cubic κ₀ correlation.
//
// Cubic in Z: Z³ - (1-B)Z² + (A - 3B² - 2B)Z - (AB - B² - B³) = 0
//
// Generic cubic form: eps=1-√2, sig=1+√2, Theta=a·alpha

import { R, solveCubic, buildResult } from './solver.js';

const SQRT2 = Math.SQRT2;

function getParams(compound) {
  const { Tc, Pc, omega } = compound;
  const kappa1 = compound.kappa1 || 0;
  const a = 0.45724 * R * R * Tc * Tc / Pc;
  const b = 0.07780 * R * Tc / Pc;
  const kappa0 =
    0.378893 + 1.4897153 * omega - 0.17131848 * omega * omega + 0.0196554 * omega * omega * omega;
  return { a, b, kappa0, kappa1, Tc };
}

function getAlpha(T, p) {
  const { a, kappa0, kappa1, Tc } = p;
  const Tr = T / Tc;
  const sqrtTr = Math.sqrt(Tr);

  // κ = κ₀ + κ₁(1 + √Tr)(0.7 - Tr)
  const kappa = kappa0 + kappa1 * (1 + sqrtTr) * (0.7 - Tr);

  // α = [1 + κ(1-√Tr)]²
  const f = 1 + kappa * (1 - sqrtTr);
  const alpha = f * f;

  // For dα/dT and d²α/dT², use numerical central difference as the
  // algebraic expressions are complex due to κ depending on T.
  const h = T * 1e-5;
  const T1 = T + h;
  const T2 = T - h;

  const Tr1 = T1 / Tc;
  const sqrtTr1 = Math.sqrt(Tr1);
  const k1 = kappa0 + kappa1 * (1 + sqrtTr1) * (0.7 - Tr1);
  const alpha1 = Math.pow(1 + k1 * (1 - sqrtTr1), 2);

  const Tr2 = T2 / Tc;
  const sqrtTr2 = Math.sqrt(Tr2);
  const k2 = kappa0 + kappa1 * (1 + sqrtTr2) * (0.7 - Tr2);
  const alpha2 = Math.pow(1 + k2 * (1 - sqrtTr2), 2);

  const dAlphadT = (alpha1 - alpha2) / (2 * h);
  const d2AlphadT2 = (alpha1 - 2 * alpha + alpha2) / (h * h);

  return { alpha, dAlphadT, d2AlphadT2 };
}

export default {
  id: 'prsv',
  name: 'Peng-Robinson-Stryjek-Vera',
  year: 1986,
  description: 'PRSV. Improved PR with better kappa correlation (cubic in ω).',

  solve(compound, T, P) {
    const p = getParams(compound);
    const { alpha } = getAlpha(T, p);

    const A = (p.a * alpha * P) / (R * R * T * T);
    const B = (p.b * P) / (R * T);

    const c2 = -(1 - B);
    const c1 = A - 3 * B * B - 2 * B;
    const c0 = -(A * B - B * B - B * B * B);

    const roots = solveCubic(c2, c1, c0);
    return buildResult(roots, compound, T, P);
  },

  params(compound, T, P) {
    const p = getParams(compound);
    const { alpha, dAlphadT, d2AlphadT2 } = getAlpha(T, p);
    return {
      type: 'cubic',
      Theta: p.a * alpha,
      dThetadT: p.a * dAlphadT,
      d2ThetadT2: p.a * d2AlphadT2,
      b: p.b,
      epsilon: 1 - SQRT2,
      sigma: 1 + SQRT2,
    };
  },
};
