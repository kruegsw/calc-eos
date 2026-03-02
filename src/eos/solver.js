/**
 * Solve a cubic equation: x³ + c2·x² + c1·x + c0 = 0
 * Returns all positive real roots, sorted ascending.
 */
export function solveCubic(c2, c1, c0) {
  // Depress the cubic via x = t - c2/3
  const p = c1 - (c2 * c2) / 3;
  const q = (2 * c2 * c2 * c2) / 27 - (c2 * c1) / 3 + c0;
  const discriminant = (q * q) / 4 + (p * p * p) / 27;

  const shift = -c2 / 3;
  const roots = [];

  if (discriminant > 1e-12) {
    // One real root
    const sqrtD = Math.sqrt(discriminant);
    const u = Math.cbrt(-q / 2 + sqrtD);
    const v = Math.cbrt(-q / 2 - sqrtD);
    roots.push(u + v + shift);
  } else if (discriminant < -1e-12) {
    // Three distinct real roots
    const r = Math.sqrt((-p * p * p) / 27);
    const theta = Math.acos((-q / 2) / r);
    const m = 2 * Math.cbrt(r);
    roots.push(
      m * Math.cos(theta / 3) + shift,
      m * Math.cos((theta + 2 * Math.PI) / 3) + shift,
      m * Math.cos((theta + 4 * Math.PI) / 3) + shift,
    );
  } else {
    // Repeated root
    if (Math.abs(q) < 1e-12) {
      roots.push(shift);
    } else {
      const u = Math.cbrt(-q / 2);
      roots.push(2 * u + shift);
      roots.push(-u + shift);
    }
  }

  return roots.filter((z) => z > 0).sort((a, b) => a - b);
}

/**
 * Newton's method root finder.
 * @param {function} f - function f(x)
 * @param {function} df - derivative f'(x)
 * @param {number} x0 - initial guess
 * @param {object} [opts]
 * @returns {number|null} - root or null if not converged
 */
export function newton(f, df, x0, { tol = 1e-10, maxIter = 200, xMin = -Infinity } = {}) {
  let x = x0;
  for (let i = 0; i < maxIter; i++) {
    const fx = f(x);
    const dfx = df(x);
    if (Math.abs(dfx) < 1e-30) return null;
    const xNew = x - fx / dfx;
    if (xNew <= xMin) return null;
    if (Math.abs(xNew - x) < tol * Math.abs(xNew)) return xNew;
    x = xNew;
  }
  return null;
}

export const R = 8.314; // J/(mol·K)

/**
 * Build a standard result object from Z roots.
 */
export function buildResult(roots, compound, T, P) {
  if (roots.length === 0) {
    throw new Error('No physical solution found (no positive Z roots)');
  }

  const Zvapor = Math.max(...roots);
  const Zliquid = roots.length >= 2 ? Math.min(...roots) : null;

  const Vm_vapor = (Zvapor * R * T) / P;
  const Vm_liquid = Zliquid !== null ? (Zliquid * R * T) / P : null;

  const Tr = T / compound.Tc;
  const Pr = P / compound.Pc;

  let phase;
  if (Tr >= 1 && Pr >= 1) {
    phase = 'Supercritical';
  } else if (roots.length === 1) {
    phase = Tr >= 1 ? 'Vapor' : 'Single phase';
  } else {
    phase = 'Vapor-Liquid (two roots)';
  }

  return { Zvapor, Zliquid, Vm_vapor, Vm_liquid, phase, T, P, Tr, Pr };
}
