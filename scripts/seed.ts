import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../src/models/User.model';
import { Shop } from '../src/models/Shop.model';
import { Item } from '../src/models/Item.model';
import { Subscription } from '../src/models/Subscription.model';
import { BankDetails } from '../src/models/BankDetails.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/panpoint';

async function seed(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    Item.deleteMany({}),
    Subscription.deleteMany({}),
    BankDetails.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data');

  // ─── Admin ────────────────────────────────────────────────────────────────
  await User.create({
    name: 'PanPoint Admin',
    phone: '9000000000',
    passwordHash: await bcrypt.hash('admin123', 12),
    role: 'admin',
    isActive: true,
  });
  console.log('👑 Admin: 9000000000 / admin123');

  // ─── Owner 1 — Pro Shop ───────────────────────────────────────────────────
  const owner1 = await User.create({
    name: 'Raju Paan Wala',
    phone: '9111111111',
    passwordHash: await bcrypt.hash('owner123', 12),
    role: 'owner',
    isActive: true,
  });

  const shop1 = await Shop.create({
    owner:               owner1._id,
    shopName:            'Raju Pan Corner',
    description:         'Best pan and cigarettes in MG Road since 1995!',
    address:             'MG Road, Near Metro Station, Bengaluru - 560001',
    geoLocation:         { type: 'Point', coordinates: [77.5946, 12.9716] },
    phone:               '9111111111',
    openingTime:         '08:00',
    closingTime:         '23:00',
    lateNightAvailable:  true,
    lateNightClosingTime: '03:00',
    isOpen:              true,
    planType:            'pro',
    isApproved:          true,
    isBlocked:           false,
    avgRating:           4.5,
    totalReviews:        24,
  });

  await BankDetails.create({
    shop:               shop1._id,
    accountHolderName:  'Raju Kumar',
    accountNumber:      '1234567890',
    ifscCode:           'SBIN0001234',
    verificationStatus: 'verified',
  });

  const now = new Date();
  await Subscription.create({
    shop:       shop1._id,
    planType:   'pro',
    startDate:  now,
    expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    isActive:   true,
  });

  await Item.insertMany([
    { shop: shop1._id, name: 'Meetha Paan',      category: 'PAN',       price: 15, stock: 50,  isAvailable: true },
    { shop: shop1._id, name: 'Saada Paan',        category: 'PAN',       price: 10, stock: 100, isAvailable: true },
    { shop: shop1._id, name: 'Banarasi Paan',     category: 'PAN',       price: 25, stock: 30,  isAvailable: true },
    { shop: shop1._id, name: 'Elaichi Paan',      category: 'PAN',       price: 20, stock: 40,  isAvailable: true },
    { shop: shop1._id, name: 'Gold Flake Kings',  category: 'CIGARETTE', price: 12, stock: 200, isAvailable: true, unit: 'per stick' },
    { shop: shop1._id, name: 'Classic Milds',     category: 'CIGARETTE', price: 14, stock: 150, isAvailable: true, unit: 'per stick' },
    { shop: shop1._id, name: 'Wills Navy Cut',    category: 'CIGARETTE', price: 13, stock: 180, isAvailable: true, unit: 'per stick' },
    { shop: shop1._id, name: 'Four Square',       category: 'CIGARETTE', price: 11, stock: 200, isAvailable: true, unit: 'per stick' },
  ]);
  console.log('🏪 Pro shop: Raju Pan Corner (owner: 9111111111 / owner123)');

  // ─── Owner 2 — Basic Shop ─────────────────────────────────────────────────
  const owner2 = await User.create({
    name: 'Suresh Bhai',
    phone: '9222222222',
    passwordHash: await bcrypt.hash('shop123', 12),
    role: 'owner',
    isActive: true,
  });

  const shop2 = await Shop.create({
    owner:              owner2._id,
    shopName:           'Suresh Pan Stall',
    description:        'Fresh paan made to order. Koramangala favourite!',
    address:            'Koramangala 5th Block, Bengaluru - 560095',
    geoLocation:        { type: 'Point', coordinates: [77.6245, 12.9352] },
    phone:              '9222222222',
    openingTime:        '09:00',
    closingTime:        '22:00',
    lateNightAvailable: false,
    isOpen:             true,
    planType:           'basic',
    isApproved:         true,
    isBlocked:          false,
    avgRating:          3.9,
    totalReviews:       8,
  });

  await BankDetails.create({
    shop:               shop2._id,
    accountHolderName:  'Suresh Patel',
    accountNumber:      '9876543210',
    ifscCode:           'HDFC0001234',
    verificationStatus: 'verified',
  });

  await Subscription.create({
    shop:       shop2._id,
    planType:   'basic',
    startDate:  now,
    expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    isActive:   true,
  });

  await Item.insertMany([
    { shop: shop2._id, name: 'Special Paan',   category: 'PAN',       price: 20, stock: 40,  isAvailable: true },
    { shop: shop2._id, name: 'Fire Paan',       category: 'PAN',       price: 30, stock: 20,  isAvailable: true },
    { shop: shop2._id, name: 'Wills Navy Cut',  category: 'CIGARETTE', price: 13, stock: 100, isAvailable: true, unit: 'per stick' },
    { shop: shop2._id, name: 'Benson & Hedges', category: 'CIGARETTE', price: 16, stock: 80,  isAvailable: true, unit: 'per stick' },
  ]);
  console.log('🏪 Basic shop: Suresh Pan Stall (owner: 9222222222 / shop123)');

  // ─── Customer ─────────────────────────────────────────────────────────────
  await User.create({
    name: 'Rahul Kumar',
    phone: '9333333333',
    passwordHash: await bcrypt.hash('cust123', 12),
    role: 'customer',
    isActive: true,
  });
  console.log('👤 Customer: 9333333333 / cust123');

  console.log('\n══════════════════════════════════════════');
  console.log('✅  Seed complete!');
  console.log('══════════════════════════════════════════');
  console.log('  Admin:           9000000000 / admin123');
  console.log('  Owner (Pro):     9111111111 / owner123');
  console.log('  Owner (Basic):   9222222222 / shop123');
  console.log('  Customer:        9333333333 / cust123');
  console.log('══════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
