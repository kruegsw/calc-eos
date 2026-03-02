// Ideal Gas Law: PV = nRT
// R = 8.314 J/(mol·K)

const R = 8.314;

/**
 * Solve the Ideal Gas Law for a single unknown variable.
 *
 * @param {Object} params
 * @param {number} [params.P] - Pressure in Pa
 * @param {number} [params.V] - Volume in m³
 * @param {number} [params.T] - Temperature in K
 * @param {number} [params.n] - Amount in mol
 * @param {string} solveFor - Which variable to solve for: "P", "V", "T", or "n"
 * @returns {{ value: number, variable: string, unit: string, inputs: Object }}
 */
export function idealGas({ P, V, T, n }, solveFor) {
  switch (solveFor) {
    case 'P':
      if (V <= 0) throw new Error('Volume must be positive');
      return {
        variable: 'P',
        value: (n * R * T) / V,
        unit: 'Pa',
        inputs: { V, T, n },
      };
    case 'V':
      if (P <= 0) throw new Error('Pressure must be positive');
      return {
        variable: 'V',
        value: (n * R * T) / P,
        unit: 'm³',
        inputs: { P, T, n },
      };
    case 'T':
      if (n <= 0) throw new Error('Moles must be positive');
      if (R === 0) throw new Error('Unexpected error');
      return {
        variable: 'T',
        value: (P * V) / (n * R),
        unit: 'K',
        inputs: { P, V, n },
      };
    case 'n':
      if (R === 0) throw new Error('Unexpected error');
      if (T <= 0) throw new Error('Temperature must be positive');
      return {
        variable: 'n',
        value: (P * V) / (R * T),
        unit: 'mol',
        inputs: { P, V, T },
      };
    default:
      throw new Error(`Unknown variable: ${solveFor}`);
  }
}

export { R };
