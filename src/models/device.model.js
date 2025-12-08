import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        deviceId: {
            type: String,
            // unique index will be created below
        },
        deviceName: String,
        name: String, // Alias for deviceName for admin panel compatibility
        status: {
            type: String,
            enum: ["online", "offline"],
            default: "offline",
        },
        pairingCode: String,
        isPaired: {
            type: Boolean,
            default: false,
        },
        expiresAt: Date,
        lastConnected: Date,
    },
    { timestamps: true }
);

// Create unique index on deviceId
deviceSchema.index({ deviceId: 1 }, { unique: true, sparse: true });

// Virtual to get name from deviceName if name is not set
deviceSchema.virtual("displayName").get(function () {
    return this.name || this.deviceName || "Unnamed Device";
});

export default mongoose.model("Device", deviceSchema);
