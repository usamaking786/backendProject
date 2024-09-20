import { DB_NAME } from "../constant.js";
import mongoose from 'mongoose';

const connectDb = async () => {
    try {
        const conn = await mongoose.connect(`${process.env.DB_URL}/${DB_NAME}`)
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
};


export default connectDb;