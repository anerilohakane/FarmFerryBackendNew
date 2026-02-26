const mongoose = require('mongoose');
const dbConnect = async () => {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect('mongodb+srv://aneridelxn_db_user:YhZGkF6u2pEeVyvJ@farmferry-db.11sfqjg.mongodb.net/farmferry_data?retryWrites=true&w=majority');
};

const cartSchema = new mongoose.Schema({
    customer: mongoose.Schema.Types.ObjectId,
    items: [{
        product: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        price: Number,
        discountedPrice: Number,
        totalPrice: Number
    }]
});
const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

const checkCart = async (userId) => {
    await dbConnect();
    const cart = await Cart.findOne({ customer: new mongoose.Types.ObjectId(userId) }).lean();
    if (cart) {
        console.log('ITEM_IDS:');
        cart.items.forEach(i => {
            console.log(`ID: ${i._id} | Product: ${i.product} | Qty: ${i.quantity}`);
        });
    } else {
        console.log('No cart found');
    }
    process.exit(0);
};

checkCart('6967263c2d2951851c61b9c9');
