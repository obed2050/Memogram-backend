const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const MessageRead = sequelize.define('MessageRead', {
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
  readAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['messageId', 'userId'] },
    { fields: ['userId'] },
    { fields: ['messageId'] },
  ],
});

module.exports = MessageRead;
