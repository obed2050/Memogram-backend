const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const EventComment = sequelize.define('EventComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'CommunityEvents', key: 'id' },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  parentCommentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'EventComments', key: 'id' },
  },
  repliesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['eventId'] },
    { fields: ['parentCommentId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = EventComment;
