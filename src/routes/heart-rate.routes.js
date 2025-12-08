import express from "express";
import { getHeartRateData, getHeartRateById, deleteHeartRate } from "../controllers/heart-rate.controller.js";

const router = express.Router();

// GET all heart rate data with filters and pagination
router.get("/", getHeartRateData);

// GET heart rate by ID
router.get("/:id", getHeartRateById);

// DELETE heart rate data
router.delete("/:id", deleteHeartRate);

export default router;
