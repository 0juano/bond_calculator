// Debug script to check amortization schedule math
const amortizationSchedule = [
  { date: "2027-01-09", principalPercent: 4.545 },
  { date: "2027-07-09", principalPercent: 4.545 },
  { date: "2028-01-09", principalPercent: 4.545 },
  { date: "2028-07-09", principalPercent: 4.545 },
  { date: "2029-01-09", principalPercent: 4.545 },
  { date: "2029-07-09", principalPercent: 4.545 },
  { date: "2030-01-09", principalPercent: 4.545 },
  { date: "2030-07-09", principalPercent: 4.545 },
  { date: "2031-01-09", principalPercent: 4.545 },
  { date: "2031-07-09", principalPercent: 4.545 },
  { date: "2032-01-09", principalPercent: 4.545 },
  { date: "2032-07-09", principalPercent: 4.545 },
  { date: "2033-01-09", principalPercent: 4.545 },
  { date: "2033-07-09", principalPercent: 4.545 },
  { date: "2034-01-09", principalPercent: 4.545 },
  { date: "2034-07-09", principalPercent: 4.545 },
  { date: "2035-01-09", principalPercent: 4.545 },
  { date: "2035-07-09", principalPercent: 4.545 },
  { date: "2036-01-09", principalPercent: 4.545 },
  { date: "2036-07-09", principalPercent: 4.545 },
  { date: "2037-01-09", principalPercent: 4.545 },
  { date: "2037-07-09", principalPercent: 4.545 }
];

console.log('🔍 Amortization Schedule Analysis:');
console.log(`📊 Number of payments: ${amortizationSchedule.length}`);

const totalPercent = amortizationSchedule.reduce((sum, payment) => sum + payment.principalPercent, 0);
console.log(`📊 Total principal percent: ${totalPercent.toFixed(3)}%`);

const faceValue = 1000;
const totalPrincipalDollar = (totalPercent / 100) * faceValue;
console.log(`📊 Total principal dollar: $${totalPrincipalDollar.toFixed(2)}`);

console.log('📅 Payment Schedule:');
amortizationSchedule.forEach((payment, index) => {
  const dollarAmount = (payment.principalPercent / 100) * faceValue;
  console.log(`  ${index + 1}. ${payment.date}: ${payment.principalPercent}% = $${dollarAmount.toFixed(2)}`);
});

// Estimate total cash flows for the bond
const couponRate = 5.0; // Final step-up rate
const paymentFrequency = 2;
const periodsPerYear = paymentFrequency;
const issueYear = 2020;
const maturityYear = 2038;
const totalYears = maturityYear - issueYear; // 18 years
const totalPayments = totalYears * periodsPerYear; // 36 payments

console.log('\n🔍 Expected Cash Flow Analysis:');
console.log(`📊 Bond life: ${totalYears} years = ${totalPayments} payments`);

// Estimate total coupons (simplified - assumes 5% for most of life)
const avgCouponRate = 4.0; // Rough average across step-up schedule
const semiAnnualCoupon = (avgCouponRate / 100) / periodsPerYear;
const totalCoupons = totalPayments * semiAnnualCoupon * faceValue;

console.log(`📊 Estimated total coupons: ${totalPayments} payments × ${(semiAnnualCoupon * faceValue).toFixed(2)} = $${totalCoupons.toFixed(2)}`);
console.log(`📊 Principal repayment: $${faceValue.toFixed(2)}`);
console.log(`📊 Total expected cash flows: $${(totalCoupons + faceValue).toFixed(2)}`);

console.log('\n❌ Problem Analysis:');
console.log(`📊 Actual total from server logs: $1362.525`);
console.log(`📊 Expected total: $${(totalCoupons + faceValue).toFixed(2)}`);
console.log(`📊 Difference: $${(1362.525 - (totalCoupons + faceValue)).toFixed(2)}`);

if (1362.525 > (totalCoupons + faceValue)) {
  console.log('❌ Cash flows are INFLATED - likely double-counting somewhere');
} else {
  console.log('✅ Cash flows are within expected range');
}