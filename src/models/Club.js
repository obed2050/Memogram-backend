const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Club = sequelize.define('Club', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { len: [1, 255] },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: [0, 2000] },
  },
  coverImage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  logo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  postsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['schoolId'] },
    { fields: ['createdBy'] },
    { fields: ['name'] },
  ],
});

module.exports = Club;
