const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Conversations', key: 'id' },
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'video', 'voice', 'system'),
    defaultValue: 'text',
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  videoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  audioUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  replyToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Messages', key: 'id' },
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deliveryStatus: {
    type: DataTypes.ENUM('sending', 'sent', 'delivered', 'seen'),
    defaultValue: 'sent',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['senderId'] },
    { fields: ['createdAt'] },
    { fields: ['replyToId'] },
  ],
});

module.exports = Message;
