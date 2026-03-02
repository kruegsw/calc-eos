// Dieterici Equation of State (1899)
//
// P = [RT / (Vm - b)] · exp(-a / (RT·Vm))
//
// Unlike cubic EOS, this is transcendental — solved with Newton's method.
//
// a = 4 R² Tc² / (Pc · e²)
// b = R Tc / (Pc · e²)
//
// Predicts Zc = 2/e² ≈ 0.2707 (closer to real fluids than cubic EOS).

import { R, newton } from './solver.js';

const E2 = Math.E * Math.E; // e²

function getParams(compound) {
  const { Tc, Pc } = compound;
  const a = (4 * R * R * Tc * Tc) / (Pc * E2);
  const b = (R * Tc) / (Pc * E2);
  return { a, b };
}

export default {
  id: 'dieterici',
  name: 'Dieterici',
  year: 1899,
  description: 'Exponential EOS. Predicts Zc ≈ 0.271, closer to real fluids than cubic EOS.',

  solve(compound, T, P) {
    const { a, b } = getParams(compound);
    const { Tc, Pc } = compound;

    const aRT = a / (R * T);

    // f(Vm) = RT/(Vm-b) · exp(-a/(RT·Vm)) - P = 0
    function f(Vm) {
      return (R * T / (Vm - b)) * Math.exp(-aRT / Vm) - P;
    }

    // f'(Vm)
    function df(Vm) {
      const expTerm = Math.exp(-aRT / Vm);
      const vmb = Vm - b;
      return R * T * expTerm * (aRT / (Vm * Vm * vmb) - 1 / (vmb * vmb));
    }

    // Try to find vapor root (start from ideal gas volume)
    const VmIdeal = R * T / P;
    const Vm_vapor = newton(f, df, VmIdeal, { xMin: b * 1.001 });

    // Try to find liquid root (start near b)
    const Vm_liquid = newton(f, df, b * 1.5, { xMin: b * 1.001 });

    // Build result
    const Tr = T / Tc;
    const Pr = P / Pc;

    if (Vm_vapor === null && Vm_liquid === null) {
      throw new Error('No physical solution found');
    }

    // Deduplicate: if both roots converged to the same value
    const haveTwoRoots =
      Vm_vapor !== null &&
      Vm_liquid !== null &&
      Math.abs(Vm_vapor - Vm_liquid) / Vm_vapor > 1e-6;

    const Zvap = Vm_vapor !== null ? (P * Vm_vapor) / (R * T) : null;
    const Zliq = haveTwoRoots ? (P * Vm_liquid) / (R * T) : null;

    let phase;
    if (Tr >= 1 && Pr >= 1) {
      phase = 'Supercritical';
    } else if (!haveTwoRoots) {
      phase = Tr >= 1 ? 'Vapor' : 'Single phase';
    } else {
      phase = 'Vapor-Liquid (two roots)';
    }

    return {
      Zvapor: Zvap ?? (Zliq !== null ? Zliq : undefined),
      Zliquid: Zliq,
      Vm_vapor: Vm_vapor ?? (Vm_liquid !== null ? Vm_liquid : undefined),
      Vm_liquid: haveTwoRoots ? Vm_liquid : null,
      phase,
      T,
      P,
      Tr,
      Pr,
    };
  },

  params(compound, T, P) {
    const { a, b } = getParams(compound);
    return {
      type: 'dieterici',
      a,
      b,
    };
  },
};
