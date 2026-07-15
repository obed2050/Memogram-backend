const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const GenerationDiscussionReply = sequelize.define('GenerationDiscussionReply', {
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
  discussionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'GenerationDiscussions', key: 'id' },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['discussionId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = GenerationDiscussionReply;
