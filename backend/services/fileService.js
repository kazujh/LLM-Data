const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const { getDatabase } = require('./dbService');

async function setupGridFS() {
    const db = getDatabase();
    return new GridFSBucket(db, { bucketName: 'files' });
}

async function uploadFile(filePath, fileName) {
    const bucket = await setupGridFS();
    // Read file content before upload
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
        const stream = bucket.openUploadStream(fileName, {
            metadata: {
                content: content, // Store the text content in metadata
                uploadDate: new Date()
            }
        });
        
        fs.createReadStream(filePath)
            .pipe(stream)
            .on('error', reject)
            .on('finish', () => resolve({
                fileId: stream.id,
                fileName: fileName,
                message: `${fileName} uploaded successfully`
            }));
    });
}

async function getFileContent(fileId) {
    const db = getDatabase();
    const file = await db.collection('files.files').findOne({ _id: fileId });
    if (!file) throw new Error('File not found');
    return file.metadata.content;
}

async function getFilesByIds(fileIds) {
    const db = getDatabase();
    const files = await db.collection('files.files')
        .find({ _id: { $in: fileIds } })
        .toArray();
    return files.map(file => ({
        id: file._id,
        filename: file.filename,
        content: file.metadata.content
    }));
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

module.exports = { 
    uploadFile, 
    downloadFile, 
    listFiles, 
    getFileContent,
    getFilesByIds 
};