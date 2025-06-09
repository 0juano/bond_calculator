/**
 * Bond Registry - Central index of all saved bonds
 * This file maintains a registry of available bonds for the calculator
 */

import { CleanBondDefinition } from '../shared/bond-definition';

export interface BondRegistryEntry {
  id: string;
  filename: string;
  category: 'user_created' | 'golden_bonds' | 'imported';
  metadata: {
    name: string;
    issuer: string;
    couponRate: number;
    maturityDate: string;
    created: string;
    source: string;
  };
}

/**
 * Registry of all saved bonds
 * This is automatically updated when bonds are saved
 */
export const BOND_REGISTRY: Record<string, BondRegistryEntry> = {
  // Example entries will be added here automatically when bonds are saved
};

/**
 * Get all available bonds by category
 */
export function getBondsByCategory(category?: 'user_created' | 'golden_bonds' | 'imported'): BondRegistryEntry[] {
  const allBonds = Object.values(BOND_REGISTRY);
  
  if (!category) {
    return allBonds;
  }
  
  return allBonds.filter(bond => bond.category === category);
}

/**
 * Get bond registry entry by ID
 */
export function getBondById(id: string): BondRegistryEntry | null {
  return BOND_REGISTRY[id] || null;
}

/**
 * Add bond to registry (called when saving bonds)
 */
export function addBondToRegistry(bond: CleanBondDefinition, filename: string, category: 'user_created' | 'golden_bonds' | 'imported'): void {
  BOND_REGISTRY[bond.metadata.id] = {
    id: bond.metadata.id,
    filename,
    category,
    metadata: {
      name: bond.metadata.name,
      issuer: bond.bondInfo.issuer,
      couponRate: bond.bondInfo.couponRate,
      maturityDate: bond.bondInfo.maturityDate,
      created: bond.metadata.created,
      source: bond.metadata.source,
    }
  };
}

/**
 * Remove bond from registry
 */
export function removeBondFromRegistry(id: string): void {
  delete BOND_REGISTRY[id];
}

/**
 * Search bonds by criteria
 */
export function searchBonds(criteria: {
  issuer?: string;
  couponRange?: [number, number];
  maturityAfter?: string;
  maturityBefore?: string;
}): BondRegistryEntry[] {
  return Object.values(BOND_REGISTRY).filter(bond => {
    if (criteria.issuer && !bond.metadata.issuer.toLowerCase().includes(criteria.issuer.toLowerCase())) {
      return false;
    }
    
    if (criteria.couponRange) {
      const [min, max] = criteria.couponRange;
      if (bond.metadata.couponRate < min || bond.metadata.couponRate > max) {
        return false;
      }
    }
    
    if (criteria.maturityAfter && bond.metadata.maturityDate < criteria.maturityAfter) {
      return false;
    }
    
    if (criteria.maturityBefore && bond.metadata.maturityDate > criteria.maturityBefore) {
      return false;
    }
    
    return true;
  });
} 