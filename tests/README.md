# Tests Directory

This directory contains all test files and debugging scripts for the bond calculator.

## Structure

- **`unit/`** - Individual component and function tests
- **`integration/`** - Full calculator workflow tests  
- **`debug/`** - Debug scripts and development tools
- **HTML files** - Browser-based test interfaces

## Running Tests

Most test files are standalone Node.js scripts that can be run directly:

```bash
# Run a specific test
node tests/integration/test-calculator.js

# Run debug script
node tests/debug/debug-amortization.js
```

## Test Categories

### Unit Tests
- `test-simple-bond.js` - Basic bond calculations
- `test-single-bond.js` - Individual bond testing

### Integration Tests  
- `test-calculator.js` - Full calculator testing
- `test-argentina-*.js` - Argentina sovereign bond tests
- `test-bloomberg-validation.js` - Bloomberg reference validation
- `test-price-fix-validation.js` - Price calculation fixes

### Debug Scripts
- `debug-amortization.js` - Amortization debugging
- `debug-ytm-comparison.js` - YTM calculation analysis
- `debug-price-interpretation.js` - Price conversion debugging