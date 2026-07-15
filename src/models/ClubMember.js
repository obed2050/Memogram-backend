const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ClubMember = sequelize.define('ClubMember', {
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
  clubId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Clubs', key: 'id' },
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    defaultValue: 'member',
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'clubId'] },
    { fields: ['clubId'] },
  ],
});

module.exports = ClubMember;
