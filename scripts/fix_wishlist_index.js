
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable');
    process.exit(1);
}

async function fixIndexes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const collection = db.collection('wishlists');

        console.log('Listing current indexes...');
        const indexes = await collection.indexes();
        console.log(indexes);

        const conflictingIndex = indexes.find(idx => idx.name === 'userId_1');
        if (conflictingIndex) {
            console.log('Found conflicting index: userId_1. Dropping it...');
            await collection.dropIndex('userId_1');
            console.log('Dropped index userId_1 successfully.');
        } else {
            console.log('Index userId_1 not found (maybe checks passed).');
            // Check for other potential bad indexes containing userId
            const otherBadIndex = indexes.find(idx => idx.key.userId);
            if (otherBadIndex) {
                console.log(`Found another index on userId: ${otherBadIndex.name}. Dropping...`);
                await collection.dropIndex(otherBadIndex.name);
                console.log('Dropped.');
            }
        }

        console.log('Done!');
        process.exit(0);

    } catch (error) {
        console.error('Error fixing indexes:', error);
        process.exit(1);
    }
}

fixIndexes();
