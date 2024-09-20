import dotenv from 'dotenv';
import app from "./app.js";
import connectDb from "./db/index.js";

// const PORT = 8001;
dotenv.config({
    path : "./.env"
})
const PORT = process.env.PORT || 8001;

connectDb()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`Server is listening onto the port,${PORT}`);
    })
})

