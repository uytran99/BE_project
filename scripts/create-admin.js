/**
 * Script tạo tài khoản Admin
 * Usage: node scripts/create-admin.js <email> <password> [username]
 * 
 * Ví dụ:
 *   node scripts/create-admin.js admin@example.com Admin123!
 *   node scripts/create-admin.js admin@example.com Admin123! superadmin
 */

import mongoose from 'mongoose';
import 'dotenv/config';

// Import User model
const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        age: { type: Number, min: 0, default: null },
        gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
        weight: { type: Number, min: 0, default: null },
        conditions: { type: [String], default: [] },
        role: { type: String, enum: ['user', 'admin', 'doctor'], default: 'user' }
    },
    { timestamps: true }
);

// Hash password before saving
import bcrypt from 'bcryptjs';
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('❌ Thiếu tham số!');
        console.log('📝 Cách dùng: node scripts/create-admin.js <email> <password> [username]');
        console.log('📝 Ví dụ: node scripts/create-admin.js admin@example.com Admin123!');
        process.exit(1);
    }

    const email = args[0];
    const password = args[1];
    const username = args[2] || 'admin';

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Email không hợp lệ!');
        process.exit(1);
    }

    // Validate password
    if (password.length < 6) {
        console.log('❌ Password phải có ít nhất 6 ký tự!');
        process.exit(1);
    }

    // Connect to MongoDB
    const uri = process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017/be_project';
    
    try {
        console.log('🔄 Đang kết nối MongoDB...');
        await mongoose.connect(uri);
        console.log('✅ Đã kết nối MongoDB');

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (existingUser.role === 'admin') {
                console.log('⚠️  Email này đã là Admin!');
            } else {
                // Upgrade to admin
                existingUser.role = 'admin';
                await existingUser.save();
                console.log('✅ Đã nâng cấp tài khoản lên Admin!');
                console.log(`📧 Email: ${email}`);
            }
            process.exit(0);
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            console.log(`⚠️  Username "${username}" đã tồn tại. Tự động thêm số...`);
            const count = await User.countDocuments({ username: new RegExp(`^${username}`) });
            const newUsername = `${username}${count + 1}`;
            console.log(`📝 Username mới: ${newUsername}`);
        }

        // Create admin user
        const uniqueUsername = existingUsername 
            ? `${username}${await User.countDocuments({ username: new RegExp(`^${username}`) }) + 1}`
            : username;

        const admin = new User({
            username: uniqueUsername,
            email,
            password,
            role: 'admin'
        });

        await admin.save();

        console.log('\n' + '='.repeat(50));
        console.log('🎉 TẠO TÀI KHOẢN ADMIN THÀNH CÔNG!');
        console.log('='.repeat(50));
        console.log(`📧 Email:    ${email}`);
        console.log(`👤 Username: ${uniqueUsername}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`👑 Role:     admin`);
        console.log('='.repeat(50));
        console.log('\n💡 Truy cập: http://localhost:3001/admin/login');
        console.log('');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();
