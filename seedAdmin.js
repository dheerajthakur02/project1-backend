import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.model.js'; // Adjust path if needed
import bcrypt from 'bcryptjs';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('MongoDB Connected');

    const adminEmail = 'admin@ptepractice.com';
    const adminPassword = 'admin123';
    const adminName = 'Admin User';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin user already exists');
       // Optionally update password or role to ensure it's correct
       existingAdmin.role = 'admin';
       existingAdmin.password = await bcrypt.hash(adminPassword, 10); // Re-hash to be sure
       await existingAdmin.save();
       console.log('Admin credentials updated');
    } else {
      const newAdmin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook if creating new
        phone: '1234567890',
        role: 'admin',
      });
      await newAdmin.save();
      console.log('Admin user created successfully');
    }

    console.log(`
      ---------------------------------------
      Admin Credentials:
      Email: ${adminEmail}
      Password: ${adminPassword}
      ---------------------------------------
    `);

    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
