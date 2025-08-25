import numpy as np
from typing import Dict, List, Any
import json
import random

class MockAIService:
    """
    Mock AI service for generating medical reports.
    In production, this would integrate with actual AI models.
    """
    
    def __init__(self):
        self.chest_xray_findings = [
            "No acute cardiopulmonary abnormality",
            "Mild cardiomegaly noted",
            "Clear lung fields bilaterally",
            "Small pleural effusion on the right side",
            "Possible pneumonia in the left lower lobe",
            "Normal cardiac silhouette",
            "Hyperinflated lungs consistent with COPD"
        ]
        
        self.ct_findings = [
            "No acute intracranial abnormality",
            "Mild cerebral atrophy",
            "Small lacunar infarcts in the basal ganglia",
            "Normal brain parenchyma",
            "Chronic small vessel disease",
            "No mass effect or midline shift"
        ]
        
        self.mri_findings = [
            "Normal brain MRI",
            "Multiple T2 hyperintense lesions in white matter",
            "Mild ventricular enlargement",
            "No restricted diffusion",
            "Normal flow voids in major vessels"
        ]
    
    def generate_report(self, modality: str, body_part: str, study_description: str = "") -> Dict[str, Any]:
        """Generate a mock AI report based on modality and body part"""
        
        findings = []
        impression = ""
        confidence = random.uniform(0.7, 0.95)
        
        if modality.upper() == "CR" or modality.upper() == "DX":  # Chest X-ray
            findings = random.sample(self.chest_xray_findings, random.randint(1, 3))
            impression = "Chest X-ray findings as described above."
            
        elif modality.upper() == "CT":
            if "head" in body_part.lower() or "brain" in body_part.lower():
                findings = random.sample(self.ct_findings, random.randint(1, 2))
                impression = "CT head findings as described above."
            else:
                findings = ["No acute abnormality identified", "Normal organ enhancement"]
                impression = f"CT {body_part} appears normal."
                
        elif modality.upper() == "MR":
            if "head" in body_part.lower() or "brain" in body_part.lower():
                findings = random.sample(self.mri_findings, random.randint(1, 2))
                impression = "MRI brain findings as described above."
            else:
                findings = ["Normal signal intensity", "No abnormal enhancement"]
                impression = f"MRI {body_part} appears normal."
                
        else:
            findings = ["Study reviewed", "No acute abnormality identified"]
            impression = "Normal study."
        
        report = {
            "findings": findings,
            "impression": impression,
            "confidence": confidence,
            "modality": modality,
            "body_part": body_part,
            "generated_at": "2024-01-01T00:00:00Z",
            "ai_model": "MockAI v1.0"
        }
        
        return report
    
    def analyze_measurements(self, measurements: List[Dict]) -> Dict[str, Any]:
        """Analyze measurements and provide AI insights"""
        
        analysis = {
            "total_measurements": len(measurements),
            "measurement_types": [],
            "abnormal_findings": [],
            "recommendations": []
        }
        
        for measurement in measurements:
            measurement_type = measurement.get("type", "unknown")
            analysis["measurement_types"].append(measurement_type)
            
            if measurement_type == "distance" and measurement.get("value", 0) > 50:
                analysis["abnormal_findings"].append("Enlarged structure detected")
            elif measurement_type == "angle" and measurement.get("value", 0) > 45:
                analysis["abnormal_findings"].append("Abnormal angulation noted")
        
        if analysis["abnormal_findings"]:
            analysis["recommendations"].append("Consider follow-up imaging")
            analysis["recommendations"].append("Clinical correlation recommended")
        else:
            analysis["recommendations"].append("No immediate follow-up required")
        
        return analysis

ai_service = MockAIService()
