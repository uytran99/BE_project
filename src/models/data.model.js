import mongoose from "mongoose";

const DataSchema = new mongoose.Schema({
    ecg: Number,
    acc: [Number],
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Data", DataSchema);
