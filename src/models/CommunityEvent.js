const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const CommunityEvent = sequelize.define('CommunityEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Schools', key: 'id' },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { len: [1, 255] },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  eventDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  coverImage: {
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
  attendeesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  eventType: {
    type: DataTypes.ENUM('graduation', 'sports', 'trip', 'talent_show', 'science_fair', 'cultural', 'other'),
    defaultValue: 'other',
  },
  clubId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Clubs', key: 'id' },
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['userId'] },
    { fields: ['eventDate'] },
    { fields: ['eventType'] },
    { fields: ['clubId'] },
  ],
});

module.exports = CommunityEvent;
