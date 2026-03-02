// Van der Waals Equation of State (1873)
//
// P = RT/(Vm - b) - a/Vm²
//
// a = 27 R² Tc² / (64 Pc)
// b = R Tc / (8 Pc)
//
// Cubic in Z: Z³ - (1+B)Z² + AZ - AB = 0
// A = aP/(R²T²), B = bP/(RT)
//
// Generic cubic form: eps=0, sig=0, Theta=a (constant)

import { R, solveCubic, buildResult } from './solver.js';

function getParams(compound) {
  const { Tc, Pc } = compound;
  const a = (27 * R * R * Tc * Tc) / (64 * Pc);
  const b = (R * Tc) / (8 * Pc);
  return { a, b };
}

export default {
  id: 'van-der-waals',
  name: 'Van der Waals',
  year: 1873,
  description: 'First cubic EOS. Accounts for molecular volume and intermolecular attraction.',

  solve(compound, T, P) {
    const { a, b } = getParams(compound);

    const A = (a * P) / (R * R * T * T);
    const B = (b * P) / (R * T);

    const roots = solveCubic(-(1 + B), A, -A * B);
    return buildResult(roots, compound, T, P);
  },

  params(compound, T, P) {
    const { a, b } = getParams(compound);
    return {
      type: 'cubic',
      Theta: a,
      dThetadT: 0,
      d2ThetadT2: 0,
      b,
      epsilon: 0,
      sigma: 0,
    };
  },
};
