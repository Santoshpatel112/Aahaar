import User from "../models/userModel.js";
import asyncHandler from "./asyncHandler.js";
import jwt from "jsonwebtoken";

const protect = asyncHandler(async(req, res, next) => {
    let token;
    token = req.cookies.jwt;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            if (!user) {
                // clear cookie on server-side so client token is invalidated
                res.cookie('jwt', '', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== 'development',
                    sameSite: process.env.NODE_ENV !== 'development' ? 'None' : 'Lax',
                    expires: new Date(0),
                });
                res.status(401);
                throw new Error('Not authorized, user not found');
            }
            req.user = user;
            next();
        } catch (error) {
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
        
    } else {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
})
export { protect };