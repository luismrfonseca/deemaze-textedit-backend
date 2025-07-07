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
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

app.use('/api', documentRoutes);

initializeSocket(io);

const PORT = process.env.PORT || 3001;

async function startServer() {
    await connectDB();

    server.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT}`);
    });
}

startServer();