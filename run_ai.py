#!/usr/bin/env python3
# run_ai.py
"""
Script để chạy AI chẩn đoán nhịp tim
Được gọi từ Node.js service
"""

import sys
import json
import os
import joblib
from ai_heart_diagnosis import HeartDiagnosisAI

def _build_feature_vector(heart_rate, age, sex, trestbps, chol):
    """Derive more realistic feature values so ML model reacts to resting BPM."""
    # Ensure numeric fallbacks
    age = float(age or 50)
    sex = int(1 if sex is None else sex)
    trestbps = float(trestbps or 120)
    chol = float(chol or 200)

    # Base profile
    features = {
        "age": age,
        "sex": sex,
        "cp": 0,
        "trestbps": trestbps,
        "chol": chol,
        "fbs": 0,
        "restecg": 0,
        "thalach": max(120, min(210, 220 - age + 5)),
        "exang": 0,
        "oldpeak": 0.0,
        "slope": 1,
        "ca": 0,
        "thal": 0,
    }

    # Modulate features based on resting heart rate
    if heart_rate >= 140:
        features.update({
            "cp": 3,
            "exang": 1,
            "oldpeak": 2.5,
            "slope": 2,
            "restecg": 2,
            "trestbps": max(features["trestbps"], 140),
            "chol": max(features["chol"], 240),
            "thalach": max(100, 220 - age - 15),
        })
    elif heart_rate >= 120:
        features.update({
            "cp": 2,
            "exang": 1,
            "oldpeak": 1.5,
            "slope": 1,
            "restecg": 1,
            "trestbps": max(features["trestbps"], 130),
            "chol": max(features["chol"], 220),
            "thalach": max(110, 220 - age - 10),
        })
    elif heart_rate <= 50:
        features.update({
            "cp": 1,
            "oldpeak": 0.6,
            "slope": 0,
            "restecg": 1,
            "thalach": min(features["thalach"], 150),
        })

    return features

def _attach_trained_artifacts(ai_instance, model_path):
    """Load joblib artifacts (model + scaler + metadata) and attach to AI instance."""
    try:
        print(f"📦 Đang load artifacts từ {model_path}...")
        artifacts = joblib.load(model_path)
        print(f"✅ Load thành công. Type: {type(artifacts)}")
    except Exception as exc:
        print(f"❌ Không thể load model từ {model_path}: {exc}")
        return False

    if isinstance(artifacts, dict):
        print(f"📋 Artifacts keys: {list(artifacts.keys())}")
        model = artifacts.get("model") or artifacts.get("estimator") or artifacts.get("clf") or artifacts.get("pipeline")
        scaler = artifacts.get("scaler")
        feature_names = artifacts.get("feature_names") or artifacts.get("feature_columns")
    else:
        print(f"⚠️ Artifacts không phải dict, coi như model trực tiếp")
        model = artifacts if hasattr(artifacts, "predict") else None
        scaler = None
        feature_names = None

    if not model:
        print("❌ Không tìm thấy model trong artifacts hoặc model không có phương thức predict")
        print(f"   Artifacts type: {type(artifacts)}")
        if isinstance(artifacts, dict):
            print(f"   Available keys: {list(artifacts.keys())}")
        return False

    print(f"✅ Model tìm thấy: {type(model)}")
    
    # FIX: Set cả model và best_model vì predict_heart_rate_risk() dùng best_model
    ai_instance.model = model
    ai_instance.best_model = model  # Thêm dòng này
    
    if scaler is not None:
        print(f"✅ Scaler tìm thấy: {type(scaler)}")
        ai_instance.scaler = scaler
    if feature_names is not None:
        print(f"✅ Feature names: {feature_names}")
        ai_instance.feature_names = feature_names
    
    if not hasattr(ai_instance.model, "predict"):
        print(f"❌ Model không có phương thức predict. Type: {type(ai_instance.model)}")
        return False
        
    return True

def _ensure_model_loaded(ai_instance, model_path):
    """Try class-provided loader first; fallback to manual artifact attachment."""
    # Thử dùng load_model của class nếu có
    if hasattr(ai_instance, "load_model") and callable(ai_instance.load_model):
        print("🔄 Thử load_model() của class...")
        try:
            ai_instance.load_model(model_path)
            # Kiểm tra xem model đã được load chưa
            if getattr(ai_instance, "model", None) and hasattr(ai_instance.model, "predict"):
                print("✅ load_model() thành công")
                return True
            elif getattr(ai_instance, "pipeline", None) and hasattr(ai_instance.pipeline, "predict"):
                print("✅ load_model() thành công (pipeline)")
                ai_instance.model = ai_instance.pipeline
                return True
            else:
                print("⚠️ load_model() không set model hoặc pipeline")
        except Exception as exc:
            print(f"⚠️ load_model() thất bại: {exc}")
    
    # Fallback: load thủ công
    print("🔄 Fallback: Load thủ công bằng joblib...")
    return _attach_trained_artifacts(ai_instance, model_path)

def run_ai_diagnosis(heart_rate, age=30, sex=1, trestbps=120, chol=200):
    """Chạy AI diagnosis với các tham số đầu vào"""
    try:
        ai = HeartDiagnosisAI()

        model_path = "heart_diagnosis_model.pkl"
        if not os.path.exists(model_path):
            print(f"❌ Model file không tồn tại: {model_path}")
            return None
            
        if not _ensure_model_loaded(ai, model_path):
            print("❌ Không thể load model")
            return None

        # Kiểm tra lần cuối trước khi predict
        if not hasattr(ai, "model") or ai.model is None:
            print("❌ ai.model vẫn là None sau khi load")
            return None
            
        print(f"✅ Model đã sẵn sàng. Type: {type(ai.model)}")

        # Kiểm tra scaler có bị mất không
        has_scaler = hasattr(ai, "scaler") and ai.scaler is not None
        print(f"🔍 Scaler status: {has_scaler}")
        if has_scaler:
            print(f"   Scaler type: {type(ai.scaler)}")

        features = _build_feature_vector(heart_rate, age, sex, trestbps, chol)
        print(f"📊 Features: {features}")
        
        # Debug: kiểm tra ai.model và ai.scaler trước khi gọi predict
        print(f"🔍 Trước khi predict:")
        print(f"   ai.model: {type(ai.model) if hasattr(ai, 'model') and ai.model else 'None'}")
        print(f"   ai.scaler: {type(ai.scaler) if hasattr(ai, 'scaler') and ai.scaler else 'None'}")
        
        try:
            prediction = ai.predict_heart_rate_risk(features)
        except AttributeError as attr_err:
            print(f"⚠️ AttributeError trong predict_heart_rate_risk: {attr_err}")
            print(f"   Checking ai attributes: model={getattr(ai, 'model', 'MISSING')}, scaler={getattr(ai, 'scaler', 'MISSING')}")
            raise
            
        insights = ai.generate_insights(features)

        # prepend note about actual resting heart rate
        hr_note = ""
        if heart_rate >= 140:
            hr_note = f"Nhịp tim lúc nghỉ {heart_rate} bpm rất cao. "
        elif heart_rate >= 120:
            hr_note = f"Nhịp tim lúc nghỉ {heart_rate} bpm cao. "
        elif heart_rate <= 50:
            hr_note = f"Nhịp tim lúc nghỉ {heart_rate} bpm thấp bất thường. "

        risk_assessment = (hr_note + insights["risk_assessment"]).strip()

        return {
            'severity': prediction['severity'],
            'confidence': prediction['confidence'],
            'risk_assessment': risk_assessment,
            'recommendations': insights['recommendations'],
            'risk_factors': insights['risk_factors']
        }

    except Exception as e:
        import traceback
        print(f"❌ Lỗi khi chạy AI: {str(e)}")
        print(f"📜 Traceback:")
        traceback.print_exc()
        return None

def main():
    """Main function khi chạy từ command line"""
    if len(sys.argv) < 2:
        print("❌ Cần ít nhất 1 tham số: heart_rate")
        print("📝 Cách dùng: python3 run_ai.py <heart_rate> [age] [sex] [trestbps] [chol]")
        sys.exit(1)

    try:
        # Parse arguments
        heart_rate = float(sys.argv[1])
        age = float(sys.argv[2]) if len(sys.argv) > 2 else 50
        sex = int(sys.argv[3]) if len(sys.argv) > 3 else 1
        trestbps = float(sys.argv[4]) if len(sys.argv) > 4 else 120
        chol = float(sys.argv[5]) if len(sys.argv) > 5 else 200

        print(f"🔍 Đang chẩn đoán với nhịp tim: {heart_rate} bpm")
        print(f"📊 Thông tin bổ sung: Tuổi {age}, Giới tính {sex}, HA {trestbps}, Cholesterol {chol}")

        # Chạy AI diagnosis
        result = run_ai_diagnosis(heart_rate, age, sex, trestbps, chol)

        if result:
            # Lưu kết quả vào file JSON để Node.js đọc
            with open('ai_result.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            # In kết quả ra console
            print("\n" + "="*50)
            print("🩺 KẾT QUẢ CHẨN ĐOÁN AI")
            print("="*50)
            print(f"🔴 Mức độ nghiêm trọng: {result['severity']}/4")
            print(f"📊 Độ tin cậy: {result['confidence']:.1f}%")
            print(f"\n💬 Đánh giá rủi ro:\n{result['risk_assessment']}")
            print(f"\n💡 Khuyến nghị ({len(result['recommendations'])}):")
            for i, rec in enumerate(result['recommendations'], 1):
                print(f"  {i}. {rec}")
            print(f"\n⚠️  Yếu tố rủi ro ({len(result['risk_factors'])}):")
            for i, risk in enumerate(result['risk_factors'], 1):
                print(f"  {i}. {risk}")
            print("="*50)

        else:
            print("❌ Không thể chạy AI diagnosis")
            sys.exit(1)

    except ValueError as e:
        print(f"❌ Lỗi dữ liệu đầu vào: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Lỗi không mong muốn: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
