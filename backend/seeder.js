const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const suppliers = [
  {
    name: 'Global Electronics Corp',
    contactPerson: 'John Smith',
    email: 'john@global.com',
    phone: '+1 234 567 890',
    address: '123 Silicon Valley, CA',
    category: 'Electronics',
  },
  {
    name: 'Modern Furniture Ltd',
    contactPerson: 'Sarah Wilson',
    email: 'sarah@modern.com',
    phone: '+1 987 654 321',
    address: '456 Design Ave, NY',
    category: 'Furniture',
  }
];

const products = [
  { name: 'Wireless Mouse', sku: 'PRD-001', category: 'Electronics', stock: 150, price: 29.99, unit: 'pcs' },
  { name: 'Mechanical Keyboard', sku: 'PRD-002', category: 'Electronics', stock: 85, price: 89.99, unit: 'pcs' },
  { name: 'USB-C Hub', sku: 'PRD-003', category: 'Electronics', stock: 12, price: 49.99, unit: 'pcs' },
  { name: 'Monitor Stand', sku: 'PRD-004', category: 'Furniture', stock: 0, price: 79.99, unit: 'pcs' },
  { name: 'Desk Lamp', sku: 'PRD-005', category: 'Furniture', stock: 45, price: 34.99, unit: 'pcs' },
];

const importData = async () => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Supplier.deleteMany();

    const createdUsers = await User.create({
      name: 'Super Admin',
      email: 'admin@pac.com',
      password: 'perfect',
      isAdmin: true,
      role: 'super-admin',
    });

    const createdSuppliers = await Supplier.insertMany(suppliers);
    
    const sampleProducts = products.map((product, index) => {
      return { 
        ...product, 
        supplier: index < 3 ? createdSuppliers[0]._id : createdSuppliers[1]._id 
      };
    });

    await Product.insertMany(sampleProducts);

    console.log('Data Imported successfully!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

importData();
