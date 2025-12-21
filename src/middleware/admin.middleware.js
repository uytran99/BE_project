import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') 
                   || req.headers['x-admin-token'] 
                   || req.query.token;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Access denied. No token provided.' 
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not found.' 
            });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied. Admin privileges required.' 
            });
        }
        req.userId = user._id;
        req.user = user;
        req.isAdmin = true;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token.' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Token expired. Please login again.' 
            });
        }
        return res.status(500).json({ 
            success: false, 
            error: 'Authentication error.' 
        });
    }
};
export const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Access denied. No token provided.' 
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const user = await User.findById(decoded.userId).select('-password');

            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'User not found.' 
                });
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ 
                    success: false, 
                    error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
                });
            }

            req.userId = user._id;
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or expired token.' 
            });
        }
    };
};

export default { authenticateAdmin, requireRole };
