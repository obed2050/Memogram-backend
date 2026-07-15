const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  isGroup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  groupName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  lastMessageContent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lastMessageSenderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  lastMessageType: {
    type: DataTypes.ENUM('text', 'image', 'video', 'system'),
    defaultValue: 'text',
  },
}, {
  timestamps: true,
});

module.exports = Conversation;