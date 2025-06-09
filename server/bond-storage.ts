/**
 * Server-side Bond Storage Service
 * Handles saving/loading bonds to/from the repository file system
 */

import fs from 'fs/promises';
import path from 'path';
import { CleanBondDefinition, BondJsonUtils } from '../shared/bond-definition';

export class BondStorageService {
  private static readonly SAVED_BONDS_DIR = path.join(process.cwd(), 'saved_bonds');
  
  /**
   * Save bond to repository file system
   */
  static async saveBond(
    bond: CleanBondDefinition, 
    category: 'user_created' | 'golden_bonds' | 'imported' = 'user_created'
  ): Promise<{ success: boolean; filename: string; path: string }> {
    try {
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
        path: ''
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
  }>> {
    const results: Array<{
      filename: string;
      category: string;
      metadata: CleanBondDefinition['metadata'];
      bondInfo: CleanBondDefinition['bondInfo'];
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
              bondInfo: bond.bondInfo
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