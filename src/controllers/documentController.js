const Document = require('../models/Document');
const { sequelize } = require('../config/database');
const { executeInTransaction, ISOLATION_LEVELS } = require('../services/transactionService');
const { v4: uuidv4 } = require('uuid'); 

const createDocument = async (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({ message: 'Document title is required.' });
    }

    const transaction = await sequelize.transaction();
    try {
        const document = await Document.create(
            { title, content: '' },
            { transaction }
        );

        await transaction.commit();
        res.status(201).json(document);
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating document:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const listDocuments = async (req, res) => {
    try {
        const documents = await Document.findAll({
            attributes: ['id', 'title', 'createdAt', 'updatedAt']
        });

        res.status(200).json(documents);
    } catch (error) {
        console.error('Error listing documents:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const getDocument = async (req, res) => {
    const { id } = req.params;
    try {
        const document = await Document.findByPk(id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found.' });
        }
        res.status(200).json(document);
    } catch (error) {
        console.error('Error retrieving document:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const updateDocument = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    const transaction = await sequelize.transaction();
    try {
        const document = await Document.findByPk(id, { transaction });
        
        if (!document) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Document not found.' });
        }

        // Atualizar apenas os campos fornecidos
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;

        await document.update(updateData, { transaction });
        await transaction.commit();

        res.status(200).json(document);
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating document:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const deleteDocument = async (req, res) => {
    const { id } = req.params;

    const transaction = await sequelize.transaction();
    try {
        const document = await Document.findByPk(id, { transaction });
        
        if (!document) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Document not found.' });
        }

        await document.destroy({ transaction });
        await transaction.commit();

        res.status(200).json({ message: 'Document deleted successfully.' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// Exemplo de operação complexa com múltiplas etapas
const duplicateDocument = async (req, res) => {
    const { id } = req.params;
    const { newTitle } = req.body;

    try {
        const result = await executeInTransaction(async (transaction) => {
            // Buscar documento original
            const originalDoc = await Document.findByPk(id, { transaction });
            if (!originalDoc) {
                throw new Error('Document not found');
            }

            // Criar nova cópia
            const newDoc = await Document.create({
                title: newTitle || `${originalDoc.title} - Copy`,
                content: originalDoc.content
            }, { transaction });

            // Log da operação (poderia ser uma tabela de auditoria)
            console.log(`Document ${id} duplicated as ${newDoc.id}`);

            return newDoc;
        }, {
            isolationLevel: ISOLATION_LEVELS.READ_COMMITTED
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error duplicating document:', error);
        if (error.message === 'Document not found') {
            res.status(404).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Internal server error.' });
        }
    }
};

module.exports = {
    createDocument,
    listDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    duplicateDocument
};