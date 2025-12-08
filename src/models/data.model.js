import mongoose from "mongoose";

const DataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    deviceId: {
        type: String,
        index: true, // Index for faster queries
    },
    heartRate: {
        type: Number,
        required: true,
        min: 0,
        max: 300,
    },
    ecg: Number,
    acc: [Number],
    status: {
        type: String,
        enum: ["normal", "warning", "critical"],
        default: "normal",
    },
    notes: String,
    // AI Diagnosis fields
    aiDiagnosis: {
        diagnosis: String,
        severity: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
        },
        analysis: String,
        recommendations: [String],
        riskFactors: [String],
        needsAttention: Boolean,
        urgencyLevel: {
            type: String,
            enum: ["routine", "urgent", "emergency"],
        },
        aiModel: String,
        diagnosedAt: Date,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true, // Index for faster date queries
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index for deviceId and timestamp
DataSchema.index({ deviceId: 1, timestamp: -1 });

export default mongoose.model("Data", DataSchema);
