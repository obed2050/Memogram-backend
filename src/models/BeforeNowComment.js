const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const BeforeNowComment = sequelize.define('BeforeNowComment', {
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
  beforeNowId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'BeforeNows', key: 'id' },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  parentCommentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'BeforeNowComments', key: 'id' },
  },
  repliesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['beforeNowId'] },
    { fields: ['parentCommentId'] },
  ],
});

module.exports = BeforeNowComment;
