/**
 * Server-side Bond Storage Service
 * Handles saving/loading bonds to/from the repository file system
 */

import fs from 'fs/promises';
import path from 'path';
import { CleanBondDefinition, BondJsonUtils } from '../shared/bond-definition';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType?: 'ISIN' | 'CUSIP' | 'BOND_MATCH';
  existingBond?: {
    filename: string;
    category: string;
    bondInfo: CleanBondDefinition['bondInfo'];
  };
  message?: string;
}

export class BondStorageService {
  private static readonly SAVED_BONDS_DIR = path.join(process.cwd(), 'saved_bonds');
  
  /**
   * Check for duplicate bonds before saving
   */
  static async checkForDuplicates(newBond: CleanBondDefinition): Promise<DuplicateCheckResult> {
    try {
      console.log(`🔍 Starting duplicate check for: ${newBond.bondInfo.issuer} (ISIN: ${newBond.bondInfo.isin || 'none'})`);
      
      const allBonds = await this.getAllBondsWithMetadata();
      console.log(`🔍 Found ${allBonds.length} existing bonds to compare`);
      
      if (allBonds.length === 0) {
        console.log('✅ No existing bonds to compare against');
        return { isDuplicate: false };
      }
      
      for (let i = 0; i < allBonds.length; i++) {
        const existingBond = allBonds[i];
        console.log(`📋 [${i+1}/${allBonds.length}] Comparing with: ${existingBond.bondInfo.issuer} (ISIN: ${existingBond.bondInfo.isin || 'none'})`);
        
        // Simple ISIN check first
        if (newBond.bondInfo.isin && existingBond.bondInfo.isin) {
          console.log(`🔍 Comparing ISINs: "${newBond.bondInfo.isin}" vs "${existingBond.bondInfo.isin}"`);
          if (newBond.bondInfo.isin === existingBond.bondInfo.isin) {
            console.log(`🚨 ISIN DUPLICATE FOUND! "${newBond.bondInfo.isin}" matches existing bond: ${existingBond.bondInfo.issuer}`);
            return {
              isDuplicate: true,
              duplicateType: 'ISIN',
              existingBond: {
                filename: existingBond.filename,
                category: existingBond.category,
                bondInfo: existingBond.bondInfo
              },
              message: `Bond with ISIN ${newBond.bondInfo.isin} already exists: ${existingBond.bondInfo.issuer} ${existingBond.bondInfo.couponRate}% ${existingBond.bondInfo.maturityDate}`
            };
          }
        }
        
        // CUSIP check
        if (newBond.bondInfo.cusip && existingBond.bondInfo.cusip) {
          console.log(`🔍 Comparing CUSIPs: "${newBond.bondInfo.cusip}" vs "${existingBond.bondInfo.cusip}"`);
          if (newBond.bondInfo.cusip === existingBond.bondInfo.cusip) {
            console.log(`🚨 CUSIP DUPLICATE FOUND! "${newBond.bondInfo.cusip}" matches existing bond: ${existingBond.bondInfo.issuer}`);
            return {
              isDuplicate: true,
              duplicateType: 'CUSIP',
              existingBond: {
                filename: existingBond.filename,
                category: existingBond.category,
                bondInfo: existingBond.bondInfo
              },
              message: `Bond with CUSIP ${newBond.bondInfo.cusip} already exists: ${existingBond.bondInfo.issuer} ${existingBond.bondInfo.couponRate}% ${existingBond.bondInfo.maturityDate}`
            };
          }
        }
      }
      
      console.log('✅ No duplicates found after checking all bonds');
      return { isDuplicate: false };
    } catch (error) {
      console.error('❌ Error in checkForDuplicates:', error);
      return { isDuplicate: false };
    }
  }
  
  /**
   * Save bond to repository file system with duplicate checking
   */
  static async saveBond(
    bond: CleanBondDefinition, 
    category: 'user_created' | 'golden_bonds' | 'imported' = 'user_created',
    allowDuplicates: boolean = false
  ): Promise<{ success: boolean; filename: string; path: string; error?: string; duplicateCheck?: DuplicateCheckResult }> {
    try {
      console.log(`💾 SAVE BOND CALLED: Issuer=${bond.bondInfo.issuer}, ISIN=${bond.bondInfo.isin}, allowDuplicates=${allowDuplicates}, type=${typeof allowDuplicates}`);
      
      // FORCE duplicate checking for debugging
      if (allowDuplicates !== true) {
        console.log('🔍 Running duplicate check...');
        const duplicateCheck = await this.checkForDuplicates(bond);
        console.log('🔍 Duplicate check completed:', duplicateCheck);
        if (duplicateCheck.isDuplicate) {
          console.log('❌ DUPLICATE DETECTED! Blocking save. Type:', duplicateCheck.duplicateType, 'Message:', duplicateCheck.message);
          return {
            success: false,
            filename: '',
            path: '',
            error: duplicateCheck.message,
            duplicateCheck
          };
        } else {
          console.log('✅ No duplicates found, proceeding with save');
        }
      } else {
        console.log('⚠️  Skipping duplicate check (allowDuplicates=true)');
      }
      
      // Ensure directory exists
      const categoryDir = path.join(this.SAVED_BONDS_DIR, category);
      await fs.mkdir(categoryDir, { recursive: true });
      
      // Generate filename
      const filename = BondJsonUtils.generateFilename(bond);
      const filepath = path.join(categoryDir, filename);
      
      // Save bond JSON
      await fs.writeFile(filepath, JSON.stringify(bond, null, 2), 'utf-8');
      
      console.log(`📁 Bond saved to repository: ${filepath}`);
      
      return {
        success: true,
        filename,
        path: filepath
      };
    } catch (error) {
      console.error('❌ Failed to save bond:', error);
      return {
        success: false,
        filename: '',
        path: '',
        error: error instanceof Error ? error.message : 'Failed to save bond'
      };
    }
  }
  
  /**
   * Load bond from repository
   */
  static async loadBond(filename: string, category: string = 'user_created'): Promise<CleanBondDefinition | null> {
    try {
      const filepath = path.join(this.SAVED_BONDS_DIR, category, filename);
      const fileContent = await fs.readFile(filepath, 'utf-8');
      const bond = JSON.parse(fileContent) as CleanBondDefinition;
      
      // Validate the bond structure
      if (!BondJsonUtils.validateBondJson(bond)) {
        throw new Error('Invalid bond JSON structure');
      }
      
      return bond;
    } catch (error) {
      console.error(`❌ Failed to load bond ${filename}:`, error);
      return null;
    }
  }
  
  /**
   * List all saved bonds in a category
   */
  static async listBonds(category: string = 'user_created'): Promise<string[]> {
    try {
      const categoryDir = path.join(this.SAVED_BONDS_DIR, category);
      const files = await fs.readdir(categoryDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error(`❌ Failed to list bonds in ${category}:`, error);
      return [];
    }
  }
  
  /**
   * Delete saved bond
   */
  static async deleteBond(filename: string, category: string = 'user_created'): Promise<boolean> {
    try {
      const filepath = path.join(this.SAVED_BONDS_DIR, category, filename);
      await fs.unlink(filepath);
      console.log(`🗑️ Bond deleted: ${filepath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete bond ${filename}:`, error);
      return false;
    }
  }
  
  /**
   * Get all saved bonds with metadata
   */
  static async getAllBondsWithMetadata(): Promise<Array<{
    filename: string;
    category: string;
    metadata: CleanBondDefinition['metadata'];
    bondInfo: CleanBondDefinition['bondInfo'];
    features: CleanBondDefinition['features'];
    schedules: CleanBondDefinition['schedules'];
    cashFlowSchedule: CleanBondDefinition['cashFlowSchedule'];
  }>> {
    const results: Array<{
      filename: string;
      category: string;
      metadata: CleanBondDefinition['metadata'];
      bondInfo: CleanBondDefinition['bondInfo'];
      features: CleanBondDefinition['features'];
      schedules: CleanBondDefinition['schedules'];
      cashFlowSchedule: CleanBondDefinition['cashFlowSchedule'];
    }> = [];
    
    const categories = ['user_created', 'golden_bonds', 'imported'];
    
    for (const category of categories) {
      try {
        const files = await this.listBonds(category);
        
        for (const filename of files) {
          const bond = await this.loadBond(filename, category);
          if (bond) {
            results.push({
              filename,
              category,
              metadata: bond.metadata,
              bondInfo: bond.bondInfo,
              features: bond.features,
              schedules: bond.schedules,
              cashFlowSchedule: bond.cashFlowSchedule
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error processing category ${category}:`, error);
      }
    }
    
    return results;
  }
} 