const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testApi() {
  try {
    const adminId = '1ed1fdcb-e92c-4597-9928-ef0d45ae9c1e'; // From scratch.js
    const token = jwt.sign({ id: adminId, role: 'ADMIN' }, 'your_secret_key', { expiresIn: '1h' });
    
    // 2. Call create event
    const payload = {
      title: 'Test API Event',
      description: 'Desc',
      venue: 'Venue',
      startDate: new Date(Date.now() + 86400000).toISOString(),
    };
    
    const res = await axios.post('http://localhost:3000/api/admin/events', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Success:', res.data);
  } catch(err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

testApi();
