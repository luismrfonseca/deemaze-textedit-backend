const Document = require('../models/Document');
const { sequelize } = require('../config/database');

let ioInstance = null;

const documentActiveUsers = new Map();

// Mapa para mapear socket.id para um objeto { documentId, username }
const socketInfoMap = new Map();

// Função auxiliar para obter a lista formatada de usuários para emissão
const getFormattedActiveUsers = (documentId) => {
    const usersMap = documentActiveUsers.get(documentId);
    if (usersMap) {
        return Array.from(usersMap).map(([socketId, username]) => ({ socketId, username }));
    }
    return [];
};

const emitActiveUsers = (documentId) => {
    const usersToEmit = getFormattedActiveUsers(documentId);
    ioInstance.to(documentId).emit('active_users_updated', {
        documentId,
        users: usersToEmit
    });
    console.log(`Active users for document ${documentId}: ${usersToEmit.length} - ${JSON.stringify(usersToEmit.map(u => u.username))}`);
};


const initializeSocket = (ioServer) => {
    ioInstance = ioServer;

    ioInstance.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('join_document', ({ documentId, username }) => {
            if (!username) {
                console.warn(`User ${socket.id} tried to join document ${documentId} without a username.`);
                return;
            }

            socket.join(documentId);
            socketInfoMap.set(socket.id, { documentId, username });

            if (!documentActiveUsers.has(documentId)) {
                documentActiveUsers.set(documentId, new Map());
            }
            documentActiveUsers.get(documentId).set(socket.id, username);

            console.log(`User ${username} (${socket.id}) joined document room: ${documentId}`);

            emitActiveUsers(documentId);
        });

        socket.on('document_content_change', async ({ documentId, newContent }) => {
            console.log(`Change received for document ${documentId} from ${socket.id}`);

            const transaction = await sequelize.transaction();
            try {
                const document = await Document.findByPk(documentId, { transaction });
                if (document) {
                    await document.update({ content: newContent }, { transaction });
                    await transaction.commit();
                    
                    socket.to(documentId).emit('document_updated', {
                        documentId: document.id,
                        newContent: document.content
                    });
                } else {
                    await transaction.rollback();
                    console.error(`Document ${documentId} not found`);
                }
            } catch (error) {
                await transaction.rollback();
                console.error('Error processing document content change:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            const socketInfo = socketInfoMap.get(socket.id);

            if (socketInfo) {
                const { documentId } = socketInfo;

                if (documentActiveUsers.has(documentId)) {
                    documentActiveUsers.get(documentId).delete(socket.id);
                    socketInfoMap.delete(socket.id);

                    if (documentActiveUsers.get(documentId).size === 0) {
                        documentActiveUsers.delete(documentId);
                    }

                    emitActiveUsers(documentId);
                }
            }
        });

        socket.on('leave_document', ({ documentId, username }) => { 
            socket.leave(documentId);
            const socketInfo = socketInfoMap.get(socket.id);

            if (socketInfo && socketInfo.documentId === documentId) {
                if (documentActiveUsers.has(documentId)) {
                    documentActiveUsers.get(documentId).delete(socket.id);
                    socketInfoMap.delete(socket.id);

                    if (documentActiveUsers.get(documentId).size === 0) {
                        documentActiveUsers.delete(documentId);
                    }

                    emitActiveUsers(documentId);
                }
            }
            console.log(`User ${username} (${socket.id}) left document room: ${documentId}`);
        });
    });
};

const getIoInstance = () => ioInstance;

module.exports = { initializeSocket, getIoInstance };