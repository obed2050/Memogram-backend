const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'Users', key: 'id' },
  },
  achievements: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  badges: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  skills: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  interests: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  favoriteSubjects: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  favoriteClubs: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
}, {
  tableName: 'user_profiles',
  timestamps: true,
});

module.exports = UserProfile;
