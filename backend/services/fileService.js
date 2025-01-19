const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const { getDatabase } = require('./dbService');

async function setupGridFS() {
    const db = getDatabase();
    return new GridFSBucket(db, { bucketName: 'files' });
}

async function uploadFile(filePath, fileName) {
    const bucket = await setupGridFS();
    return new Promise((resolve, reject) => {
        const stream = bucket.openUploadStream(fileName);
        fs.createReadStream(filePath).pipe(stream)
            .on('error', (err) => reject(err))
            .on('finish', () => resolve(`${fileName} uploaded successfully`));
    });
}

async function downloadFile(fileName, res) {
    const bucket = await setupGridFS();
    const stream = bucket.openDownloadStreamByName(fileName);
    stream.pipe(res).on('error', (err) => {
        throw new Error('File not found');
    });
}

async function listFiles() {
    const db = getDatabase();
    const files = await db.collection('files.files').find().toArray();
    return files;
}

module.exports = { uploadFile, downloadFile, listFiles };