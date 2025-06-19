# Tests Directory

This directory contains core test files for the BondTerminal, focused on essential validation and functionality testing.

## Structure

- **`unit/`** - Individual component and function tests
- **`integration/`** - Full calculator workflow tests and Bloomberg validation

## Running Tests

All test files are standalone Node.js scripts that can be run directly:

```bash
# Run unit tests
node tests/unit/test-simple-bond.js
node tests/unit/test-single-bond.js

# Run integration tests
node tests/integration/test-calculator.js
node tests/integration/test-bloomberg-validation.js
node tests/integration/test-argentina-2038.js
```

## Test Categories

### Unit Tests
- **`test-simple-bond.js`** - Basic bond calculations and core functionality
- **`test-single-bond.js`** - Individual bond testing scenarios

### Integration Tests  
- **`test-calculator.js`** - Full BondTerminal workflow testing
- **`test-bloomberg-validation.js`** - ⭐ **Critical** - Validates against real Bloomberg terminal data for all Argentina bonds
- **`test-argentina-2038.js`** - Specific testing for Argentina 2038 bond (GD38)

## Bloomberg Validation

The **`test-bloomberg-validation.js`** is the most important test as it validates BondTerminal accuracy against professional Bloomberg terminal data for:
- Argentina 2029 (GD29), 2030 (GD30), 2035 (GD35), 2038 (GD38), 2041 (GD41), 2046 (GD46)
- Expected YTM, duration, and spread values
- Ensures BondTerminal matches professional-grade accuracy

## Notes

- All debug scripts and redundant test files have been cleaned up
- Tests focus on core functionality and Bloomberg validation
- XIRR YTM system has eliminated previous calculation instability issues