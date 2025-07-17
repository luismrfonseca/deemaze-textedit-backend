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

// Add these routes to your existing documentRoutes.js
router.put('/documents/:id/sync', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        const document = await Document.findByPk(id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        await document.update({
            content: content,
            lastModified: new Date()
        });
        
        res.json({
            message: 'Document synchronized successfully',
            document: {
                id: document.id,
                title: document.title,
                content: document.content,
                lastModified: document.lastModified
            }
        });
    } catch (error) {
        console.error('Error syncing document:', error);
        res.status(500).json({ error: 'Failed to sync document' });
    }
});

// Get document with real-time status
router.get('/documents/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const document = await Document.findByPk(id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json({
            document: {
                id: document.id,
                title: document.title,
                content: document.content,
                lastModified: document.lastModified
            },
            activeUsers: activeUsers.has(id) ? activeUsers.get(id).size : 0
        });
    } catch (error) {
        console.error('Error getting document status:', error);
        res.status(500).json({ error: 'Failed to get document status' });
    }
});

module.exports = router;