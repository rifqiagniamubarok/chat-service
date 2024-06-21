import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

app.use(cors());

const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: 'http://localhost:3000',
  },
});

io.on('connection', (socket) => {
  let { id, handshake, rooms, data } = socket;
  console.log(`New connection: ${id}`);
  socket.on('send_message', (data) => {
    io.to(data.room).emit('receive_message', data);
  });
  socket.on('join_room', (data) => {
    socket.join(data);
  });
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${id}`);
  });
});

httpServer.listen(3550, () => {
  console.log('running on port 3550');
});
