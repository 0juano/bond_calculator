import { useCallback, useMemo } from 'react';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationRules {
  price: {
    min: number;
    max: number;
  };
  yield: {
    min: number;
    max: number;
  };
  spread: {
    min: number;
    max: number;
  };
}

// Static validation rules to avoid recreation
const DEFAULT_VALIDATION_RULES: ValidationRules = {
  price: {
    min: 5,
    max: 200
  },
  yield: {
    min: -5,
    max: 1000
  },
  spread: {
    min: -1000,
    max: 5000
  }
} as const;

export function useCalculatorValidation(rules: ValidationRules = DEFAULT_VALIDATION_RULES) {
  
  // Validate price input
  const validatePrice = useCallback((price: number): ValidationResult => {
    if (isNaN(price)) {
      return { isValid: false, error: 'Invalid price value' };
    }
    
    if (price < rules.price.min || price > rules.price.max) {
      return { 
        isValid: false, 
        error: `Price must be between ${rules.price.min} and ${rules.price.max} (as % of face value)` 
      };
    }
    
    return { isValid: true };
  }, [rules.price]);

  // Validate yield input
  const validateYield = useCallback((yieldValue: number): ValidationResult => {
    if (isNaN(yieldValue)) {
      return { isValid: false, error: 'Invalid yield value' };
    }
    
    if (yieldValue < rules.yield.min || yieldValue > rules.yield.max) {
      return { 
        isValid: false, 
        error: `Yield must be between ${rules.yield.min}% and ${rules.yield.max}%` 
      };
    }
    
    return { isValid: true };
  }, [rules.yield]);

  // Validate spread input
  const validateSpread = useCallback((spread: number): ValidationResult => {
    if (isNaN(spread)) {
      return { isValid: false, error: 'Invalid spread value' };
    }
    
    if (spread < rules.spread.min || spread > rules.spread.max) {
      return { 
        isValid: false, 
        error: `Spread must be between ${rules.spread.min} and ${rules.spread.max} basis points` 
      };
    }
    
    return { isValid: true };
  }, [rules.spread]);

  // Validate settlement date
  const validateSettlementDate = useCallback((dateString: string): ValidationResult => {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid settlement date' };
    }
    
    // Settlement date should not be too far in the past (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (date < oneYearAgo) {
      return { isValid: false, error: 'Settlement date cannot be more than 1 year in the past' };
    }
    
    // Settlement date should not be too far in the future (more than 10 years)
    const tenYearsFromNow = new Date();
    tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
    
    if (date > tenYearsFromNow) {
      return { isValid: false, error: 'Settlement date cannot be more than 10 years in the future' };
    }
    
    return { isValid: true };
  }, []);

  // Validate all inputs at once
  const validateAllInputs = useCallback((inputs: {
    price?: number;
    yieldValue?: number;
    spread?: number;
    settlementDate?: string;
  }): ValidationResult => {
    
    // Check price if provided
    if (inputs.price !== undefined) {
      const priceResult = validatePrice(inputs.price);
      if (!priceResult.isValid) return priceResult;
    }
    
    // Check yield if provided
    if (inputs.yieldValue !== undefined) {
      const yieldResult = validateYield(inputs.yieldValue);
      if (!yieldResult.isValid) return yieldResult;
    }
    
    // Check spread if provided
    if (inputs.spread !== undefined) {
      const spreadResult = validateSpread(inputs.spread);
      if (!spreadResult.isValid) return spreadResult;
    }
    
    // Check settlement date if provided
    if (inputs.settlementDate !== undefined) {
      const dateResult = validateSettlementDate(inputs.settlementDate);
      if (!dateResult.isValid) return dateResult;
    }
    
    return { isValid: true };
  }, [validatePrice, validateYield, validateSpread, validateSettlementDate]);

  // Utility function to check if calculation inputs are valid
  const hasValidCalculationInputs = useCallback((inputs: {
    price?: number;
    yieldValue?: number;
    spread?: number;
    lockedField?: 'PRICE' | 'YIELD' | 'SPREAD';
  }): boolean => {
    const hasInputValue = (
      (inputs.lockedField === 'PRICE' && inputs.price !== undefined) ||
      (inputs.lockedField === 'YIELD' && inputs.yieldValue !== undefined) ||
      (inputs.lockedField === 'SPREAD' && inputs.spread !== undefined) ||
      (!inputs.lockedField && inputs.price !== undefined)
    );
    
    if (!hasInputValue) return false;
    
    // Validate the specific input that's being used
    if (inputs.lockedField === 'PRICE' && inputs.price !== undefined) {
      return validatePrice(inputs.price).isValid;
    }
    
    if (inputs.lockedField === 'YIELD' && inputs.yieldValue !== undefined) {
      return validateYield(inputs.yieldValue).isValid;
    }
    
    if (inputs.lockedField === 'SPREAD' && inputs.spread !== undefined) {
      return validateSpread(inputs.spread).isValid;
    }
    
    if (!inputs.lockedField && inputs.price !== undefined) {
      return validatePrice(inputs.price).isValid;
    }
    
    return false;
  }, [validatePrice, validateYield, validateSpread]);

  return useMemo(() => ({
    validatePrice,
    validateYield,
    validateSpread,
    validateSettlementDate,
    validateAllInputs,
    hasValidCalculationInputs,
    rules
  }), [validatePrice, validateYield, validateSpread, validateSettlementDate, validateAllInputs, hasValidCalculationInputs, rules]);
}