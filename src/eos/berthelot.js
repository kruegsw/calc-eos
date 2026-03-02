// Berthelot Equation of State (1899)
//
// P = RT/(Vm - b) - a/(T·Vm²)
//
// Like Van der Waals but attractive term is temperature-dependent.
//
// a = 27 R² Tc³ / (64 Pc)
// b = R Tc / (8 Pc)
//
// Cubic in Z: Z³ - (1+B)Z² + A'Z - A'B = 0
// A' = aP/(R²T³), B = bP/(RT)
//
// Generic cubic form: eps=0, sig=0, Theta=a/T

import { R, solveCubic, buildResult } from './solver.js';

function getParams(compound) {
  const { Tc, Pc } = compound;
  const a = (27 * R * R * Tc * Tc * Tc) / (64 * Pc);
  const b = (R * Tc) / (8 * Pc);
  return { a, b };
}

export default {
  id: 'berthelot',
  name: 'Berthelot',
  year: 1899,
  description: 'Modified Van der Waals with temperature-dependent attractive term.',

  solve(compound, T, P) {
    const { a, b } = getParams(compound);

    const Ap = (a * P) / (R * R * T * T * T);
    const B = (b * P) / (R * T);

    const roots = solveCubic(-(1 + B), Ap, -Ap * B);
    return buildResult(roots, compound, T, P);
  },

  params(compound, T, P) {
    const { a, b } = getParams(compound);
    // Theta = a/T, dTheta/dT = -a/T², d²Theta/dT² = 2a/T³
    return {
      type: 'cubic',
      Theta: a / T,
      dThetadT: -a / (T * T),
      d2ThetadT2: (2 * a) / (T * T * T),
      b,
      epsilon: 0,
      sigma: 0,
    };
  },
};
