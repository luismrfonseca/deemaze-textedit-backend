const Document = require('../models/Document');
const { sequelize } = require('../config/database');

let ioInstance = null;

const activeUsers = new Map(); // Armazena usuários ativos por documento

const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('✅ User connected:', socket.id);

        // Handle user joining a document
        socket.on('join_document', (data) => {
            console.log('📋 Raw join_document data received:', data);
            
            const { documentId, userName, userId } = data;
            
            // Debug logs
            console.log('📋 Extracted values:');
            console.log('  - documentId:', documentId);
            console.log('  - userName:', userName);
            console.log('  - userId:', userId);
            
            socket.join(documentId);
            
            // Validate and set default values
            const finalUserName = userName || `User${socket.id.slice(-4)}`;
            const finalUserId = userId || socket.id;
            
            // Store user info
            if (!activeUsers.has(documentId)) {
                activeUsers.set(documentId, new Map());
            }
            
            activeUsers.get(documentId).set(socket.id, {
                userId: finalUserId,
                userName: finalUserName,
                socketId: socket.id,
                lastActivity: Date.now()
            });

            console.log(`👤 User ${finalUserName} (${socket.id}) joined document ${documentId}`);
            
            // Notify other users about new user
            socket.to(documentId).emit('user_joined', {
                userId: finalUserId,
                userName: finalUserName,
                socketId: socket.id
            });

            // Send current active users to the new user
            const documentUsers = activeUsers.get(documentId);
            const usersList = Array.from(documentUsers.values()).filter(user => user.socketId !== socket.id);
            socket.emit('active_users_update', usersList);
        });

        // Handle cursor position changes
        socket.on('cursor_position_change', (data) => {
            const { documentId, position, userName, userId } = data;
            
            // Get user info from activeUsers if not provided in data
            let finalUserName = userName;
            let finalUserId = userId;
            
            if (!finalUserName && activeUsers.has(documentId) && activeUsers.get(documentId).has(socket.id)) {
                const storedUser = activeUsers.get(documentId).get(socket.id);
                finalUserName = storedUser.userName;
                finalUserId = storedUser.userId;
            }
            
            // Final fallback
            finalUserName = finalUserName || 'Anonymous';
            finalUserId = finalUserId || socket.id;
            
            console.log(`📍 Cursor update from ${finalUserName}: position ${position} in doc ${documentId}`);
            
            // Update user activity
            if (activeUsers.has(documentId) && activeUsers.get(documentId).has(socket.id)) {
                const user = activeUsers.get(documentId).get(socket.id);
                user.lastActivity = Date.now();
                user.lastCursorPosition = position;
                // Update stored user info if it was missing
                if (!user.userName || user.userName === 'Anonymous') {
                    user.userName = finalUserName;
                }
            }

            // Broadcast cursor position to all other users in the same document
            socket.to(documentId).emit('cursor_position_updated', {
                userId: finalUserId,
                userName: finalUserName,
                socketId: socket.id,
                position: position,
                documentId: documentId,
                timestamp: Date.now()
            });
        });

        // Handle user typing events
        socket.on('user_typing', (data) => {
            const { documentId, isTyping, userName, userId, position } = data;
            
            // Get user info from activeUsers if not provided in data
            let finalUserName = userName;
            let finalUserId = userId;
            
            if (!finalUserName && activeUsers.has(documentId) && activeUsers.get(documentId).has(socket.id)) {
                const storedUser = activeUsers.get(documentId).get(socket.id);
                finalUserName = storedUser.userName;
                finalUserId = storedUser.userId;
            }
            
            // Final fallback
            finalUserName = finalUserName || 'Anonymous';
            finalUserId = finalUserId || socket.id;
            
            console.log(`⌨️ ${finalUserName} ${isTyping ? 'started' : 'stopped'} typing in doc ${documentId}`);
            
            // Update user activity
            if (activeUsers.has(documentId) && activeUsers.get(documentId).has(socket.id)) {
                const user = activeUsers.get(documentId).get(socket.id);
                user.lastActivity = Date.now();
                user.isTyping = isTyping;
                // Update stored user info if it was missing
                if (!user.userName || user.userName === 'Anonymous') {
                    user.userName = finalUserName;
                }
            }

            // Broadcast typing status to all other users in the same document
            socket.to(documentId).emit('user_typing', {
                userId: finalUserId,
                userName: finalUserName,
                socketId: socket.id,
                isTyping: isTyping,
                documentId: documentId,
                position: position,
                timestamp: Date.now()
            });
        });

        // Handle user leaving document
        socket.on('leave_document', (documentId) => {
            socket.leave(documentId);
            
            // Remove user from active users
            if (activeUsers.has(documentId)) {
                const user = activeUsers.get(documentId).get(socket.id);
                const userName = user?.userName || 'Anonymous';
                
                activeUsers.get(documentId).delete(socket.id);
                
                // Clean up empty document maps
                if (activeUsers.get(documentId).size === 0) {
                    activeUsers.delete(documentId);
                }
                
                console.log(`👋 User ${userName} left document ${documentId}`);
                
                // Notify other users that this user left
                socket.to(documentId).emit('user_left_document', {
                    userId: socket.id,
                    socketId: socket.id,
                    documentId: documentId
                });
            }
        });

        // Handle text content changes (for collaborative editing)
        socket.on('text_change', async (data) => {
            const { documentId, content, userName, userId } = data;
            
            // Get user info from activeUsers if not provided in data
            let finalUserName = userName;
            let finalUserId = userId;
            
            if (!finalUserName && activeUsers.has(documentId) && activeUsers.get(documentId).has(socket.id)) {
                const storedUser = activeUsers.get(documentId).get(socket.id);
                finalUserName = storedUser.userName;
                finalUserId = storedUser.userId;
            }
            
            // Final fallback
            finalUserName = finalUserName || 'Anonymous';
            finalUserId = finalUserId || socket.id;
            
            console.log(`📝 Text change from ${finalUserName} in doc ${documentId}`);
            console.log(`📝 Content preview: ${content.substring(0, 100)}...`);
            
            try {
                // Save to database
                const document = await Document.findByPk(documentId);
                if (document) {
                    await document.update({
                        content: content,
                        lastModified: new Date()
                    });
                    console.log(`💾 Document ${documentId} saved to database`);
                } else {
                    console.error(`❌ Document ${documentId} not found in database`);
                }
            } catch (error) {
                console.error('❌ Error saving document to database:', error);
            }
            
            // Broadcast text changes to all other users in the same document
            socket.to(documentId).emit('text_updated', {
                userId: finalUserId,
                userName: finalUserName,
                socketId: socket.id,
                content: content,
                documentId: documentId,
                timestamp: Date.now()
            });
            
            // Also send confirmation back to sender
            socket.emit('text_saved', {
                documentId: documentId,
                success: true,
                timestamp: Date.now()
            });
        });

        // Handle manual document sync
        socket.on('sync_document', async (data) => {
            const { documentId } = data;
            
            try {
                const document = await Document.findByPk(documentId);
                if (document) {
                    // Send current document content to the requesting user
                    socket.emit('document_synced', {
                        documentId: documentId,
                        content: document.content,
                        lastModified: document.lastModified,
                        timestamp: Date.now()
                    });
                    console.log(`🔄 Document ${documentId} synced for user ${socket.id}`);
                } else {
                    socket.emit('sync_error', {
                        documentId: documentId,
                        error: 'Document not found'
                    });
                }
            } catch (error) {
                console.error('❌ Error syncing document:', error);
                socket.emit('sync_error', {
                    documentId: documentId,
                    error: 'Failed to sync document'
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('❌ User disconnected:', socket.id);
            
            // Remove user from all documents and notify other users
            for (const [documentId, users] of activeUsers) {
                if (users.has(socket.id)) {
                    const user = users.get(socket.id);
                    const userName = user?.userName || 'Anonymous';
                    
                    users.delete(socket.id);
                    
                    console.log(`👋 User ${userName} disconnected from document ${documentId}`);
                    
                    // Notify other users in the document
                    socket.to(documentId).emit('user_left_document', {
                        userId: socket.id,
                        socketId: socket.id,
                        documentId: documentId
                    });
                    
                    // Clean up empty document maps
                    if (users.size === 0) {
                        activeUsers.delete(documentId);
                    }
                }
            }
        });

        // Heartbeat to keep users active
        socket.on('heartbeat', (data) => {
            const { documentId } = data;
            if (activeUsers.has(documentId) && activeUsers.get(documentId).has(socket.id)) {
                activeUsers.get(documentId).get(socket.id).lastActivity = Date.now();
            }
        });
    });

    // Clean up inactive users every 30 seconds
    setInterval(() => {
        const now = Date.now();
        const timeout = 60000; // 1 minute timeout
        
        for (const [documentId, users] of activeUsers) {
            for (const [socketId, user] of users) {
                if (now - user.lastActivity > timeout) {
                    console.log(`🧹 Cleaning up inactive user ${user.userName} from document ${documentId}`);
                    users.delete(socketId);
                    
                    // Notify other users
                    io.to(documentId).emit('user_left_document', {
                        userId: socketId,
                        socketId: socketId,
                        documentId: documentId
                    });
                }
            }
            
            // Clean up empty document maps
            if (users.size === 0) {
                activeUsers.delete(documentId);
            }
        }
    }, 30000);
};

module.exports = { initializeSocket };