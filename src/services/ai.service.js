// src/services/ai.service.js
import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load model and normalization params
let model;
let normParams;

const loadModel = async () => {
    if (!model) {
        const modelJsonPath = path.join(__dirname, "../../heart_model/model.json");
        const normPath = path.join(__dirname, "../../normalization.json");

        if (!fs.existsSync(modelJsonPath) || !fs.existsSync(normPath)) {
            throw new Error(`TF model or normalization params not found. Expected: ${modelJsonPath} and ${normPath}`);
        }

        model = await tf.loadLayersModel("file://" + modelJsonPath);
        const normData = JSON.parse(fs.readFileSync(normPath, "utf8"));
        normParams = normData;
    }
    return model;
};

// Normalize input (graceful if normParams missing)
const normalizeInput = (value) => {
    if (!normParams || !Array.isArray(normParams.mean) || !Array.isArray(normParams.std)) {
        // Fallback: simple identity scaling (no normalization)
        return Number(value);
    }
    const mean = normParams.mean[0];
    const std = normParams.std[0] || 1.0;
    return (value - mean) / (std || 1.0);
};

// ===== Helpers =====
const safeJsonParse = (text, fallback) => {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
};

const getDiagnosisTitle = (severity) => {
    const titles = {
        0: "Healthy heart rate",
        1: "Heart rate needs monitoring",
        2: "Moderate cardiovascular risk",
        3: "High cardiovascular risk",
        4: "Very high cardiovascular risk - URGENT",
    };
    return titles[severity] || "Unknown";
};

const getUrgencyLevel = (severity) => {
    const levels = {
        0: "routine",
        1: "routine",
        2: "urgent",
        3: "urgent",
        4: "emergency",
    };
    return levels[severity] || "routine";
};

// ===== AI-powered dynamic recommendations and risk factors =====
const generateRecommendations = (heartRate, severity, confidence) => {
    const baseRecommendations = [];

    // AI "thinks" about heart rate patterns
    if (heartRate < 60) {
        baseRecommendations.push("Increase light physical activity", "Monitor heart rate daily");
    } else if (heartRate > 100) {
        baseRecommendations.push("Reduce caffeine and alcohol", "Practice relaxation techniques");
    } else {
        baseRecommendations.push("Maintain regular exercise habits", "Eat a balanced diet");
    }

    // AI adds severity-specific recommendations
    if (severity === "low") {
        baseRecommendations.push("Routine health check every 6 months", "Monitor BMI");
    } else if (severity === "medium") {
        baseRecommendations.push("See cardiology within 3 months", "Learn stress management techniques");
        baseRecommendations.push("Monitor blood pressure at home");
    } else if (severity === "high") {
        baseRecommendations.push("See a cardiologist immediately", "Run blood tests as advised");
        baseRecommendations.push("Start a DASH or Mediterranean style diet");
    } else {
        // critical
        baseRecommendations.push("Go to the emergency room immediately", "Do not drive alone");
        baseRecommendations.push("Prepare personal medical history information");
    }

    // AI adds confidence-based recommendations
    if (parseFloat(confidence) > 80) {
        baseRecommendations.push("Closely monitor any new symptoms");
    }

    // AI "randomly" selects 4-6 most relevant recommendations
    const shuffled = baseRecommendations.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(5, shuffled.length));
};

const generateRiskFactors = (heartRate, severity, confidence) => {
    const baseRiskFactors = [];

    // AI analyzes heart rate for potential risk factors
    if (heartRate < 50) {
        baseRiskFactors.push("Advanced age", "Use of cardiac medications");
    } else if (heartRate > 120) {
        baseRiskFactors.push("Prolonged stress", "Chronic sleep deprivation");
        baseRiskFactors.push("Endocrine disorders");
    }

    // AI adds severity-based risk factors
    if (severity === "medium") {
        baseRiskFactors.push("Sedentary lifestyle", "Smoking");
        baseRiskFactors.push("Family history of heart disease");
    } else if (severity === "high") {
        baseRiskFactors.push("Hypertension", "High blood cholesterol");
        baseRiskFactors.push("Obesity or overweight");
        baseRiskFactors.push("Type 2 diabetes");
    } else if (severity === "critical") {
        baseRiskFactors.push("Coronary artery disease", "Congestive heart failure");
        baseRiskFactors.push("Severe arrhythmia");
        baseRiskFactors.push("Thrombosis or embolus");
    }

    // AI considers confidence level
    if (parseFloat(confidence) > 85) {
        baseRiskFactors.push("Undetected risk factors may exist");
    }

    // AI selects 2-4 most relevant risk factors
    const shuffled = baseRiskFactors.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(4, shuffled.length));
};

// ===== Rule-based fallback (keep original logic, only translate messages) =====
const getRuleBasedDiagnosis = (heartRateData) => {
    const { heartRate } = heartRateData || {};
    let diagnosis = {
        diagnosis: "",
        severity: "low",
        analysis: "",
        recommendations: [],
        riskFactors: [],
        needsAttention: false,
        urgencyLevel: "routine",
    };

    if (typeof heartRate !== "number" || Number.isNaN(heartRate)) {
        diagnosis.diagnosis = "Missing/invalid heart rate data";
        diagnosis.analysis = "Cannot infer because heartRate is not a number.";
        return { success: true, diagnosis, aiModel: "rule-based", timestamp: new Date() };
    }

    if (heartRate < 40) {
        diagnosis = { diagnosis: "Severe bradycardia", severity: "critical", analysis: `Heart rate ${heartRate} bpm is very low.`, recommendations: ["See cardiology NOW", "Avoid heavy exertion", "Monitor symptoms", "Call emergency services if severe"], riskFactors: ["Atrioventricular block", "Sick sinus syndrome", "Medication side effects"], needsAttention: true, urgencyLevel: "emergency" };
    } else if (heartRate < 60) {
        diagnosis = { diagnosis: "Bradycardia", severity: "medium", analysis: `Heart rate ${heartRate} bpm is low; monitoring recommended.`, recommendations: ["Cardiology consult", "Monitor heart rate", "Watch for fatigue/dizziness", "Adopt healthy lifestyle"], riskFactors: ["Medication", "Thyroid issues"], needsAttention: true, urgencyLevel: "urgent" };
    } else if (heartRate <= 100) {
        diagnosis = { diagnosis: "Normal heart rate", severity: "low", analysis: `Heart rate ${heartRate} bpm is within 60–100.`, recommendations: ["Maintain healthy lifestyle", "Regular exercise", "Balanced diet", "Routine check-ups"], riskFactors: [], needsAttention: false, urgencyLevel: "routine" };
    } else if (heartRate <= 140) {
        diagnosis = { diagnosis: "Tachycardia", severity: "medium", analysis: `Heart rate ${heartRate} bpm is elevated; may be due to stress/caffeine.`, recommendations: ["Reduce caffeine", "Manage stress", "See doctor if persistent", "Rest", "Avoid substances"], riskFactors: ["Stress/anxiety", "Sleep deprivation", "Stimulants"], needsAttention: true, urgencyLevel: "urgent" };
    } else {
        diagnosis = { diagnosis: "Severe tachycardia", severity: "critical", analysis: `Heart rate ${heartRate} bpm is very high and may be an emergency.`, recommendations: ["Go to emergency", "Lie down and rest", "Do not self-medicate", "Call emergency services if chest pain/shortness of breath"], riskFactors: ["Severe arrhythmia", "Heart failure", "Myocardial ischemia"], needsAttention: true, urgencyLevel: "emergency" };
    }
    return { success: true, diagnosis, aiModel: "rule-based", timestamp: new Date() };
};

// ===== AI diagnosis via trained model =====
export const diagnoseHeartRate = async (heartRateData) => {
    try {
        const { heartRate } = heartRateData || {};

        if (typeof heartRate !== "number" || Number.isNaN(heartRate)) {
            return getRuleBasedDiagnosis(heartRateData);
        }

        // QUAN TRỌNG: Với nhịp tim bất thường (quá cao hoặc quá thấp),
        // dùng thẳng rule-based vì ML model được train trên exercise heart rate,
        // không phù hợp với resting heart rate
        if (heartRate < 40 || heartRate > 120) {
            console.info(`Heart rate ${heartRate} bpm is abnormal, using rule-based diagnosis`);
            return getRuleBasedDiagnosis(heartRateData);
        }

        // Short-circuit: only attempt Python AI for normal range (40-120 bpm)
        const scriptPath = path.join(process.cwd(), "run_ai.py");
        const venvPython = path.join(process.cwd(), "ai_env", "bin", "python3");
        if (fs.existsSync(scriptPath) && fs.existsSync(venvPython)) {
            try {
                return await diagnoseWithPythonAI(heartRateData);
            } catch (pythonError) {
                console.warn("Python AI failed, using rule-based:", pythonError?.message || pythonError);
                return getRuleBasedDiagnosis(heartRateData);
            }
        } else {
            console.info("Skipping Python AI: run_ai.py or ai_env python not present");
        }

        // Fallback to TensorFlow.js
        try {
            return await diagnoseWithTensorFlow(heartRateData);
        } catch (tfErr) {
            console.error("TensorFlow.js fallback failed:", tfErr?.message || tfErr);
            return getRuleBasedDiagnosis(heartRateData);
        }
    } catch (error) {
        console.error("AI Diagnosis Error:", error?.message || error);
        return getRuleBasedDiagnosis(heartRateData);
    }
};

// ===== Advanced Python AI Diagnosis =====
const diagnoseWithPythonAI = async (heartRateData) => {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
        try {
            const { heartRate, age = 50, sex = 1, trestbps = 120, chol = 200 } = heartRateData;

            const venvPython = path.join(process.cwd(), "ai_env", "bin", "python3");
            const scriptPath = path.join(process.cwd(), "run_ai.py");
            const resultPath = path.join(process.cwd(), "ai_result.json");

            if (!fs.existsSync(scriptPath)) {
                return reject(new Error(`Python AI script not found at ${scriptPath}`));
            }

            // Remove stale result so we only accept fresh outputs
            try {
                if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath);
            } catch (e) {
                // non-fatal
                console.warn("Could not remove previous ai_result.json:", e?.message || e);
            }

            const pythonCandidates = [];
            if (fs.existsSync(venvPython)) pythonCandidates.push(venvPython);
            pythonCandidates.push("python3", "python");

            const startTime = Date.now();
            let stdout = "";
            let stderr = "";
            let tried = [];

            const tryExec = (idx) => {
                if (idx >= pythonCandidates.length) {
                    return reject(new Error(`No python executable succeeded. tried=${tried.join(", ")} stdout=${stdout} stderr=${stderr}`));
                }
                const pythonExec = pythonCandidates[idx];
                tried.push(pythonExec);

                let child;
                try {
                    child = spawn(pythonExec, [scriptPath, String(heartRate), String(age), String(sex), String(trestbps), String(chol)], { cwd: process.cwd() });
                } catch (err) {
                    // try next candidate
                    return tryExec(idx + 1);
                }

                stdout = "";
                stderr = "";

                child.stdout.on("data", (d) => {
                    stdout += d.toString();
                });
                child.stderr.on("data", (d) => {
                    stderr += d.toString();
                });

                child.on("error", (err) => {
                    // try next candidate
                    stderr += `\nspawn-error:${err.message || err}`;
                    return tryExec(idx + 1);
                });

                child.on("close", (code) => {
                    // Prefer ai_result.json if created after startTime
                    try {
                        if (fs.existsSync(resultPath)) {
                            const st = fs.statSync(resultPath);
                            if (st.mtimeMs >= startTime - 5000) {
                                // allow small clock skew
                                const raw = fs.readFileSync(resultPath, "utf8");
                                const insights = safeJsonParse(raw, null);
                                if (insights) {
                                    const severityLevels = ["low", "medium", "high", "high", "critical"];
                                    const sev = typeof insights.severity === "number" ? insights.severity : insights.severity ?? insights.severity_level ?? insights.severityIndex;
                                    const severityIndex = typeof sev === "number" ? sev : typeof insights.severity === "string" ? null : null;
                                    const severity = typeof severityIndex === "number" ? severityLevels[severityIndex] : Array.isArray(severityLevels) && insights.severity in severityLevels ? severityLevels[insights.severity] : severityLevels[insights.severity] || "low";
                                    const diagnosis = {
                                        diagnosis: insights.diagnosis || getDiagnosisTitle(insights.severity ?? insights.severityIndex),
                                        severity: insights.severity_text || insights.severity_label || (typeof insights.severity === "number" ? severityLevels[insights.severity] : severity),
                                        analysis: insights.risk_assessment || insights.analysis || insights.note || "",
                                        recommendations: insights.recommendations || insights.recs || [],
                                        riskFactors: insights.risk_factors || insights.riskFactors || [],
                                        needsAttention: (typeof insights.severity === "number" && insights.severity >= 2) || insights.needsAttention || false,
                                        urgencyLevel: insights.urgency || getUrgencyLevel(insights.severity),
                                    };
                                    return resolve({
                                        success: true,
                                        diagnosis,
                                        aiModel: "python-advanced-ai",
                                        timestamp: new Date(),
                                        raw: { stdout, stderr, exitCode: code, file: insights },
                                    });
                                }
                            }
                        }
                    } catch (readErr) {
                        // continue to stdout parse
                    }

                    // Try parse stdout as JSON
                    const trimmed = stdout.trim();
                    if (trimmed) {
                        const parsed = safeJsonParse(trimmed, null);
                        if (parsed) {
                            const severityLevels = ["low", "medium", "high", "high", "critical"];
                            const severity = typeof parsed.severity === "number" ? severityLevels[parsed.severity] : parsed.severity;
                            const diagnosis = {
                                diagnosis: parsed.diagnosis || getDiagnosisTitle(parsed.severity),
                                severity: severity,
                                analysis: parsed.risk_assessment || parsed.analysis || "",
                                recommendations: parsed.recommendations || [],
                                riskFactors: parsed.risk_factors || [],
                                needsAttention: parsed.severity >= 2,
                                urgencyLevel: getUrgencyLevel(parsed.severity),
                            };
                            return resolve({
                                success: true,
                                diagnosis,
                                aiModel: "python-advanced-ai",
                                timestamp: new Date(),
                                raw: { stdout, stderr, exitCode: code },
                            });
                        }
                    }

                    // No usable output — fail with diagnostics
                    const details = new Error(`Python AI exited code=${code}. stdout=${stdout} stderr=${stderr}`);
                    // attach raw for upstream logging
                    details.raw = { stdout, stderr, exitCode: code, tried };
                    return reject(details);
                });
            };

            tryExec(0);
        } catch (err) {
            return reject(err);
        }
    });
};

// ===== TensorFlow.js Diagnosis (fallback) =====
const diagnoseWithTensorFlow = async (heartRateData) => {
    try {
        // Ensure model and norm params available
        try {
            await loadModel();
        } catch (loadErr) {
            console.warn("TF model not available, falling back to rule-based:", loadErr.message);
            return getRuleBasedDiagnosis(heartRateData);
        }

        const { heartRate } = heartRateData;
        const normalizedInput = normalizeInput(heartRate);
        const inputTensor = tf.tensor2d([[normalizedInput]]);
        const prediction = model.predict(inputTensor);
        const probabilities = prediction.dataSync ? prediction.dataSync() : prediction.arraySync?.()[0];

        // Find the predicted severity class (0-4)
        let predictedSeverity = 0;
        let maxProb = 0;
        for (let i = 0; i < probabilities.length; i++) {
            if (probabilities[i] > maxProb) {
                maxProb = probabilities[i];
                predictedSeverity = i;
            }
        }

        // Map severity to diagnosis (0=no disease, 1-4=disease severity)
        const severityLevels = ["low", "medium", "high", "high", "critical"];
        const severity = severityLevels[predictedSeverity];

        // AI generates personalized recommendations and risk factors
        const recommendations = generateRecommendations(heartRate, severity, (maxProb * 100).toFixed(1));
        const riskFactors = generateRiskFactors(heartRate, severity, (maxProb * 100).toFixed(1));

        // Create dynamic diagnosis based on AI prediction (translated messages)
        let diagnosis;
        const confidence = (maxProb * 100).toFixed(1);

        if (predictedSeverity === 0) {
            diagnosis = {
                diagnosis: "Healthy heart rate",
                severity: "low",
                analysis: `AI analysis: Heart rate ${heartRate} bpm is considered normal with ${confidence}% confidence. No abnormal signs detected.`,
                recommendations,
                riskFactors,
                needsAttention: false,
                urgencyLevel: "routine",
            };
        } else if (predictedSeverity === 1) {
            diagnosis = {
                diagnosis: "Heart rate needs monitoring",
                severity: "medium",
                analysis: `AI finding: Heart rate ${heartRate} bpm shows some concerns with ${confidence}% confidence. Further monitoring recommended.`,
                recommendations,
                riskFactors,
                needsAttention: true,
                urgencyLevel: "routine",
            };
        } else if (predictedSeverity === 2) {
            diagnosis = {
                diagnosis: "Moderate cardiovascular risk",
                severity: "high",
                analysis: `AI alert: Heart rate ${heartRate} bpm indicates moderate cardiovascular risk with ${confidence}% confidence. Attention advised.`,
                recommendations,
                riskFactors,
                needsAttention: true,
                urgencyLevel: "urgent",
            };
        } else if (predictedSeverity === 3) {
            diagnosis = {
                diagnosis: "High cardiovascular risk",
                severity: "high",
                analysis: `AI warning: Heart rate ${heartRate} bpm suggests a high cardiovascular risk with ${confidence}% confidence. Early intervention recommended.`,
                recommendations,
                riskFactors,
                needsAttention: true,
                urgencyLevel: "urgent",
            };
        } else {
            // predictedSeverity === 4
            diagnosis = {
                diagnosis: "Very high cardiovascular risk - URGENT",
                severity: "critical",
                analysis: `AI URGENT: Heart rate ${heartRate} bpm indicates very high cardiovascular risk with ${confidence}% confidence. IMMEDIATE ACTION REQUIRED!`,
                recommendations,
                riskFactors,
                needsAttention: true,
                urgencyLevel: "emergency",
            };
        }

        return { success: true, diagnosis, aiModel: "custom-tf-model", timestamp: new Date() };
    } catch (error) {
        console.error("TensorFlow.js diagnosis error:", error?.message || error);
        return getRuleBasedDiagnosis(heartRateData);
    }
};

// ===== Trend analysis (simplified) =====
export const analyzeTrend = async (heartRateHistory) => {
    try {
        if (!Array.isArray(heartRateHistory) || heartRateHistory.length < 3) {
            return { success: false, message: "Not enough data to analyze trend" };
        }

        const rates = heartRateHistory.map((d) => d.heartRate).slice(0, 10);
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        const trend = rates[rates.length - 1] > rates[0] ? "increasing" : rates[rates.length - 1] < rates[0] ? "decreasing" : "stable";

        const trendAnalysis = {
            trend,
            analysis: `Heart rate trend: ${trend}. Average ${avg.toFixed(1)} bpm.`,
            concerns: trend === "increasing" ? ["Rising heart rate may be due to stress"] : [],
            positivePoints: trend === "stable" ? ["Stable heart rate"] : [],
            recommendations: ["Continue monitoring", "Routine check-up"],
        };

        return { success: true, trendAnalysis, dataPoints: rates.length };
    } catch (error) {
        console.error("Trend Analysis Error:", error?.message || error);
        return { success: false, message: "Unable to analyze trend" };
    }
};

// Dummy implementation nếu chưa có
export function analyzeHeartRate(bpm) {
    // Ví dụ logic đơn giản, bạn có thể thay bằng AI thật
    let diagnosis = "Normal";
    let severity = "low";
    let recommendations = [];
    let confidence = 0.9;

    if (bpm < 50) {
        diagnosis = "Bradycardia";
        severity = "medium";
        recommendations = ["Check for symptoms", "Consult doctor if persistent"];
        confidence = 0.8;
    } else if (bpm > 100) {
        diagnosis = "Tachycardia";
        severity = "high";
        recommendations = ["Rest", "Consult doctor"];
        confidence = 0.85;
    }

    return {
        diagnosis,
        severity,
        recommendations,
        confidence,
    };
}

export default { diagnoseHeartRate, analyzeTrend };
