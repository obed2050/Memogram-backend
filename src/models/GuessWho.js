const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const GuessWho = sequelize.define('GuessWho', {
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
  photo: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  hint: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Schools', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('active', 'revealed'),
    defaultValue: 'active',
  },
  revealAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  guessCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['revealAt'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = GuessWho;
