// Test T+1 settlement date calculation
import { getDefaultSettlementDate, addBusinessDays, isBusinessDay } from './shared/day-count.js';

console.log('Testing T+1 Settlement Date Calculation\n');

// Test current implementation
const today = new Date();
const defaultSettlement = getDefaultSettlementDate();

console.log(`Today: ${today.toDateString()} (${today.toISOString().split('T')[0]})`);
console.log(`Default Settlement (T+1): ${defaultSettlement}`);

// Test various scenarios
const testDates = [
  new Date('2024-06-17'), // Monday
  new Date('2024-06-18'), // Tuesday 
  new Date('2024-06-19'), // Wednesday
  new Date('2024-06-20'), // Thursday
  new Date('2024-06-21'), // Friday
  new Date('2024-06-22'), // Saturday
  new Date('2024-06-23'), // Sunday
];

console.log('\nTesting T+1 for different days of the week:');
testDates.forEach(testDate => {
  const dayName = testDate.toLocaleDateString('en-US', { weekday: 'long' });
  const t1Date = addBusinessDays(testDate, 1);
  const t1DayName = t1Date.toLocaleDateString('en-US', { weekday: 'long' });
  
  console.log(`${dayName} ${testDate.toISOString().split('T')[0]} + T+1 = ${t1DayName} ${t1Date.toISOString().split('T')[0]}`);
});

console.log('\nValidation:');
console.log('- Friday + T+1 should be Monday (skip weekend)');
console.log('- Saturday + T+1 should be Monday (skip weekend)'); 
console.log('- Sunday + T+1 should be Monday (skip weekend)');
console.log('- Weekdays + T+1 should be next business day');