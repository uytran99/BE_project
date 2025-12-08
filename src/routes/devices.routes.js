import express from "express";
import { getAllDevices, getDeviceById, createDevice, updateDevice, deleteDevice } from "../controllers/devices.controller.js";

const router = express.Router();

// GET all devices
router.get("/", getAllDevices);

// GET device by ID
router.get("/:id", getDeviceById);

// POST create device
router.post("/", createDevice);

// PUT update device
router.put("/:id", updateDevice);

// DELETE device
router.delete("/:id", deleteDevice);

export default router;
