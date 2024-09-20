import asyncHandler from "../utils/asyncHandler.js"
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiError} from '../utils/ApiErrors.js';
import ApiResponse from '../utils/ApiResponse.js';


// Generate Access And Refresh Token 

const generateAccessAndRefreshToken = async (userId) => {

        try {
           const user = await User.findById(userId);
           
            const accessToken = await user.generateAccessToken();
            const refreshToken = await user.generateRefreshToken();

             user.refreshToken = refreshToken;

            await user.save({validateBeforesave : false});
            return {accessToken, refreshToken}



        } catch (error) {
            console.log("Error in Generating the access and Refresh Token", error)
        }

}

const registerUser = asyncHandler(async (req, res) => {

    const {username, email, fullname, password} = req.body;
    // Data has been came to us.
    // 1st step is the data validation

    if([username, email, fullname, password].some((field)=> field.trim() === ""))
    {
        throw new ApiError(400, "All fields are required");
    }

    // 2nd Step is there any user with the same user name and email exist or not

     const existedUser=await User.findOne({
        $or : [
            {username},
            {email}
    ]});

    if(existedUser)
    {
        throw new ApiError(409, "User with same username or email already exist");
    }

    // 3rd Step Handling the files(avatar and coverImage) now.

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    //  all the data has been uploaded
     
    // 4th Step Now we will created the User

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        username,
        email,
        password,
    })

    // Now user has been created. but we don't required the password and refresh token back into the user. 

    const createdUser = await User.findById(user._id).select("-_password -refreshToken");

    if(!createdUser)
    {
        throw new ApiError(500, "Data not find here Finding or Created User");
    }


    return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
})


// LoginUser Here

const loginUser = asyncHandler(async (req, res) => {
    
    // Data -> req.body
    // validation username and password find
    // user exist or not
    // password match or not
    // generate access token and refresh token
    // send access token and refresh token back to the user and cookies
    // Send Response.

    const {username, email , password} = req.body;

    if([username,email].some((field) => field.trim() === "")){
        throw new ApiError(400, "Username or Email is required");
    }

    // Here the data has been ended here

   const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user)
    {
        throw new ApiError(400, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid)
    {
        throw new ApiError(400, "Invalid password");
    }

    const {refreshToken, accessToken } = generateAccessAndRefreshToken(user._id);

    const loginUser =await  User.findById(user._id).select("-password -refreshToken")

    if(!loginUser){
        throw new ApiError(400,"LoginUser not found");
    }

    const options = {
        httpOnly : true,
        secure : true,
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,{
            user : loginUser, accessToke,refreshToken
        },
        "User Logged In successfully")
    )
    

    }

)

// LogOutUser

const logoutUser = asyncHandler(async (req, res) => {
   
    await User.findByIdAndUpdate(req.user._id, {
        $set : {
            refreshToken : undefined
        }
        
    },{
        new: true
    })

    const options = {
    httpOnly : true,
    secure : true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out successfully"))

})

// Change the current password

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword}=req.body

    if([oldPassword,newPassword].some((field)=> field.trim() === ""))
    {
        throw new ApiError(400, "Old password or new password is not allowed to be empty");
    }
    // USer has been founded here
    const user = await User.findById(req.user._id);

    if(!user)
    {
        throw new ApiError(400, "User not found into the password section");
    }
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(400, "Old password is not correct");
    }
    // Here the new password has been changed
    user.password = newPassword;
    await user.save({validateBeforeSave : false});

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))    
})


// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
 return res.status(200).json(new ApiResponse(200, req.user, "Current User found successfully"))
});

// Update Account Details

const UpdateAccountDetails = asyncHandler(async (req, res) => {
    
    const {fullname, username, email} = req.body;

    const user = await User.findById(req.user._id);
    if(!user)
    {
        throw new ApiError(400, "User not found in updated Account Details");
    }

    const updateUser = await User.findByIdAndUpdate(req.user._id, {
    //    $set is the mongoDb operator which used to update the data 
    // findbyIDAndUpdate is mongoose method to update the data into the database.
        $set : {
            fullname : fullname,
            username : username,
            email : email
        }
    },{
        new : true
        // new meaning here it will return the updated data.
        // if we don't write this then it will return the old data.
    })
    
    return res.status(200).json(new ApiResponse(200, updateUser, "Account Details updated successfully"))

})

// Update Avatar Image

const UpdateAvatarImage = asyncHandler(async (req, res) => {
    
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath)
    {
        throw new ApiError(400, "Please upload an image file");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url)
    {
        throw new ApiError(400, "Please upload an image file");
    }


    const user = await User.findById(req.user._id);
    if(!user)
    {
        throw new ApiError(400,"User not found in updated Avatar Image");
    }

    const updateAvatar = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                avatar: avatar.url
            }
        },{
            new : true
        }
    )

    return res.status(200).json(new ApiResponse(200, updatedAvatar, "Avatar Image updated successfully"))
})

// Update Cover Image

const UpdateCoverImage = asyncHandler(async (req, res) => {
    
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath)
    {
        throw new ApiError(400, "Please upload an image file");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url)
    {
        throw new ApiError(400,"Please upload an Coverimage file");
    }

    // const user = await User.findById(req.user._id);
    // if(!user)
    // {
    //     throw new ApiError(400,"User not found in updated Cover Image");
    // }

    await User.findByIdAndUpdate( req.user._id,
        
       
        {
            $set :{
                coverImage : coverImage.url
            }
        },
        {
            new:true
            // Meaning here that it will return the updated data. if you don' write this then it will return the old data.
        }
    
    )
})

// Extract Complex data with aggregation Pipelines

// Get User Channel Profile

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    // Check if username exists in params
    if (!username) {
        throw new ApiError(400, "Username not provided in the request parameters");
    }

    // Perform the aggregation pipeline
    const channel = await User.aggregate([
        {
            // Match the user by username
            $match: { username: username }
        },
        {
            // Lookup subscribers for the channel
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            // Lookup the channels the user is subscribed to
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            // Add additional fields
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { 
                            $in: [req.user?._id, "$subscribers.subscriber"] 
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            // Select specific fields to return in the response
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    // Check if the channel was found
    if (!channel || channel.length === 0) {
        throw new ApiError(404, "Channel not found");
    }

    // Return the first result, since aggregate returns an array
    res.status(200).json(new ApiResponse(200,channel[0],"Channel Profile Fethched Successfully"));


});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})





export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    UpdateAccountDetails,
    UpdateAvatarImage,
    UpdateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    
}