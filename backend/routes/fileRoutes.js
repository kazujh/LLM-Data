const express = require('express');
const { uploadFile, downloadFile, listFiles } = require('../services/fileService');

const router = express.Router();

router.post('/upload', async (req, res, next) => {
    const { filePath, fileName } = req.body;
    if (!filePath || !fileName) return res.status(400).send('filePath and fileName are required');

    try {
        const message = await uploadFile(filePath, fileName);
        res.status(200).send(message);
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