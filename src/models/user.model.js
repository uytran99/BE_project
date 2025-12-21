import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    // ===== Health Profile Fields =====
    age: {
      type: Number,
      min: 0,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    weight: {
      type: Number, // kilograms
      min: 0,
      default: null,
    },
    conditions: {
      type: [String], // bệnh nền / health conditions (e.g. 'hypertension','diabetes','athlete')
      default: [],
    },
    // ===== Role-Based Access Control =====
    role: {
      type: String,
      enum: ['user', 'admin', 'doctor'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;