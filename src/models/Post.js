const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
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
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
  },
  videos: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Schools', key: 'id' },
  },
  generation: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Clubs', key: 'id' },
  },
  type: {
    type: DataTypes.ENUM('post', 'memory', 'reel'),
    defaultValue: 'post',
  },
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public',
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['schoolId'] },
    { fields: ['clubId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Post;