const fs = require('fs');
const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Helper function to set up GridFS bucket
async function setupGridFS() {
    const db = mongoose.connection.db;
    return new GridFSBucket(db, { bucketName: 'files' });
}

// Calculate MD5 hash of a file's content
async function calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('error', reject);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

// Check if a file with the same name or hash exists in the database
async function checkFileExists(fileName, fileHash) {
    const db = mongoose.connection.db;
    return await db.collection('files.files').findOne({
        $or: [
            { 'metadata.hash': fileHash },
            { filename: fileName }
        ]
    });
}

// Upload a file to MongoDB
async function uploadFile(filePath, fileName) {
    try {
        console.log('Starting file upload process for:', fileName);

        // Read file content
        const filePath = 'C://Users/kazuj/Desktop/Kaz/testfile.txt';
        const content = await fs.promises.readFile(filePath, 'utf8');
        const rawContent = fs.readFileSync(filePath);
        console.log('File exists: ${fs.existsSync(filePath)}');
        console.log(`Raw Buffer: [${rawContent}]`);
        if (!content) {
            throw new Error('File is empty POPO');
        }

        // Store the file in MongoDB
        const db = mongoose.connection.db;
        const fileDoc = {
            filename: fileName,
            content: content,
            uploadDate: new Date(),
        };

        const result = await db.collection('files').insertOne(fileDoc);
        console.log('File stored in MongoDB with ID:', result.insertedId);

        return {
            fileId: result.insertedId.toString(),
            fileName: fileName,
            message: `${fileName} uploaded successfully`
        };
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
}

// Retrieve file content by ID
async function getFileContent(fileId) {
    try {
        console.log('Getting file content for ID:', fileId);
        const db = mongoose.connection.db;

        const file = await db.collection('files').findOne({ _id: new ObjectId(fileId) });
        if (!file) throw new Error('File not found');
        if (!file.content) throw new Error('File content is missing');

        console.log('Retrieved file:', {
            id: fileId,
            filename: file.filename,
            contentLength: file.content.length
        });

        return file.content;
    } catch (error) {
        console.error('Error in getFileContent:', error);
        throw error;
    }
}

// Retrieve multiple files by IDs
async function getFilesByIds(fileIds) {
    try {
        const db = mongoose.connection.db;
        const objectIds = fileIds.map(id => new ObjectId(id));

        return await db.collection('files')
            .find({ _id: { $in: objectIds } })
            .toArray();
    } catch (error) {
        console.error('Get files by IDs error:', error);
        throw error;
    }
}

// Download a file by its name
async function downloadFile(fileName, res) {
    try {
        const bucket = await setupGridFS();
        const stream = bucket.openDownloadStreamByName(fileName);
        stream.pipe(res).on('error', () => {
            throw new Error('File not found');
        });
    } catch (error) {
        console.error('Download file error:', error);
        throw error;
    }
}

// List all files in the database
async function listFiles() {
    try {
        const db = mongoose.connection.db;
        const files = await db.collection('files')
            .find({})
            .project({ content: 0 }) // Exclude file content
            .toArray();

        return files.map(file => ({
            _id: file._id.toString(),
            filename: file.filename,
            uploadDate: file.uploadDate
        }));
    } catch (error) {
        console.error('List files error:', error);
        throw error;
    }
}

// Delete a file by ID
async function deleteFile(fileId) {
    try {
        const db = mongoose.connection.db;
        const result = await db.collection('files').deleteOne({ _id: new ObjectId(fileId) });

        if (result.deletedCount === 0) throw new Error('File not found');

        return {
            success: true,
            message: 'File deleted successfully',
            fileId: fileId
        };
    } catch (error) {
        console.error('Delete file error:', error);
        throw error;
    }
}

module.exports = {
    uploadFile,
    getFileContent,
    getFilesByIds,
    downloadFile,
    listFiles,
    deleteFile,
};
