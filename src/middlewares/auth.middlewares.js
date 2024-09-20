import jwt from "jsonwebtoken";
import {ApiError} from "../utils/ApiErrors.js";
import {User} from "../models/user.models.js";
import asyncHandler from "../utils/asyncHandler.js";


export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.access_token || req.headers?.authorization?.replace("Bearer ", "");
    
    if(!token){
        return new ApiError(401, "unAuthorization token not found");    
    }
    try {
        
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
    
        if(!user){
            return new ApiError(401, "user not found from token");
        }
    
        req.user = user;
        next();
    
    } catch (error) {
        console.log("Error in verifyJWT MiddleWare", error);
    }
})