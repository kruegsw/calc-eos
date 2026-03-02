// Redlich-Kwong Equation of State (1949)
//
// P = RT/(Vm - b) - a / [√T · Vm(Vm + b)]
//
// a = 0.42748 · R² · Tc^2.5 / Pc
// b = 0.08664 · R · Tc / Pc
//
// Cubic in Z: Z³ - Z² + (A - B - B²)Z - AB = 0
// A = aP/(R² · T^2.5), B = bP/(RT)
//
// Generic cubic form: eps=0, sig=1, Theta=a/√T

import { R, solveCubic, buildResult } from './solver.js';

function getParams(compound) {
  const { Tc, Pc } = compound;
  const a = 0.42748 * R * R * Math.pow(Tc, 2.5) / Pc;
  const b = 0.08664 * R * Tc / Pc;
  return { a, b };
}

export default {
  id: 'redlich-kwong',
  name: 'Redlich-Kwong',
  year: 1949,
  description: 'Improved VdW with temperature-dependent attractive term and volume correction.',

  solve(compound, T, P) {
    const { a, b } = getParams(compound);

    const A = (a * P) / (R * R * Math.pow(T, 2.5));
    const B = (b * P) / (R * T);

    const roots = solveCubic(-1, A - B - B * B, -A * B);
    return buildResult(roots, compound, T, P);
  },

  params(compound, T, P) {
    const { a, b } = getParams(compound);
    // Theta = a/√T, dTheta/dT = -a/(2·T^1.5), d²Theta/dT² = 3a/(4·T^2.5)
    const sqrtT = Math.sqrt(T);
    return {
      type: 'cubic',
      Theta: a / sqrtT,
      dThetadT: -a / (2 * T * sqrtT),
      d2ThetadT2: (3 * a) / (4 * T * T * sqrtT),
      b,
      epsilon: 0,
      sigma: 1,
    };
  },
};
