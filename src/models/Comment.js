const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
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
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Posts', key: 'id' },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  parentCommentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Comments', key: 'id' },
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  hidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  hiddenBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  hiddenAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  hiddenReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['postId'] },
    { fields: ['parentCommentId'] },
  ],
});

module.exports = Comment;