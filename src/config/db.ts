import mongoose from "mongoose";

export const connectToDb = async ():Promise<void>=>{
    try{
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/node-auction';
        if(!mongoURI) console.error("provide the uri");
        await mongoose.connect(mongoURI);
        console.log('📦 Connected to MongoDB successfully');
    }catch(error){
        console.error(`some error has occured ${error}`);
        process.exit(1);
    }
}