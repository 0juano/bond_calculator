# Saved Bonds

This directory contains bond JSON files saved from the Bond Builder for later use in the BondTerminal.

## Structure

```
saved_bonds/
├── README.md
├── index.ts                    # Registry of saved bonds
├── user_created/              # User-created bonds
├── golden_bonds/              # Reference/template bonds
└── imported/                  # Bonds imported from external sources
```

## Bond JSON Format

All saved bonds follow the `CleanBondDefinition` schema with **exogenous variables only**:

```json
{
  "metadata": {
    "id": "bond_1234567890_abc123def",
    "name": "US Treasury 5% 2029",
    "created": "2025-06-09T10:00:00.000Z",
    "modified": "2025-06-09T10:00:00.000Z",
    "version": "1.0",
    "source": "USER_CREATED"
  },
  "bondInfo": {
    "issuer": "US TREASURY",
    "faceValue": 1000,
    "couponRate": 5.0,
    "issueDate": "2024-01-15",
    "maturityDate": "2029-01-15",
    // ... other bond parameters
  },
  "features": {
    "isAmortizing": false,
    "isCallable": false,
    // ... other flags
  },
  "cashFlowSchedule": [
    // ... predefined cash flows
  ]
}
```

## Usage

### Saving Bonds
- Use the **SAVE** button in Bond Builder to save bonds to this repository
- Bonds are saved with descriptive filenames: `{issuer}_{coupon}pct_{maturity}_{timestamp}.json`

### Loading Bonds
- Saved bonds can be loaded into the BondTerminal
- Use the bond registry (`index.ts`) to manage available bonds

### Exporting vs. Saving
- **SAVE**: Stores in repository for later BondTerminal use
- **EXPORT**: Downloads files for user's local machine

## File Naming Convention

Format: `{issuer}_{couponRate}pct_{maturityDate}_{timestamp}.json`

Examples:
- `US_TREASURY_5_0pct_20290115_2025-06-09.json`
- `REPUBLIC_OF_ARGENTINA_1_25pct_20270715_2025-06-09.json` 