const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Conversations', key: 'id' },
  },
  callerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  callType: {
    type: DataTypes.ENUM('voice', 'video'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('ringing', 'ongoing', 'completed', 'missed', 'rejected', 'cancelled'),
    defaultValue: 'ringing',
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Duration in seconds',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['callerId'] },
    { fields: ['receiverId'] },
    { fields: ['status'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Call;
