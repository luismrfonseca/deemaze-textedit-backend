const express = require('express');
const {
    createDocument,
    listDocuments,
    getDocument,
    updateDocument,
    deleteDocument
} = require('../controllers/documentController');

const router = express.Router();

router.post('/documents', createDocument);
router.get('/documents', listDocuments);
router.get('/documents/:id', getDocument);
router.put('/documents/:id', updateDocument);
router.delete('/documents/:id', deleteDocument);

module.exports = router;