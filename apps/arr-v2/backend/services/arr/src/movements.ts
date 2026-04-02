/**
 * ARR Movement Analysis
 *
 * Computes period-over-period ARR movements from pre-built monthly snapshots.
 * Produces a standard SaaS waterfall breakdown per period:
 *   - New:         customers with ARR in current period but zero in prior
 *   - Expansion:   customers with higher ARR than prior period (delta > 0)
 *   - Contraction: customers with lower but non-zero ARR (delta < 0)
 *   - Churn:       customers with ARR in prior period but zero in current
 *
 * Magnitudes for contraction and churn are stored as positive numbers;
 * callers should negate them when rendering as waterfall negatives.
 */

import type { ArrSnapshot } from './types.js';

export interface ArrMovement {
  /** YYYY-MM period key */
  period: string;
  /** ARR at end of previous period (0 for first period) */
  openingArr: number;
  /** ARR added from new customers (0 → >0) */
  newArr: number;
  /** ARR added from existing customer expansions */
  expansionArr: number;
  /** ARR lost from existing customer contractions (positive magnitude) */
  contractionArr: number;
  /** ARR lost from full churn (positive magnitude) */
  churnArr: number;
  /** ARR at end of current period */
  closingArr: number;
  /** newArr + expansionArr - contractionArr - churnArr (should equal closingArr - openingArr) */
  netMovement: number;
  /** Number of newly added customers */
  newCustomers: number;
  /** Number of fully churned customers */
  churnedCustomers: number;
  /** Number of customers who expanded */
  expandedCustomers: number;
  /** Number of customers who contracted but not fully */
  contractedCustomers: number;
}

export interface ArrMovementsResult {
  movements: ArrMovement[];
  fromDate: string;
  toDate: string;
  /** Total new ARR across the entire range */
  totalNewArr: number;
  /** Total expansion ARR across the entire range */
  totalExpansionArr: number;
  /** Total contraction ARR across the entire range (positive magnitude) */
  totalContractionArr: number;
  /** Total churn ARR across the entire range (positive magnitude) */
  totalChurnArr: number;
  /** Net ARR change across the entire range */
  totalNetMovement: number;
}

export function buildArrMovements(
  snapshots: Map<string, ArrSnapshot>,
  from: string,
  to: string,
): ArrMovementsResult {
  const fromKey = from.slice(0, 7);
  const toKey = to.slice(0, 7);

  const orderedKeys = [...snapshots.keys()]
    .filter(k => k >= fromKey && k <= toKey)
    .sort();

  const movements: ArrMovement[] = [];

  for (let i = 0; i < orderedKeys.length; i++) {
    const key = orderedKeys[i];
    const current = snapshots.get(key)!;
    const prev = i > 0 ? snapshots.get(orderedKeys[i - 1])! : null;

    const prevByCustomer: Record<string, number> = prev?.byCustomer ?? {};
    const currByCustomer: Record<string, number> = current.byCustomer;

    let newArr = 0;
    let expansionArr = 0;
    let contractionArr = 0;
    let churnArr = 0;
    let newCustomers = 0;
    let expandedCustomers = 0;
    let contractedCustomers = 0;
    let churnedCustomers = 0;

    // Walk current-period customers
    for (const [customer, currArr] of Object.entries(currByCustomer)) {
      const prevArr = prevByCustomer[customer] ?? 0;
      if (prevArr === 0) {
        // Brand new or reactivated — treat as new ARR
        newArr += currArr;
        newCustomers += 1;
      } else {
        const delta = currArr - prevArr;
        if (delta > 0) {
          expansionArr += delta;
          expandedCustomers += 1;
        } else if (delta < 0) {
          contractionArr += Math.abs(delta);
          contractedCustomers += 1;
        }
        // delta === 0: flat, no movement bucket contribution
      }
    }

    // Walk prior-period customers no longer in current (churned)
    for (const [customer, prevArr] of Object.entries(prevByCustomer)) {
      if (!(customer in currByCustomer)) {
        churnArr += prevArr;
        churnedCustomers += 1;
      }
    }

    const openingArr = prev?.totalArr ?? 0;
    const closingArr = current.totalArr;
    const netMovement = newArr + expansionArr - contractionArr - churnArr;

    movements.push({
      period: key,
      openingArr,
      newArr,
      expansionArr,
      contractionArr,
      churnArr,
      closingArr,
      netMovement,
      newCustomers,
      churnedCustomers,
      expandedCustomers,
      contractedCustomers,
    });
  }

  const totalNewArr = movements.reduce((s, m) => s + m.newArr, 0);
  const totalExpansionArr = movements.reduce((s, m) => s + m.expansionArr, 0);
  const totalContractionArr = movements.reduce((s, m) => s + m.contractionArr, 0);
  const totalChurnArr = movements.reduce((s, m) => s + m.churnArr, 0);
  const totalNetMovement = totalNewArr + totalExpansionArr - totalContractionArr - totalChurnArr;

  return {
    movements,
    fromDate: from,
    toDate: to,
    totalNewArr,
    totalExpansionArr,
    totalContractionArr,
    totalChurnArr,
    totalNetMovement,
  };
}
