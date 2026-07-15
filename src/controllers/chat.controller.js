const { Op } = require('sequelize');
const {
  Conversation, ConversationParticipant, Message, User,
  MessageReaction, MessageAttachment, MessageRead,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');

const sanitize = (text) => {
  if (!text) return text;
  return text.replace(/<[^>]*>/g, '').trim();
};

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
    model: MessageReaction,
    as: 'reactions',
    include: [{ model: User, as: 'user', attributes: ['id', 'fullName'] }],
    required: false,
  },
  {
    model: MessageAttachment,
    as: 'attachments',
    attributes: ['id', 'url', 'type', 'mimeType', 'fileSize', 'thumbnailUrl', 'order'],
    required: false,
    order: [['order', 'ASC']],
  },
  {
    model: MessageRead,
    as: 'reads',
    attributes: ['userId', 'readAt'],
    required: false,
  },
];

exports.getConversations = async (req, res) => {
  try {
    const participations = await ConversationParticipant.findAll({
      where: { userId: req.userId },
      include: [
        {
          model: Conversation,
          as: 'conversation',
          include: [
            {
              model: User,
              as: 'participants',
              attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline', 'lastSeen'],
              through: { attributes: [] },
            },
            {
              model: User,
              as: 'lastMessageSender',
              attributes: ['id', 'fullName'],
              required: false,
            },
          ],
        },
      ],
      order: [[{ model: Conversation, as: 'conversation' }, 'lastMessageAt', 'DESC']],
    });

    const conversations = await Promise.all(
      participations.map(async (p) => {
        const conversation = p.conversation.toJSON();

        const unreadCount = await Message.count({
          where: {
            conversationId: conversation.id,
            senderId: { [Op.ne]: req.userId },
            isRead: false,
          },
        });

        conversation.unreadCount = unreadCount;
        conversation.participants = conversation.participants.filter((u) => u.id !== req.userId);

        if (!conversation.lastMessageContent && conversation.lastMessageAt) {
          const lastMessage = await Message.findOne({
            where: { conversationId: conversation.id },
            attributes: ['id', 'content', 'messageType', 'createdAt', 'senderId', 'isDeleted'],
            order: [['createdAt', 'DESC']],
          });
          if (lastMessage) {
            conversation.lastMessageContent = lastMessage.content;
            conversation.lastMessageSenderId = lastMessage.senderId;
            conversation.lastMessageType = lastMessage.messageType;
          }
        }

        return conversation;
      })
    );

    return sendSuccess(res, { conversations });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getOrCreateConversation = async (req, res) => {
  try {
    const { userId: otherUserId } = req.body;
    if (!otherUserId) return sendError(res, 'User ID is required', 400);

    const otherUser = await User.findByPk(otherUserId, {
      attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline', 'lastSeen'],
    });
    if (!otherUser) return sendError(res, 'User not found', 404);

    const myParticipations = await ConversationParticipant.findAll({
      where: { userId: req.userId },
      attributes: ['conversationId'],
    });
    const myConversationIds = myParticipations.map((p) => p.conversationId);

    const existing = await ConversationParticipant.findOne({
      where: { userId: otherUserId, conversationId: { [Op.in]: myConversationIds } },
    });

    if (existing) {
      const conversation = await Conversation.findByPk(existing.conversationId, {
        include: [{
          model: User,
          as: 'participants',
          attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline', 'lastSeen'],
          through: { attributes: [] },
        }],
      });
      const convData = conversation.toJSON();
      convData.participants = convData.participants.filter((u) => u.id !== req.userId);
      return sendSuccess(res, { conversation: convData });
    }

    const conversation = await Conversation.create({});
    await ConversationParticipant.bulkCreate([
      { conversationId: conversation.id, userId: req.userId },
      { conversationId: conversation.id, userId: otherUserId },
    ]);

    const fullConversation = await Conversation.findByPk(conversation.id, {
      include: [{
        model: User,
        as: 'participants',
        attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline', 'lastSeen'],
        through: { attributes: [] },
      }],
    });

    const convData = fullConversation.toJSON();
    convData.participants = convData.participants.filter((u) => u.id !== req.userId);
    convData.lastMessage = null;
    convData.unreadCount = 0;

    return sendSuccess(res, { conversation: convData }, 'Conversation created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const participation = await ConversationParticipant.findOne({
      where: { conversationId, userId: req.userId },
    });
    if (!participation) return sendError(res, 'Access denied', 403);

    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: messages } = await Message.findAndCountAll({
      where: { conversationId },
      include: MESSAGE_INCLUDE,
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    return sendSuccess(res, paginateResponse(messages.reverse(), count, parseInt(page), queryLimit));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const unreadMessages = await Message.findAll({
      where: {
        conversationId,
        senderId: { [Op.ne]: req.userId },
        isRead: false,
      },
      attributes: ['id'],
    });

    if (unreadMessages.length > 0) {
      const now = new Date();
      await Message.update(
        { isRead: true },
        { where: { conversationId, senderId: { [Op.ne]: req.userId }, isRead: false } }
      );

      const reads = unreadMessages.map((m) => ({
        messageId: m.id,
        userId: req.userId,
        readAt: now,
      }));
      await MessageRead.bulkCreate(reads, { ignoreDuplicates: true });
    }

    await ConversationParticipant.update(
      { lastReadAt: new Date() },
      { where: { conversationId, userId: req.userId } }
    );

    return sendSuccess(res, null, 'Messages marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return sendError(res, 'Content is required', 400);

    const sanitized = sanitize(content);
    if (!sanitized) return sendError(res, 'Invalid content', 400);

    const message = await Message.findByPk(messageId);
    if (!message) return sendError(res, 'Message not found', 404);
    if (message.senderId !== req.userId) return sendError(res, 'Not authorized', 403);

    await message.update({ content: sanitized, isEdited: true, editedAt: new Date() });

    const updated = await Message.findByPk(messageId, {
      include: MESSAGE_INCLUDE,
    });

    return sendSuccess(res, { message: updated }, 'Message edited');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findByPk(messageId);
    if (!message) return sendError(res, 'Message not found', 404);
    if (message.senderId !== req.userId) return sendError(res, 'Not authorized', 403);

    await message.update({
      isDeleted: true,
      deletedAt: new Date(),
      content: null,
      imageUrl: null,
      videoUrl: null,
      audioUrl: null,
    });

    await MessageAttachment.destroy({ where: { messageId } });

    return sendSuccess(res, null, 'Message deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.searchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q, page = 1, limit = 20 } = req.query;

    if (!q?.trim()) return sendError(res, 'Search query is required', 400);

    const participation = await ConversationParticipant.findOne({
      where: { conversationId, userId: req.userId },
    });
    if (!participation) return sendError(res, 'Access denied', 403);

    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: messages } = await Message.findAndCountAll({
      where: {
        conversationId,
        content: { [Op.iLike]: `%${q}%` },
        isDeleted: false,
      },
      include: MESSAGE_INCLUDE,
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    return sendSuccess(res, paginateResponse(messages, count, parseInt(page), queryLimit));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.uploadChatMedia = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    let folder = 'memogram/chat/images';
    let type = 'image';
    if (req.file.mimetype.startsWith('video')) {
      folder = 'memogram/chat/videos';
      type = 'video';
    } else if (req.file.mimetype.startsWith('audio')) {
      folder = 'memogram/chat/voice';
      type = 'audio';
    }
    const result = await uploadToCloudinary(req.file.path, folder);
    return sendSuccess(res, {
      url: result.url,
      type,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return sendError(res, 'Emoji is required', 400);

    const message = await Message.findByPk(messageId);
    if (!message) return sendError(res, 'Message not found', 404);

    const existing = await MessageReaction.findOne({
      where: { messageId, userId: req.userId, emoji },
    });

    if (existing) {
      await existing.destroy();
      return sendSuccess(res, { reacted: false }, 'Reaction removed');
    }

    await MessageReaction.create({ messageId, userId: req.userId, emoji });
    return sendSuccess(res, { reacted: true }, 'Reaction added');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { conversationId: targetConvId } = req.body;

    if (!targetConvId) return sendError(res, 'Target conversation ID is required', 400);

    const original = await Message.findByPk(messageId);
    if (!original) return sendError(res, 'Message not found', 404);

    const targetParticipation = await ConversationParticipant.findOne({
      where: { conversationId: targetConvId, userId: req.userId },
    });
    if (!targetParticipation) return sendError(res, 'Access denied to target conversation', 403);

    const forwarded = await Message.create({
      conversationId: targetConvId,
      senderId: req.userId,
      content: original.content,
      messageType: original.messageType,
      imageUrl: original.imageUrl,
      videoUrl: original.videoUrl,
      audioUrl: original.audioUrl,
      duration: original.duration,
    });

    const attachments = await MessageAttachment.findAll({
      where: { messageId: original.id },
    });
    if (attachments.length > 0) {
      await MessageAttachment.bulkCreate(
        attachments.map((a, i) => ({
          messageId: forwarded.id,
          url: a.url,
          type: a.type,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          thumbnailUrl: a.thumbnailUrl,
          order: i,
        }))
      );
    }

    await Conversation.update(
      {
        lastMessageAt: new Date(),
        lastMessageContent: original.content,
        lastMessageSenderId: req.userId,
        lastMessageType: original.messageType,
      },
      { where: { id: targetConvId } }
    );

    const fullMessage = await Message.findByPk(forwarded.id, {
      include: MESSAGE_INCLUDE,
    });

    return sendSuccess(res, { message: fullMessage }, 'Message forwarded', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
