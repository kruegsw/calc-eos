// Virial Equation of State (truncated to 2nd coefficient)
//
// Z = 1 + B·P/(RT)
//
// Second virial coefficient B estimated from Pitzer correlation (Abbott):
// B = (RTc/Pc)(B⁰ + ω·B¹)
// B⁰ = 0.083 - 0.422/Tr^1.6
// B¹ = 0.139 - 0.172/Tr^4.2
//
// Valid for low-to-moderate pressures (gas phase only).
// No liquid root — this is a gas-phase-only approximation.

import { R } from './solver.js';

function getVirialCoeffs(compound, T) {
  const { Tc, Pc, omega } = compound;
  const Tr = T / Tc;

  const B0 = 0.083 - 0.422 / Math.pow(Tr, 1.6);
  const B1 = 0.139 - 0.172 / Math.pow(Tr, 4.2);
  const B = (R * Tc / Pc) * (B0 + omega * B1);

  // dB/dT
  const dB0dTr = 0.422 * 1.6 / Math.pow(Tr, 2.6);
  const dB1dTr = 0.172 * 4.2 / Math.pow(Tr, 5.2);
  const dTrdT = 1 / Tc;
  const dBdT = (R * Tc / Pc) * (dB0dTr + omega * dB1dTr) * dTrdT;

  // d²B/dT²
  const d2B0dTr2 = -0.422 * 1.6 * 2.6 / Math.pow(Tr, 3.6);
  const d2B1dTr2 = -0.172 * 4.2 * 5.2 / Math.pow(Tr, 6.2);
  const d2BdT2 = (R * Tc / Pc) * (d2B0dTr2 + omega * d2B1dTr2) * dTrdT * dTrdT;

  return { B, dBdT, d2BdT2, Tr };
}

export default {
  id: 'virial',
  name: 'Virial (2nd coeff.)',
  year: null,
  description: 'Truncated virial with Pitzer correlation. Gas-phase only, best at low-moderate pressure.',

  solve(compound, T, P) {
    const { Tc, Pc } = compound;
    const { B, Tr } = getVirialCoeffs(compound, T);
    const Pr = P / Pc;

    const Z = 1 + B * P / (R * T);

    if (Z <= 0) {
      throw new Error(
        'Negative compressibility — virial truncation invalid at this pressure. Try a cubic EOS.',
      );
    }

    const Vm = (Z * R * T) / P;

    return {
      Zvapor: Z,
      Zliquid: null,
      Vm_vapor: Vm,
      Vm_liquid: null,
      phase: Tr >= 1 && Pr >= 1 ? 'Supercritical' : 'Vapor (gas phase only)',
      T,
      P,
      Tr,
      Pr,
    };
  },

  params(compound, T, P) {
    const { B, dBdT, d2BdT2 } = getVirialCoeffs(compound, T);
    return {
      type: 'virial',
      B,
      dBdT,
      d2BdT2,
    };
  },
};
