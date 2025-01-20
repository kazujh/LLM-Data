const axios = require('axios');

async function testFileUpload() {
    try {
        const response = await axios.post('http://localhost:3000/files/upload', {
            filePath: './test.txt',
            fileName: 'test.txt'
        });
        console.log('Upload response:', response.data);

        const fileList = await axios.get('http://localhost:3000/files');
        console.log('File list:'. fileList.data);
    } catch(error) {
        console.error('Error:', error.message);
    }
}

testFileUpload();