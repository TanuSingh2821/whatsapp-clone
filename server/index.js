import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

// Socket.IO and Express integration for serverless functions
const createSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",  // Adjust frontend URL if needed
      credentials: true,
    },
  });

  global.onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected: ', socket.id);

    // Add user to the online list
    socket.on('add-user', (userId) => {
      global.onlineUsers.set(userId, socket.id);
      socket.broadcast.emit("online-users", {
        onlineUsers: Array.from(global.onlineUsers.keys())
      });
    });

    // Handle signout
    socket.on('signout', (id) => {
      global.onlineUsers.delete(id);
      socket.broadcast.emit("online-users", {
        onlineUsers: Array.from(global.onlineUsers.keys())
      });
    });

    // Handle message sending
    socket.on('send-msg', (data) => {
      const sendUserSocket = global.onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-receive", {
          from: data.from,
          message: data.message
        });
      }
    });

    // Handle outgoing voice/video call
    socket.on("outgoing-voice-call", (data) => {
      const sendUserSocket = global.onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("incoming-voice-call", {
          from: data.from,
          roomId: data.roomId,
          callType: data.callType,
        });
      }
    });

    socket.on("outgoing-video-call", (data) => {
      const sendUserSocket = global.onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("incoming-video-call", {
          from: data.from,
          roomId: data.roomId,
          callType: data.callType,
        });
      }
    });

    // Handle rejecting calls
    socket.on("reject-voice-call", (data) => {
      const sendUserSocket = global.onlineUsers.get(data.from);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("voice-call-rejected");
      }
    });

    socket.on("reject-video-call", (data) => {
      const sendUserSocket = global.onlineUsers.get(data.from);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("video-call-rejected");
      }
    });

    // Handle accepting incoming calls
    socket.on("accept-incoming-call", ({ id }) => {
      const sendUserSocket = global.onlineUsers.get(id);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("accept-call");
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected: ', socket.id);
    });
  });
};

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

createSocketServer(server);

