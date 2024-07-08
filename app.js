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

const getChats = async (userId) => {
  try {
    const getRooms = await prisma.room.findMany({
      where: {
        userRoom: {
          some: { userId },
        },
      },
      include: {
        userRoom: {
          where: {
            userId: {
              not: userId,
            },
          },
          include: {
            user: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
      },
    });

    const roomlist = getRooms.map(({ id, userRoom }) => {
      let user = userRoom[0].user;
      return {
        roomId: id,
        userId: user.id,
        user,
      };
    });

    return roomlist;
  } catch (error) {
    console.error({ error });
  }
};

const getPastMessage = async (roomId) => {
  try {
    const room = await prisma.room.findFirst({
      where: {
        id: Number(roomId),
      },
      include: {
        chat: {
          take: 20,
          orderBy: {
            datetime: 'desc',
          },
        },
      },
    });

    const chatInOrder = room.chat.reverse();

    return chatInOrder;
  } catch (error) {
    console.log({ error });
  }
};

const saveMessage = async (data) => {
  try {
    const payload = {
      message: data.message,
      userId: Number(data.userId),
      roomId: Number(data.room),
      datetime: data.date,
    };
    await prisma.chat.create({
      data: payload,
    });
  } catch (error) {
    console.error({ error });
  }
};

io.on('connection', (socket) => {
  let { id, handshake, rooms, data } = socket;

  socket.on('send_message', async (data) => {
    await saveMessage(data);
    console.log({ data });
    io.to(data.room).emit('receive_message', data);
  });
  socket.on('join_room', async (data) => {
    socket.join(data);

    const pastMessages = await getPastMessage(data);
    socket.emit('past_messages', pastMessages);
  });
  socket.on('ask_users', async (data) => {
    const userId = Number(data.userId);
    const rooms = await getChats(userId);
    console.log(rooms);
    socket.emit('receive_users', { rooms });
  });
  socket.on('ask_room', async (data) => {});
  socket.on('create_room_chat', async (data) => {});
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${id}`);
  });
});

httpServer.listen(3550, () => {
  console.log('running on port 3550');
});
