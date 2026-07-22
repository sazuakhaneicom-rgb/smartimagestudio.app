const fs = require('fs');

async function run() {
  try {
    const formData = new FormData();
    // Use an existing image or create a dummy one
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'test.png');
    
    console.log('Sending request...');
    const response = await fetch('http://127.0.0.1:5001/smart-image-73059/us-central1/processImage', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key-123'
      },
      body: formData
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text.substring(0, 500));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
