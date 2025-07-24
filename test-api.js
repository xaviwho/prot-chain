// Simple test to see what the API actually returns
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testStructureAPI() {
  try {
    // Test with a simple PDB content
    const pdbContent = `HEADER    TRANSFERASE/DNA                         20-JUN-96   1ABC              
ATOM      1  N   ALA A   1      20.154  16.967  14.421  1.00 11.99           N  
ATOM      2  CA  ALA A   1      19.030  16.101  14.618  1.00 12.57           C  
END`;
    
    const formData = new FormData();
    formData.append('file', Buffer.from(pdbContent), 'test.pdb');
    
    console.log('Testing structure API...');
    const response = await axios.post('http://localhost:3000/api/workflow/test123/structure', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('API Test Failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testStructureAPI();
