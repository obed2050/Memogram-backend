const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Memory = sequelize.define('Memory', {
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
  caption: {
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
  eventId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'CommunityEvents', key: 'id' },
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
    { fields: ['schoolId'] },
    { fields: ['eventId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Memory;