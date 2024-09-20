import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    email:{
        type:String,
        required:true,
        unqiue:true,
        lowercase:true,
        trime:true,
    },
    fullname:{
        type :String,
        required:true,
        lowercase:true,
        trime:true,
    },
    avatar:{
        type:String, //Cloudinary URL
        required:true,
    },
    coverImage : {
        type:String,    //Cloudinary URL   
    },
    watchHistory:[{
        type: Schema.Types.ObjectId,
        ref:"Video"
    }
],
    password:{
        type:String,
        required:[true, "Password is required"],
    },
    refreshToken:{
        type:String,
    }
},
{
timestamps:true
})

userSchema.pre("save", async function(next){
    
    // We don't use the arrow function here. we use normal function because we need to access the this keyword. and this keyword only give access to the context
    // password only be encrypted one time. and otherwise when we again modified the password

    if(!this.isModified("password")) return next(); // not everytime when we updated other field the password will change.

    this.password =await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    
    return await bcrypt.compare(password, this.password);
    // this return will give us the true and false values.
}


// JWT TOKESN
// Access Token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({ 
        _id: this._id, 
        username: this.username,
        email: this.email 
    }, 
        process.env.ACCESS_TOKEN_SECRET, 
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
}

// Now we will generate the refresh Token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id: this._id,
    },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        })
}



export const User = mongoose.model("User",userSchema);
