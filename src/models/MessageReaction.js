const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const MessageReaction = sequelize.define('MessageReaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  messageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Messages', key: 'id' },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  emoji: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['messageId', 'userId', 'emoji'] },
  ],
});

module.exports = MessageReaction;
