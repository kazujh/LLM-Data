const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { uploadFile, downloadFile, listFiles, deleteFile, getFileContent } = require('../services/fileService');
const { ObjectId } = require('mongodb');
const File = require('../models/File');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// List files
router.get('/', async (req, res, next) => {
    try {
        const files = await listFiles();
        res.json(files);
    } catch (error) {
        next(error);
    }
});

// Upload file
router.post('/upload', upload.single('file'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        console.log('Processing uploaded file:', req.file);
        const result = await uploadFile(req.file.path, req.file.originalname);
        
        // Clean up the temporary file
        await fs.unlink(req.file.path);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Upload error:', error);
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        next(error);
    }
});

// Get file content - updated endpoint
router.get('/:fileId/content', async (req, res, next) => {
    try {
        const fileId = req.params.fileId;
        console.log('Fetching content for file:', fileId);

        if (!ObjectId.isValid(fileId)) {
            return res.status(400).json({ error: 'Invalid file ID format' });
        }

        const content = await getFileContent(fileId);
        
        if (!content) {
            return res.status(404).json({ error: 'File content not found' });
        }

        res.json({ 
            success: true,
            content: content,
            fileId: fileId
        });
    } catch (error) {
        console.error('Get file content error:', error);
        if (error.message.includes('File not found')) {
            res.status(404).json({ error: 'File not found' });
        } else {
            next(error);
        }
    }
});

// Delete file
router.delete('/:fileId', async (req, res, next) => {
    try {
        const result = await deleteFile(req.params.fileId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Add new route for MongoDB file upload
router.post('/upload-to-mongo', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }

        const newFile = new File({
            name: req.file.originalname,
            data: fs.readFileSync(req.file.path)
        });

        await newFile.save();
        
        // Clean up: remove file from uploads folder
        fs.unlinkSync(req.file.path);
        
        res.status(200).send({
            message: 'File uploaded successfully',
            fileId: newFile._id
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).send('Error uploading file');
    }
});

module.exports = router;