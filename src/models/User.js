const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [2, 100] },
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: { len: [3, 50], isAlphanumeric: true },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { len: [6, 255] },
  },
  profilePhoto: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  coverPhoto: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: [0, 500] },
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  currentSchool: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  generation: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  suspended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  suspendedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  suspensionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['username'] },
    { unique: true, fields: ['email'] },
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toSafeObject = function () {
  const { id, fullName, username, email, profilePhoto, coverPhoto, bio, gender, dateOfBirth, currentSchool, generation, role, suspended, suspendedUntil, suspensionReason, createdAt } = this;
  return { id, fullName, username, email, profilePhoto, coverPhoto, bio, gender, dateOfBirth, currentSchool, generation, role, suspended, suspendedUntil, suspensionReason, createdAt };
};

module.exports = User;