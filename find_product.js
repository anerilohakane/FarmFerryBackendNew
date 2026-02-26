const mongoose = require('mongoose');
const dbConnect = async () => {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect('mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority');
};

const findProduct = async () => {
    await dbConnect();
    const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({ name: String }));
    const product = await Product.findOne({ name: /Full Cream Milk/i }).lean();
    console.log('Product:', JSON.stringify(product, null, 2));
    process.exit(0);
};

findProduct();
