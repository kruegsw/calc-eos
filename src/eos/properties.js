// Derived thermodynamic properties from EOS parameters.
//
// All cubic EOS follow: P = RT/(Vm-b) - Theta(T)/[(Vm+eps*b)(Vm+sig*b)]
//
// Generic integral I = ln[(Z+sig*beta)/(Z+eps*beta)] / (sig-eps)  for sig!=eps
//                  I = beta/Z                                      for eps=sig=0
//
// ln(phi) = (Z-1) - ln(Z-beta) - Theta*I/(bRT)
// H^R     = RT(Z-1) + (T*dTheta/dT - Theta)*I/b
// S^R     = R*ln(Z-beta) + dTheta/dT * I/b

import { R } from './solver.js';

// --- Gauss-Legendre 16-point quadrature ---
const GL_NODES = [
  -0.0950125098376374, 0.0950125098376374,
  -0.2816035507792589, 0.2816035507792589,
  -0.4580167776572274, 0.4580167776572274,
  -0.6178762444026438, 0.6178762444026438,
  -0.7554044083550030, 0.7554044083550030,
  -0.8656312023878318, 0.8656312023878318,
  -0.9445750230732326, 0.9445750230732326,
  -0.9894009349916499, 0.9894009349916499,
];

const GL_WEIGHTS = [
  0.1894506104550685, 0.1894506104550685,
  0.1826034150449236, 0.1826034150449236,
  0.1691565193950025, 0.1691565193950025,
  0.1495959888165767, 0.1495959888165767,
  0.1246289712555339, 0.1246289712555339,
  0.0951585116824928, 0.0951585116824928,
  0.0622535239386479, 0.0622535239386479,
  0.0271524594117541, 0.0271524594117541,
];

function gaussLegendre(f, a, b) {
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  let sum = 0;
  for (let i = 0; i < GL_NODES.length; i++) {
    sum += GL_WEIGHTS[i] * f(mid + half * GL_NODES[i]);
  }
  return half * sum;
}

// --- Main entry point ---

export function computeProperties(solveResult, params, compound) {
  const { T, P } = solveResult;
  const M = compound.molarMass / 1000; // g/mol -> kg/mol

  const result = { vapor: null, liquid: null };

  if (solveResult.Zvapor != null && solveResult.Vm_vapor != null) {
    result.vapor = computePhase(solveResult.Zvapor, solveResult.Vm_vapor, T, P, M, params);
  }
  if (solveResult.Zliquid != null && solveResult.Vm_liquid != null) {
    result.liquid = computePhase(solveResult.Zliquid, solveResult.Vm_liquid, T, P, M, params);
  }

  return result;
}

function computePhase(Z, Vm, T, P, M, params) {
  switch (params.type) {
    case 'cubic': return cubicProps(Z, Vm, T, P, M, params);
    case 'virial': return virialProps(Z, Vm, T, P, M, params);
    case 'dieterici': return dietiriciProps(Z, Vm, T, P, M, params);
    case 'ideal': return idealProps(Z, Vm, T, P, M);
    default: return null;
  }
}

// --- Cubic EOS properties ---

function cubicProps(Z, Vm, T, P, M, p) {
  const { Theta, dThetadT, d2ThetadT2, b, epsilon, sigma } = p;
  const beta = b * P / (R * T);

  // Guard: Z <= beta means ln(Z-beta) is undefined
  if (Z <= beta) return null;

  // Integral I
  let I;
  if (Math.abs(sigma - epsilon) > 1e-15) {
    const num = Z + sigma * beta;
    const den = Z + epsilon * beta;
    if (num <= 0 || den <= 0) return null;
    I = Math.log(num / den) / (sigma - epsilon);
  } else {
    // eps = sigma = 0 (VdW, Berthelot)
    I = beta / Z;
  }

  // Fugacity coefficient
  const lnPhi = (Z - 1) - Math.log(Z - beta) - (Theta * I) / (b * R * T);
  const phi = Math.exp(lnPhi);
  const fugacity = phi * P;

  // Residual enthalpy
  const HR = R * T * (Z - 1) + (T * dThetadT - Theta) * I / b;

  // Residual entropy
  const SR = R * Math.log(Z - beta) + dThetadT * I / b;

  // Derived residual properties
  const UR = HR - R * T * (Z - 1);
  const GR = R * T * lnPhi;
  const AR = GR - R * T * (Z - 1);

  // Density
  const density = M / Vm;

  // Pressure derivatives for compressibility and expansivity
  // P = RT/(Vm-b) - Theta/[(Vm+eps*b)(Vm+sig*b)]
  // dP/dVm = -RT/(Vm-b)^2 + Theta*(2Vm + (eps+sig)*b) / [(Vm+eps*b)(Vm+sig*b)]^2
  const vmb = Vm - b;
  const ve = Vm + epsilon * b;
  const vs = Vm + sigma * b;
  const dPdV = -R * T / (vmb * vmb) + Theta * (2 * Vm + (epsilon + sigma) * b) / (ve * vs * ve * vs);

  // dP/dT = R/(Vm-b) - dTheta/dT / [(Vm+eps*b)(Vm+sig*b)]
  const dPdT = R / vmb - dThetadT / (ve * vs);

  // Isothermal compressibility: kappa_T = -1/(Vm * dP/dV)
  const kappaT = -1 / (Vm * dPdV);

  // Volume expansivity: alpha_P = -(dP/dT) / (Vm * dP/dV)  [since alpha = (1/Vm)(dVm/dT)_P]
  // From implicit differentiation: (dVm/dT)_P = -(dP/dT)_V / (dP/dVm)_T
  const alphaP = -dPdT / (Vm * dPdV);

  // Residual Cv = -T * d2Theta/dT2 * I / b
  const CvR = -T * d2ThetadT2 * I / b;

  // Residual Cp = CvR + T * (dP/dT)^2 / (-dP/dV) - R
  // Cp^R = Cv^R + T*(dP/dT)_V^2 / (-(dP/dV)_T) - R
  const CpR = CvR + T * dPdT * dPdT / (-dPdV) - R;

  return {
    density, phi, fugacity, HR, SR, UR, GR, AR, kappaT, alphaP, CvR, CpR,
  };
}

// --- Virial EOS properties ---

function virialProps(Z, Vm, T, P, M, p) {
  const { B, dBdT, d2BdT2 } = p;

  // Closed-form virial departure functions
  const lnPhi = B * P / (R * T);
  const phi = Math.exp(lnPhi);
  const fugacity = phi * P;

  const HR = P * (B - T * dBdT);
  const SR = -P * dBdT;

  const UR = HR - R * T * (Z - 1);
  const GR = R * T * lnPhi;
  const AR = GR - R * T * (Z - 1);

  const density = M / Vm;

  // For virial: P = RT/Vm + RT*B/Vm^2 (truncated)
  // dP/dV = -RT/Vm^2 - 2RT*B/Vm^3
  const dPdV = -R * T / (Vm * Vm) - 2 * R * T * B / (Vm * Vm * Vm);
  // dP/dT = R/Vm + R*B/Vm^2 + R*T*dBdT/Vm^2
  const dPdT = R / Vm + R * B / (Vm * Vm) + R * T * dBdT / (Vm * Vm);

  const kappaT = -1 / (Vm * dPdV);
  const alphaP = -dPdT / (Vm * dPdV);

  // Cv^R = -P * T * d2BdT2 (from truncated virial)
  const CvR = -P * T * d2BdT2;
  const CpR = CvR + T * dPdT * dPdT / (-dPdV) - R;

  return {
    density, phi, fugacity, HR, SR, UR, GR, AR, kappaT, alphaP, CvR, CpR,
  };
}

// --- Dieterici EOS properties ---
// P = [RT/(Vm-b)] * exp(-a/(RT*Vm))
// Departure functions via numerical integration with t = 1/V substitution

function dietiriciProps(Z, Vm, T, P, M, p) {
  const { a, b } = p;
  const aRT = a / (R * T);

  // Analytical derivatives for compressibility and expansivity
  // dP/dVm
  const expTerm = Math.exp(-aRT / Vm);
  const vmb = Vm - b;
  const dPdV = R * T * expTerm * (aRT / (Vm * Vm * vmb) - 1 / (vmb * vmb));

  // dP/dT = [R/(Vm-b) + a/(R*T^2*Vm)] * exp(-a/(RT*Vm)) * ... let me derive properly
  // P = RT/(Vm-b) * exp(-a/(RT*Vm))
  // dP/dT = [R/(Vm-b)] * exp(-a/(RT*Vm)) + [RT/(Vm-b)] * exp(-a/(RT*Vm)) * a/(R*T^2*Vm)
  //       = exp(-a/(RT*Vm)) * [R/(Vm-b)] * [1 + a/(RT*Vm)]
  //       = P/T * (1 + a/(RT*Vm))
  const dPdT = (P / T) * (1 + aRT / Vm);

  const density = M / Vm;
  const kappaT = -1 / (Vm * dPdV);
  const alphaP = -dPdT / (Vm * dPdV);

  // Departure functions via numerical integration
  // H^R = RT(Z-1) + integral from Vm to inf of [T*(dP/dT)_V - P] dV
  // S^R = R*ln(Z) + integral from Vm to inf of [(dP/dT)_V - R/V] dV
  // Use substitution t = 1/V, dV = -dt/t^2, limits: t=1/Vm to t=0

  // (dP/dT)_V at volume V:
  function dPdT_at(V) {
    const eT = Math.exp(-aRT / V);
    return (R / (V - b)) * (1 + aRT / V) * eT;
  }

  function P_at(V) {
    return (R * T / (V - b)) * Math.exp(-aRT / V);
  }

  // For H^R integral: integrand = T*(dP/dT)_V - P, from Vm to infinity
  // With t=1/V: integral = int_{0}^{1/Vm} [T*dPdT(1/t) - P(1/t)] / t^2 dt
  function hIntegrand(t) {
    if (t < 1e-30) return 0;
    const V = 1 / t;
    return (T * dPdT_at(V) - P_at(V)) / (t * t);
  }

  // For S^R integral: integrand = (dP/dT)_V - R/V, from Vm to infinity
  function sIntegrand(t) {
    if (t < 1e-30) return 0;
    const V = 1 / t;
    return (dPdT_at(V) - R / V) / (t * t);
  }

  const tMax = 1 / Vm;
  const HR = R * T * (Z - 1) + gaussLegendre(hIntegrand, 0, tMax);
  const SR = R * Math.log(Z) + gaussLegendre(sIntegrand, 0, tMax);

  const lnPhi = (Z - 1) - Math.log(Z) - HR / (R * T) + (Z - 1) + SR / R;
  // Actually: ln(phi) = G^R/(RT) and G^R = H^R - T*S^R
  const GR = HR - T * SR;
  const lnPhiCorrect = GR / (R * T);
  const phi = Math.exp(lnPhiCorrect);
  const fugacity = phi * P;

  const UR = HR - R * T * (Z - 1);
  const AR = GR - R * T * (Z - 1);

  // Cv^R and Cp^R via numerical integration would require d2P/dT2
  // d2P/dT2 at volume V:
  // P = RT/(V-b) * exp(-a/(RTV))
  // dP/dT = R/(V-b) * exp(-a/(RTV)) * (1 + a/(RTV))
  // d2P/dT2 = R/(V-b) * exp(-a/(RTV)) * [a/(RTV)]^2 / T   ... after simplification:
  // d2P/dT2 = (a^2) / (R * T^3 * V^2 * (V-b)) * exp(-a/(RTV))
  function d2PdT2_at(V) {
    const eT = Math.exp(-aRT / V);
    return (a * a * eT) / (R * T * T * T * V * V * (V - b));
  }

  // Cv^R = -T * integral from Vm to inf of (d2P/dT2)_V dV
  function cvIntegrand(t) {
    if (t < 1e-30) return 0;
    const V = 1 / t;
    return d2PdT2_at(V) / (t * t);
  }

  const CvR = -T * gaussLegendre(cvIntegrand, 0, tMax);
  const CpR = CvR + T * dPdT * dPdT / (-dPdV) - R;

  return {
    density, phi, fugacity, HR, SR, UR, GR, AR, kappaT, alphaP, CvR, CpR,
  };
}

// --- Ideal Gas properties ---

export function idealProps(Z, Vm, T, P, M) {
  return {
    density: M / Vm,
    phi: 1,
    fugacity: P,
    HR: 0,
    SR: 0,
    UR: 0,
    GR: 0,
    AR: 0,
    kappaT: 1 / P,
    alphaP: 1 / T,
    CvR: 0,
    CpR: 0,
  };
}
