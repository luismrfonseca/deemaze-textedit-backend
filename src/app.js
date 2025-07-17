const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const cors = require('cors'); 
require('dotenv').config();

const { connectDB } = require('./config/database');
const documentRoutes = require('./routes/documentRoutes');
const { initializeSocket } = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.IO com suporte aos eventos de colaboração
const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://192.168.1.73:3000'
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middlewares
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://192.168.1.73:3000'
    ],
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', documentRoutes);

// Inicializar Socket.IO com suporte aos eventos de colaboração
initializeSocket(io);

const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        await connectDB();
        console.log('Database connected successfully');

        server.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
            console.log(`Socket.IO server ready for collaborative editing`);
            console.log(`Health check available at http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

startServer();