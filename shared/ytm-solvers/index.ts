/**
 * YTM Solvers Export - Clean API for bond calculator integration
 */

export { YTMSolver, CashFlowData, YTMResult } from './ytm-interface';
export { CurrentYTMSolver } from './current-solver';
export { FormulaXIRRSolver } from './formula-xirr';
export { DualYTMSolver, DualYTMResult } from './dual-ytm-solver';

// Convenience factory
import { DualYTMSolver } from './dual-ytm-solver';
export const createDualYTMSolver = () => new DualYTMSolver();