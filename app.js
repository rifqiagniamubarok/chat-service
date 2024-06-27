import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const app = express();
const httpServer = createServer(app);

app.use(cors());

const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: 'http://localhost:3000',
  },
});

const getRoom = async (userId, targetId) => {
  const room = await prisma.userRoom.findMany({
    where: {
      AND: [
        {
          userId: Number(userId),
        },
        {
          userId: Number(targetId),
        },
      ],
    },
  });
  return room;
};
const createRoom = async (userId, targetId) => {
  const room = await prisma.roomChat.createMany({
    data: [{ userId: Number(userId) }, { userId: Number(targetId) }],
  });
  return room;
};

io.on('connection', (socket) => {
  let { id, handshake, rooms, data } = socket;

  socket.on('send_message', (data) => {
    io.to(data.room).emit('receive_message', data);
  });
  socket.on('join_room', (data) => {
    socket.join(data);
  });
  socket.on('ask_users', async (data) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: {
            not: Number(data.userId),
          },
        },
      });
      io.emit('receive_users', { users });
    } catch (error) {
      console.log({ error });
    }
  });
  socket.on('ask_room', async (data) => {
    try {
      if (data?.userId && data?.targetId) {
        let { userId, targetId } = data;
        const room = await getRoom(userId, targetId);
        if (room.length !== 0) {
          io.emit('receive_room', { isExist: true, room });
          console.log({ room });
          // socket.join(room.id);
        } else {
          io.emit('receive_room', { isExist: false });
        }
      }
    } catch (error) {
      console.log({ error });
    }
  });
  socket.on('create_room_chat', async (data) => {
    console.log('create room');
    try {
      if (data?.userId && data?.targetId) {
        console.log('create room 2');
        let { userId, targetId } = data;
        const room = await getRoom(userId, targetId);
        if (room.length == 0) {
          console.log('create room 3');
          const newRoom = await createRoom(userId, targetId);
          console.log({ newRoom });
          io.emit('receive_room', { isExist: true });
        }
      }
    } catch (error) {
      console.log({ error });
    }
  });
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${id}`);
  });
});

httpServer.listen(3550, () => {
  console.log('running on port 3550');
});
