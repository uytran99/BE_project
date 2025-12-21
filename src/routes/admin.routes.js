import express from "express";
import jwt from "jsonwebtoken";
import * as adminCtrl from "../controllers/admin.controller.js";
import { authenticateAdmin } from "../middleware/admin.middleware.js";
import User from "../models/user.model.js";

const router = express.Router();

// ===== Admin Login API =====
router.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: "Email and password are required" 
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: "Invalid credentials" 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                error: "Invalid credentials" 
            });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: "Access denied. Admin privileges required." 
            });
        }

        // Generate JWT token (longer expiry for admin)
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "8h" }
        );

        res.json({
            success: true,
            message: "Admin login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ 
            success: false, 
            error: "Login failed" 
        });
    }
});

// ===== Verify Admin Token API =====
router.get("/api/verify", authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        message: "Token is valid",
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// ===== Get Current Admin Info =====
router.get("/api/me", authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// ===== Protected Admin APIs (require login + admin role) =====
router.get("/api/users", authenticateAdmin, adminCtrl.listUsers);
router.get("/api/data", authenticateAdmin, adminCtrl.listData);
router.delete("/api/users/:id", authenticateAdmin, adminCtrl.deleteUser);
router.delete("/api/data/:id", authenticateAdmin, adminCtrl.deleteData);
router.get("/api/export/data", authenticateAdmin, adminCtrl.exportDataCSV);
router.post("/api/re-diagnose/:id", authenticateAdmin, adminCtrl.reDiagnoseRecord);

export default router;
