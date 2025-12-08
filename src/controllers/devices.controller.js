import Device from "../models/device.model.js";
import mongoose from "mongoose";

/**
 * GET /api/devices
 * Lấy danh sách tất cả thiết bị
 */
export const getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find({}).lean();

        // Map deviceName to name if name is not set
        const formattedDevices = devices.map((device) => ({
            ...device,
            name: device.name || device.deviceName || "Unnamed Device",
            status: device.status || (device.lastConnected && new Date(device.lastConnected) > new Date(Date.now() - 5 * 60 * 1000) ? "online" : "offline"),
        }));

        res.json({
            success: true,
            data: formattedDevices,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching devices",
            error: error.message,
        });
    }
};

/**
 * GET /api/devices/:id
 * Lấy chi tiết một thiết bị
 */
export const getDeviceById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid device ID",
            });
        }

        const device = await Device.findById(id).lean();

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found",
            });
        }

        // Format response
        const formattedDevice = {
            ...device,
            name: device.name || device.deviceName || "Unnamed Device",
            status: device.status || (device.lastConnected && new Date(device.lastConnected) > new Date(Date.now() - 5 * 60 * 1000) ? "online" : "offline"),
        };

        res.json({
            success: true,
            data: formattedDevice,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching device",
            error: error.message,
        });
    }
};

/**
 * POST /api/devices
 * Tạo thiết bị mới
 */
export const createDevice = async (req, res) => {
    try {
        const { deviceId, name, status } = req.body;

        if (!deviceId || !name) {
            return res.status(400).json({
                success: false,
                message: "deviceId and name are required",
            });
        }

        // Check if deviceId already exists
        const existingDevice = await Device.findOne({ deviceId });
        if (existingDevice) {
            return res.status(400).json({
                success: false,
                message: "Device with this deviceId already exists",
            });
        }

        const device = new Device({
            deviceId,
            name,
            deviceName: name, // Also set deviceName for backward compatibility
            status: status || "offline",
            isPaired: false,
        });

        await device.save();

        res.status(201).json({
            success: true,
            data: {
                _id: device._id,
                deviceId: device.deviceId,
                name: device.name || device.deviceName,
                status: device.status,
                lastConnected: device.lastConnected,
                createdAt: device.createdAt,
                updatedAt: device.updatedAt,
            },
            message: "Device created successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating device",
            error: error.message,
        });
    }
};

/**
 * PUT /api/devices/:id
 * Cập nhật thiết bị
 */
export const updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status, deviceId } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid device ID",
            });
        }

        // Check if device exists
        const device = await Device.findById(id);
        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found",
            });
        }

        // Update fields
        if (name !== undefined) {
            device.name = name;
            device.deviceName = name; // Also update deviceName for backward compatibility
        }
        if (status !== undefined) {
            device.status = status;
        }
        if (deviceId !== undefined && deviceId !== device.deviceId) {
            // Check if new deviceId already exists
            const existingDevice = await Device.findOne({ deviceId });
            if (existingDevice && existingDevice._id.toString() !== id) {
                return res.status(400).json({
                    success: false,
                    message: "Device with this deviceId already exists",
                });
            }
            device.deviceId = deviceId;
        }

        device.updatedAt = new Date();
        await device.save();

        res.json({
            success: true,
            data: {
                _id: device._id,
                deviceId: device.deviceId,
                name: device.name || device.deviceName,
                status: device.status,
                lastConnected: device.lastConnected,
                createdAt: device.createdAt,
                updatedAt: device.updatedAt,
            },
            message: "Device updated successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating device",
            error: error.message,
        });
    }
};

/**
 * DELETE /api/devices/:id
 * Xóa thiết bị
 */
export const deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid device ID",
            });
        }

        const result = await Device.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Device not found",
            });
        }

        res.json({
            success: true,
            message: "Device deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting device",
            error: error.message,
        });
    }
};

export default { getAllDevices, getDeviceById, createDevice, updateDevice, deleteDevice };
