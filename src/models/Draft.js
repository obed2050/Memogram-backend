const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Draft = sequelize.define('Draft', {
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
  type: {
    type: DataTypes.ENUM('post', 'reel', 'memory'),
    allowNull: false,
    defaultValue: 'post',
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
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Draft;
