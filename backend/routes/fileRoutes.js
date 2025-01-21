const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { uploadFile, downloadFile, listFiles } = require('../services/fileService');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    try {
        // Upload file and get the file ID
        const result = await uploadFile(req.file.path, req.file.originalname);
        
        // Clean up the temporary file
        await fs.unlink(req.file.path);
        
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
});

router.get('/download/:filename', async (req, res, next) => {
    try {
        await downloadFile(req.params.filename, res);
    } catch (err) {
        next(err);
    }
});

router.get('/', async (req, res, next) => {
    try {
        const files = await listFiles();
        res.status(200).json(files);
    } catch (err) {
        next(err);
    }
});

module.exports = router;