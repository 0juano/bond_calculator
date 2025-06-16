// Comprehensive Bloomberg Validation Test Suite
// Tests ALL Argentina bonds against real Bloomberg terminal data
import fetch from 'node-fetch';

// Bloomberg Reference Data from docs/bloomberg-reference-data.md
const BLOOMBERG_TARGETS = [
  {
    name: "Argentina 2029 (GD29)",
    price: 84.10,
    expectedYTM: 9.99,
    expectedDuration: 1.80,
    expectedSpread: 602,
    bondFile: "GD29_ARGENTINA_100pct_20290709.json",
    notes: "Argentina 2029"
  },
  {
    name: "Argentina 2030 (GD30)", 
    price: 80.19,
    expectedYTM: 10.45,
    expectedDuration: 2.19,
    expectedSpread: 646,
    bondFile: "GD30_ARGENTINA_075pct_20300709.json",
    notes: "Argentina 2030"
  },
  {
    name: "Argentina 2038 (GD38)",
    price: 72.25,
    expectedYTM: 10.88,
    expectedDuration: 5.01,
    expectedSpread: 660,
    bondFile: "GD38_ARGENTINA_5pct_20380109.json", 
    notes: "Argentina 2038"
  },
  {
    name: "Argentina 2046 (GD46)",
    price: 66.13,
    expectedYTM: 10.78,
    expectedDuration: 5.73,
    expectedSpread: 627,
    bondFile: "GD46_ARGENTINA_0125pct_20460709.json", // CORRECTED filename
    notes: "Argentina 2046"
  },
  {
    name: "Argentina 2035 (GD35)",
    price: 68.24,
    expectedYTM: 10.83,
    expectedDuration: 5.77,
    expectedSpread: 655,
    bondFile: "GD35_ARGENTINA_4125pct_20350709.json", // CORRECTED filename  
    notes: "Argentina 2035"
  },
  {
    name: "Argentina 2041 (GD41)",
    price: 63.13,
    expectedYTM: 10.83,
    expectedDuration: 6.16,
    expectedSpread: 642,
    bondFile: "GD41_ARGENTINA_0125pct_20410709.json", // CORRECTED filename
    notes: "Argentina 2041"
  }
];

// Validation tolerances
const TOLERANCES = {
  ytm: 1.0,        // ±1% absolute difference for YTM
  duration: 0.5,   // ±0.5 years absolute difference for duration
  spread: 100      // ±100 basis points absolute difference for spread
};

async function loadBondFromFile(bondFile) {
  console.log(`📄 Loading bond definition from: ${bondFile}`);
  
  try {
    const response = await fetch(`http://localhost:3000/api/bonds/saved`);
    const savedBonds = await response.json();
    
    const bondRecord = savedBonds.bonds.find(b => b.filename === bondFile);
    if (!bondRecord) {
      throw new Error(`Bond file ${bondFile} not found in saved bonds`);
    }
    
    // Convert from saved format to calculation format
    const bondData = {
      ...bondRecord.bondInfo,
      isAmortizing: bondRecord.features.isAmortizing,
      isCallable: bondRecord.features.isCallable,
      isPuttable: bondRecord.features.isPuttable,
      isVariableCoupon: bondRecord.features.isVariableCoupon,
      amortizationSchedule: bondRecord.schedules.amortizationSchedule || [],
      callSchedule: bondRecord.schedules.callSchedule || [],
      putSchedule: bondRecord.schedules.putSchedule || [],
      couponRateChanges: bondRecord.schedules.couponRateChanges || [],
      predefinedCashFlows: bondRecord.cashFlowSchedule // Use pre-calculated cash flows
    };
    
    return bondData;
  } catch (error) {
    console.error(`❌ Failed to load bond ${bondFile}:`, error.message);
    return null;
  }
}

async function testBondCalculation(bondData, marketPrice) {
  const calculationRequest = {
    ...bondData,
    settlementDate: "2025-06-13", // Standard settlement date
    marketPrice: marketPrice
  };

  try {
    const response = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calculationRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    
    if (result.status !== 'success' && result.status !== 'SUCCESS') {
      return { error: `Calculator status: ${result.status}` };
    }

    return {
      ytm: result.analytics?.yieldToMaturity,
      duration: result.analytics?.duration,
      spread: result.analytics?.spread,
      cleanPrice: result.analytics?.cleanPrice,
      accruedInterest: result.analytics?.accruedInterest
    };
  } catch (error) {
    return { error: error.message };
  }
}

function validateResult(actual, expected, tolerance, metric) {
  if (actual === undefined || actual === null) {
    return { pass: false, message: `${metric}: No value returned` };
  }
  
  if (actual < 0) {
    return { pass: false, message: `${metric}: Negative value (${actual.toFixed(2)})` };
  }
  
  if (metric === 'YTM' && actual > 50) {
    return { pass: false, message: `${metric}: Unrealistic high value (${actual.toFixed(2)}%)` };
  }
  
  const difference = Math.abs(actual - expected);
  const pass = difference <= tolerance;
  
  return {
    pass,
    message: `${metric}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} (diff: ${difference.toFixed(2)}, tolerance: ±${tolerance})`
  };
}

function checkForSillyResults(result) {
  const issues = [];
  
  if (result.ytm !== undefined) {
    if (result.ytm < -10) issues.push(`Extremely negative YTM: ${result.ytm.toFixed(2)}%`);
    if (result.ytm > 50) issues.push(`Unrealistically high YTM: ${result.ytm.toFixed(2)}%`);
  }
  
  if (result.duration !== undefined) {
    if (result.duration < 0) issues.push(`Negative duration: ${result.duration.toFixed(2)}`);
    if (result.duration > 30) issues.push(`Extremely high duration: ${result.duration.toFixed(2)}`);
  }
  
  if (result.spread !== undefined) {
    if (result.spread < -2000) issues.push(`Extremely negative spread: ${result.spread.toFixed(0)}bp`);
    if (result.spread > 5000) issues.push(`Unrealistically high spread: ${result.spread.toFixed(0)}bp`);
  }
  
  return issues;
}

async function runBloombergValidation() {
  console.log('🏦 Bloomberg Terminal Validation Test Suite');
  console.log('🎯 Testing against real market data from Bloomberg Professional Terminal');
  console.log(`📊 Testing ${BLOOMBERG_TARGETS.length} Argentina sovereign bonds\n`);
  
  let totalTests = 0;
  let passedTests = 0;
  const failedBonds = [];
  
  for (const target of BLOOMBERG_TARGETS) {
    console.log(`\n🔍 Testing ${target.name}`);
    console.log(`📄 Bond file: ${target.bondFile}`);
    console.log(`💰 Bloomberg price: ${target.price}% → YTM: ${target.expectedYTM}%, Duration: ${target.expectedDuration}, Spread: ${target.expectedSpread}bp`);
    
    // Load bond definition
    const bondData = await loadBondFromFile(target.bondFile);
    if (!bondData) {
      console.log(`❌ FAIL: Could not load bond definition`);
      failedBonds.push({ name: target.name, reason: 'Bond definition not found' });
      continue;
    }
    
    // Calculate bond analytics
    console.log(`🧮 Calculating with price ${target.price}%...`);
    const result = await testBondCalculation(bondData, target.price);
    
    if (result.error) {
      console.log(`❌ FAIL: ${result.error}`);
      failedBonds.push({ name: target.name, reason: result.error });
      continue;
    }
    
    // Check for silly results first
    const sillyIssues = checkForSillyResults(result);
    if (sillyIssues.length > 0) {
      console.log(`❌ SILLY RESULTS DETECTED:`);
      sillyIssues.forEach(issue => console.log(`   🚨 ${issue}`));
      failedBonds.push({ name: target.name, reason: 'Silly results: ' + sillyIssues.join(', ') });
      continue;
    }
    
    // Validate each metric
    const ytmValidation = validateResult(result.ytm, target.expectedYTM, TOLERANCES.ytm, 'YTM');
    const durationValidation = validateResult(result.duration, target.expectedDuration, TOLERANCES.duration, 'Duration');
    const spreadValidation = validateResult(result.spread, target.expectedSpread, TOLERANCES.spread, 'Spread');
    
    console.log(`📊 Results:`);
    console.log(`   ${ytmValidation.pass ? '✅' : '❌'} ${ytmValidation.message}`);
    console.log(`   ${durationValidation.pass ? '✅' : '❌'} ${durationValidation.message}`);
    console.log(`   ${spreadValidation.pass ? '✅' : '❌'} ${spreadValidation.message}`);
    
    totalTests += 3; // YTM, Duration, Spread
    if (ytmValidation.pass) passedTests++;
    if (durationValidation.pass) passedTests++;
    if (spreadValidation.pass) passedTests++;
    
    const bondPassed = ytmValidation.pass && durationValidation.pass && spreadValidation.pass;
    if (!bondPassed) {
      const failureReasons = [];
      if (!ytmValidation.pass) failureReasons.push(ytmValidation.message);
      if (!durationValidation.pass) failureReasons.push(durationValidation.message);
      if (!spreadValidation.pass) failureReasons.push(spreadValidation.message);
      
      failedBonds.push({ 
        name: target.name, 
        reason: failureReasons.join('; '),
        actual: result,
        expected: target
      });
    }
    
    console.log(`${bondPassed ? '✅ PASS' : '❌ FAIL'}: ${target.name}`);
  }
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 BLOOMBERG VALIDATION SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Passed: ${passedTests}/${totalTests} individual tests (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} individual tests`);
  console.log(`🏦 Bonds passed: ${BLOOMBERG_TARGETS.length - failedBonds.length}/${BLOOMBERG_TARGETS.length}`);
  
  if (failedBonds.length > 0) {
    console.log(`\n❌ FAILED BONDS:`);
    failedBonds.forEach(bond => {
      console.log(`   🔴 ${bond.name}: ${bond.reason}`);
    });
    
    console.log(`\n🚨 CALCULATOR IS NOT WORKING CORRECTLY`);
    console.log(`🔧 Issues need to be fixed before claiming calculator is working`);
  } else {
    console.log(`\n🎉 ALL TESTS PASSED!`);
    console.log(`✅ Calculator is validated against Bloomberg Professional Terminal data`);
  }
  
  return {
    totalTests,
    passedTests,
    failedBonds,
    success: failedBonds.length === 0
  };
}

// Run the validation
runBloombergValidation().catch(error => {
  console.error('💥 Validation test suite crashed:', error);
});