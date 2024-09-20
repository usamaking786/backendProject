import { 
    registerUser , 
    loginUser, 
    logoutUser, 
    changeCurrentPassword, 
    UpdateAccountDetails, 
    getCurrentUser,
    UpdateAvatarImage,
    UpdateCoverImage,
    getUserChannelProfile,
    getWatchHistory
 } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import {Router} from 'express';
import {verifyJWT} from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
        name : "avatar",
        maxCount : 1
    },
    {
        name : "coverImage",
        maxCount : 1,
    }
]),registerUser)

// LoginUser will be come here
router.route("/login",).post(loginUser)


// Secured Routes
// Logout User will be here
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/updateAccount").patch(verifyJWT,UpdateAccountDetails);
router.route("/avatar").patch(verifyJWT,upload.single("avatar") ,UpdateAvatarImage);
router.route("/coverImage").patch(verifyJWT, upload.single("coverImage") ,UpdateCoverImage);
router.route("/c/:username").get(verifyJWT,getUserChannelProfile);
router.route("/history").get(verifyJWT,getWatchHistory);



export default router;