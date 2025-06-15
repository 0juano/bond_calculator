// List available bonds
import fetch from 'node-fetch';

async function listBonds() {
  try {
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    
    console.log('📋 Available bonds:');
    savedBonds.bonds.forEach((bond, i) => {
      console.log(`${i+1}. ${bond.bondInfo.issuer} ${bond.bondInfo.maturityDate}`);
      console.log(`   ISIN: ${bond.bondInfo.isin || 'N/A'}`);
      console.log(`   File: ${bond.filename}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Failed to list bonds:', error.message);
  }
}

listBonds();