const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const {
  User, Message, Conversation, ConversationParticipant,
  MessageReaction, MessageAttachment, MessageRead, Call,
} = require('../models');
const { Op } = require('sequelize');
const redisService = require('../services/redis.service');

const userSockets = new Map();
let ioInstance = null;

const MESSAGE_INCLUDE = [
  { model: User, as: 'sender', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
  {
    model: Message,
    as: 'replyTo',
    attributes: ['id', 'content', 'senderId', 'messageType', 'isDeleted'],
    include: [
      { model: User, as: 'sender', attributes: ['id', 'fullName'] },
      { model: MessageAttachment, as: 'attachments', attributes: ['id', 'url', 'type'], required: false },
    ],
    required: false,
  },
  {
    model: MessageAttachment,
    as: 'attachments',
    attributes: ['id', 'url', 'type', 'mimeType', 'fileSize', 'thumbnailUrl', 'order'],
    required: false,
  },
];

const sanitize = (text) => {
  if (!text) return text;
  return text.replace(/<[^>]*>/g, '').trim();
};

const allowedSocketOrigins = [
  'https://memogram-frontend.onrender.com',
  'http://localhost:5173',
].filter(Boolean);

if (process.env.FRONTEND_URL && !allowedSocketOrigins.includes(process.env.FRONTEND_URL)) {
  allowedSocketOrigins.push(process.env.FRONTEND_URL);
}

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedSocketOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.userId = user.id;
      socket.user = user.toSafeObject();
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);

    userSockets.set(socket.userId, socket.id);
    await User.update({ isOnline: true }, { where: { id: socket.userId } });
    await redisService.setOnline(socket.userId);
    io.emit('user_online', { userId: socket.userId });

    const participations = await ConversationParticipant.findAll({
      where: { userId: socket.userId },
    });
    participations.forEach((p) => {
      socket.join(`conversation:${p.conversationId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, imageUrl, videoUrl, audioUrl, duration, messageType, replyToId, attachments } = data;
        const sanitizedContent = sanitize(content);

        if (!sanitizedContent && !imageUrl && !videoUrl && !audioUrl && (!attachments || attachments.length === 0)) {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }

        const msgType = messageType || (audioUrl ? 'voice' : imageUrl ? 'image' : videoUrl ? 'video' : 'text');

        const message = await Message.create({
          conversationId,
          senderId: socket.userId,
          content: sanitizedContent || null,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          audioUrl: audioUrl || null,
          duration: duration || null,
          messageType: msgType,
          replyToId: replyToId || null,
          deliveryStatus: 'sent',
        });

        if (attachments && attachments.length > 0) {
          await MessageAttachment.bulkCreate(
            attachments.map((a, i) => ({
              messageId: message.id,
              url: a.url,
              type: a.type,
              mimeType: a.mimeType || null,
              fileSize: a.fileSize || null,
              thumbnailUrl: a.thumbnailUrl || null,
              order: i,
            }))
          );
        }

        const lastContent = sanitizedContent
          || (msgType === 'voice' ? '🎤 Voice message' : msgType === 'image' ? '📷 Image' : msgType === 'video' ? '🎬 Video' : '');

        await Conversation.update(
          {
            lastMessageAt: new Date(),
            lastMessageContent: lastContent,
            lastMessageSenderId: socket.userId,
            lastMessageType: msgType,
          },
          { where: { id: conversationId } }
        );

        const fullMessage = await Message.findByPk(message.id, {
          include: MESSAGE_INCLUDE,
        });

        const participants = await ConversationParticipant.findAll({
          where: { conversationId, userId: { [Op.ne]: socket.userId } },
        });

        const senderSocketId = userSockets.get(socket.userId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_sent', {
            ...fullMessage.toJSON(),
            conversationId,
            isOwn: true,
          });
        }

        const recipientIds = [];
        for (const p of participants) {
          recipientIds.push(p.userId);
          const recipientSocketId = userSockets.get(p.userId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('new_message', fullMessage);
            io.to(recipientSocketId).emit('notification', {
              type: 'message',
              senderId: socket.userId,
              conversationId,
              messagePreview: sanitizedContent?.slice(0, 100) || '',
            });
          } else {
            await redisService.queueNotification(p.userId, {
              type: 'message',
              senderId: socket.userId,
              conversationId,
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (recipientIds.length > 0) {
          await Message.update(
            { deliveryStatus: 'delivered' },
            { where: { id: message.id } }
          );
          for (const rid of recipientIds) {
            const rSid = userSockets.get(rid);
            if (rSid) {
              io.to(rSid).emit('message_status', {
                messageId: message.id,
                conversationId,
                deliveryStatus: 'delivered',
              });
            }
          }
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_status', {
              messageId: message.id,
              conversationId,
              deliveryStatus: 'delivered',
            });
          }
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('edit_message', async (data) => {
      try {
        const { messageId, content } = data;
        const sanitizedContent = sanitize(content);
        if (!sanitizedContent) return;

        const message = await Message.findByPk(messageId);
        if (!message || message.senderId !== socket.userId) return;

        await message.update({ content: sanitizedContent, isEdited: true, editedAt: new Date() });

        await Conversation.update(
          { lastMessageContent: sanitizedContent },
          { where: { id: message.conversationId, lastMessageSenderId: socket.userId } }
        );

        const updated = await Message.findByPk(messageId, {
          include: [
            { model: User, as: 'sender', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
            { model: MessageAttachment, as: 'attachments', attributes: ['id', 'url', 'type'], required: false },
          ],
        });

        io.to(`conversation:${message.conversationId}`).emit('message_edited', updated);
      } catch (error) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    socket.on('delete_message', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findByPk(messageId);
        if (!message || message.senderId !== socket.userId) return;

        await message.update({
          isDeleted: true,
          deletedAt: new Date(),
          content: null,
          imageUrl: null,
          videoUrl: null,
          audioUrl: null,
        });
        await MessageAttachment.destroy({ where: { messageId } });

        const conversation = await Conversation.findByPk(message.conversationId, {
          attributes: ['id', 'lastMessageSenderId'],
        });
        if (conversation && conversation.lastMessageSenderId === socket.userId) {
          const prevMessage = await Message.findOne({
            where: { conversationId: message.conversationId, isDeleted: false },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'content', 'messageType', 'senderId'],
          });
          if (prevMessage) {
            await Conversation.update(
              {
                lastMessageContent: prevMessage.content,
                lastMessageSenderId: prevMessage.senderId,
                lastMessageType: prevMessage.messageType,
              },
              { where: { id: message.conversationId } }
            );
          }
        }

        io.to(`conversation:${message.conversationId}`).emit('message_deleted', {
          messageId,
          conversationId: message.conversationId,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('typing_start', async (data) => {
      await redisService.setTyping(data.conversationId, socket.userId);
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_stop_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
      });
    });

    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;

        const unreadMessages = await Message.findAll({
          where: {
            conversationId,
            senderId: { [Op.ne]: socket.userId },
            isRead: false,
          },
          attributes: ['id', 'senderId'],
        });

        if (unreadMessages.length > 0) {
          const now = new Date();
          await Message.update(
            { isRead: true, deliveryStatus: 'seen' },
            { where: { conversationId, senderId: { [Op.ne]: socket.userId }, isRead: false } }
          );

          const reads = unreadMessages.map((m) => ({
            messageId: m.id,
            userId: socket.userId,
            readAt: now,
          }));
          await MessageRead.bulkCreate(reads, { ignoreDuplicates: true });

          const senderMessages = {};
          unreadMessages.forEach((m) => {
            if (!senderMessages[m.senderId]) senderMessages[m.senderId] = [];
            senderMessages[m.senderId].push(m.id);
          });

          for (const [senderId, messageIds] of Object.entries(senderMessages)) {
            const senderSocketId = userSockets.get(senderId);
            if (senderSocketId) {
              io.to(senderSocketId).emit('message_status', {
                conversationId,
                messageIds,
                deliveryStatus: 'seen',
              });
            }
          }
        }

        await ConversationParticipant.update(
          { lastReadAt: new Date() },
          { where: { conversationId, userId: socket.userId } }
        );
        await redisService.clearNotificationCount(socket.userId);

        socket.to(`conversation:${conversationId}`).emit('messages_read', {
          conversationId,
          userId: socket.userId,
        });
        socket.emit('conversation_unread_reset', { conversationId });
      } catch (error) { /* silent */ }
    });

    socket.on('reaction', async (data) => {
      try {
        const { messageId, emoji } = data;
        const message = await Message.findByPk(messageId);
        if (!message) return;

        const existing = await MessageReaction.findOne({
          where: { messageId, userId: socket.userId, emoji },
        });

        if (existing) {
          await existing.destroy();
        } else {
          await MessageReaction.create({ messageId, userId: socket.userId, emoji });
        }

        const reactions = await MessageReaction.findAll({
          where: { messageId },
          include: [{ model: User, as: 'user', attributes: ['id', 'fullName'] }],
        });

        io.to(`conversation:${message.conversationId}`).emit('message_reaction', {
          messageId,
          conversationId: message.conversationId,
          reactions,
        });
      } catch (error) { /* silent */ }
    });

    // ═══════════════════════════════════════════════════════════════
    // CALL SIGNALING — WebRTC signaling via Socket.IO
    // ═══════════════════════════════════════════════════════════════

    socket.on('call_initiate', async (data) => {
      try {
        const { receiverId, conversationId, callType, offer } = data;
        if (!receiverId || !callType) return;

        const caller = await User.findByPk(socket.userId, {
          attributes: ['id', 'fullName', 'username', 'profilePhoto'],
        });

        const call = await Call.create({
          conversationId: conversationId || null,
          callerId: socket.userId,
          receiverId,
          callType,
          status: 'ringing',
        });

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('call_incoming', {
            callId: call.id,
            caller,
            callType,
            conversationId,
            offer,
          });
        }

        const callerSocketId = userSockets.get(socket.userId);
        if (callerSocketId) {
          io.to(callerSocketId).emit('call_initiated', { callId: call.id });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call_accept', async (data) => {
      try {
        const { callId, callerId, answer } = data;
        if (!callId) return;

        await Call.update(
          { status: 'ongoing', startedAt: new Date() },
          { where: { id: callId } }
        );

        const callerSocketId = userSockets.get(callerId);
        if (callerSocketId) {
          io.to(callerSocketId).emit('call_accepted', {
            callId,
            answer,
            acceptedBy: socket.userId,
          });
        }
      } catch (error) { /* silent */ }
    });

    socket.on('call_reject', async (data) => {
      try {
        const { callId, callerId } = data;
        if (!callId) return;

        await Call.update(
          { status: 'rejected', endedAt: new Date() },
          { where: { id: callId } }
        );

        const callerSocketId = userSockets.get(callerId);
        if (callerSocketId) {
          io.to(callerSocketId).emit('call_rejected', {
            callId,
            rejectedBy: socket.userId,
          });
        }
      } catch (error) { /* silent */ }
    });

    socket.on('call_end', async (data) => {
      try {
        const { callId, otherUserId } = data;
        if (!callId) return;

        const call = await Call.findByPk(callId);
        if (call) {
          const now = new Date();
          const duration = call.startedAt
            ? Math.floor((now - new Date(call.startedAt)) / 1000)
            : 0;
          await call.update({
            status: call.status === 'ringing' ? 'missed' : 'completed',
            endedAt: now,
            duration,
          });
        }

        if (otherUserId) {
          const otherSocketId = userSockets.get(otherUserId);
          if (otherSocketId) {
            io.to(otherSocketId).emit('call_ended', {
              callId,
              endedBy: socket.userId,
            });
          }
        }
      } catch (error) { /* silent */ }
    });

    socket.on('call_signal', (data) => {
      try {
        const { callId, signal, targetUserId } = data;
        if (!signal) return;

        const targetId = targetUserId;
        if (targetId) {
          const targetSocketId = userSockets.get(targetId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('call_signal', {
              callId,
              signal,
              fromUserId: socket.userId,
            });
          }
        }
      } catch (error) { /* silent */ }
    });

    socket.on('join_notifications', () => {
      socket.join(`notifications:${socket.userId}`);
    });

    socket.on('refresh_presence', async () => {
      await redisService.refreshOnline(socket.userId);
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      userSockets.delete(socket.userId);
      await User.update({ isOnline: false, lastSeen: new Date() }, { where: { id: socket.userId } });
      await redisService.setOffline(socket.userId);
      io.emit('user_offline', { userId: socket.userId, lastSeen: new Date() });
    });
  });

  return io;
};

const getIO = () => ioInstance;

const emitToUser = (userId, event, data) => {
  const socketId = userSockets.get(userId);
  if (socketId && ioInstance) {
    ioInstance.to(socketId).emit(event, data);
  }
};

module.exports = { initializeSocket, getIO, emitToUser, userSockets };
