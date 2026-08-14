"""
Pre-verified Procedure Database
Common procedures with medically verified content.
Used as ground truth — LLM content is verified against this.
"""
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "verified_procedures.json"

# Pre-verified content for common procedures
# Sources: MedlinePlus, Mayo Clinic, NIH
VERIFIED_DB = {
    "appendectomy": {
        "name": "Appendectomy",
        "verified": True,
        "sources": ["MedlinePlus", "Mayo Clinic", "NIH"],
        "overview": "An appendectomy is surgery to remove the appendix, a small pouch attached to the large intestine. This surgery is usually done in an emergency when the appendix becomes inflamed and painful, a condition called appendicitis.",
        "risks": [
            {"title": "Infection", "likelihood": "2-5%", "verified": True},
            {"title": "Bleeding", "likelihood": "1-2%", "verified": True},
            {"title": "Anesthesia reaction", "likelihood": "less than 1%", "verified": True},
            {"title": "Bowel obstruction", "likelihood": "1-2%", "verified": True}
        ],
        "steps": ["Preparation", "Anesthesia", "Incision", "Removal", "Closure"],
        "recovery_time": "1-2 weeks for most activities, 4-6 weeks full recovery",
        "alternatives": ["Antibiotic therapy (for uncomplicated cases)", "Laparoscopic vs open approach"]
    },
    "cholecystectomy": {
        "name": "Cholecystectomy (Gallbladder Removal)",
        "verified": True,
        "sources": ["MedlinePlus", "Mayo Clinic"],
        "overview": "A cholecystectomy is surgery to remove the gallbladder, a small organ under the liver that stores bile. This surgery is most often done when gallstones cause pain or infection.",
        "risks": [
            {"title": "Infection", "likelihood": "2-4%", "verified": True},
            {"title": "Bile leak", "likelihood": "1-2%", "verified": True},
            {"title": "Injury to bile duct", "likelihood": "less than 1%", "verified": True},
            {"title": "Digestive issues", "likelihood": "10-20%", "verified": True}
        ],
        "steps": ["Preparation", "Anesthesia", "Incision", "Removal", "Closure"],
        "recovery_time": "1-2 weeks for most activities, 4-6 weeks full recovery",
        "alternatives": ["Medication to dissolve gallstones", "ERCP for stone removal"]
    },
    "hernia_repair": {
        "name": "Hernia Repair",
        "verified": True,
        "sources": ["MedlinePlus", "Mayo Clinic", "NIH"],
        "overview": "Hernia repair surgery fixes a bulge caused by tissue pushing through a weak spot in the muscle wall. The most common types are inguinal, incisional, and umbilical hernias.",
        "risks": [
            {"title": "Infection", "likelihood": "2-4%", "verified": True},
            {"title": "Recurrence", "likelihood": "1-5%", "verified": True},
            {"title": "Chronic pain", "likelihood": "10-12%", "verified": True},
            {"title": "Mesh complications", "likelihood": "1-3%", "verified": True}
        ],
        "steps": ["Preparation", "Anesthesia", "Incision", "Repair with mesh", "Closure"],
        "recovery_time": "1-2 weeks for light activities, 4-6 weeks full recovery",
        "alternatives": ["Watchful waiting", "Truss support"]
    },
    "knee_replacement": {
        "name": "Knee Replacement (Arthroplasty)",
        "verified": True,
        "sources": ["Mayo Clinic", "AAOS", "NIH"],
        "overview": "Knee replacement surgery removes damaged bone and cartilage from the knee joint and replaces it with artificial parts made of metal and plastic. It is done to relieve pain and improve function when other treatments have not helped.",
        "risks": [
            {"title": "Infection", "likelihood": "1-2%", "verified": True},
            {"title": "Blood clots", "likelihood": "5-10%", "verified": True},
            {"title": "Implant problems", "likelihood": "5-10% over 20 years", "verified": True},
            {"title": "Stiffness", "likelihood": "5-10%", "verified": True}
        ],
        "steps": ["Preparation", "Anesthesia", "Incision", "Bone preparation", "Implant placement", "Closure"],
        "recovery_time": "6-12 weeks for most activities, 6-12 months full recovery",
        "alternatives": ["Physical therapy", "Knee brace", "Corticosteroid injections", "Weight loss"]
    },
    "hysterectomy": {
        "name": "Hysterectomy",
        "verified": True,
        "sources": ["MedlinePlus", "ACOG", "NIH"],
        "overview": "A hysterectomy is surgery to remove the uterus. It may be done for many reasons including uterine fibroids, endometriosis, heavy bleeding, or cancer. The ovaries may or may not be removed.",
        "risks": [
            {"title": "Infection", "likelihood": "2-5%", "verified": True},
            {"title": "Bleeding", "likelihood": "1-3%", "verified": True},
            {"title": "Damage to surrounding organs", "likelihood": "less than 1%", "verified": True},
            {"title": "Menopause symptoms (if ovaries removed)", "likelihood": "100% if ovaries removed", "verified": True}
        ],
        "steps": ["Preparation", "Anesthesia", "Incision", "Removal", "Closure"],
        "recovery_time": "2-6 weeks depending on approach",
        "alternatives": ["Medication", "Uterine artery embolization", "Myomectomy", "Endometrial ablation"]
    },
    "prostatectomy": {
        "name": "Prostatectomy",
        "verified": True,
        "sources": ["MedlinePlus", "Mayo Clinic", "NCI"],
        "overview": "A prostatectomy is surgery to remove part or all of the prostate gland. It is most commonly done to treat prostate cancer or severe urinary problems caused by an enlarged prostate.",
        "risks": [
            {"title": "Incontinence", "likelihood": "5-20%", "verified": True},
            {"title": "Erectile dysfunction", "likelihood": "30-70% (varies by type)", "verified": True},
            {"title": "Bleeding", "likelihood": "1-2%", "verified": True},
            {"title": "Infection", "likelihood": "2-5%", "verified": True}
        ],
        "steps": ["Preparation", "Anesthesia", "Incision/Access", "Prostate removal", "Reconstruction/Closure"],
        "recovery_time": "4-8 weeks for most activities, 3-6 months full recovery",
        "alternatives": ["Watchful waiting", "Radiation therapy", "Hormone therapy", "Active surveillance"]
    },
    "cataract_surgery": {
        "name": "Cataract Surgery",
        "verified": True,
        "sources": ["AAO", "Mayo Clinic", "NEI"],
        "overview": "Cataract surgery removes the cloudy natural lens of the eye and replaces it with a clear artificial lens called an intraocular lens (IOL). This improves vision blurred by cataracts.",
        "risks": [
            {"title": "Infection (endophthalmitis)", "likelihood": "0.1%", "verified": True},
            {"title": "Retinal detachment", "likelihood": "1-2%", "verified": True},
            {"title": "Swelling", "likelihood": "1-3%", "verified": True},
            {"title": "Lens dislocation", "likelihood": "less than 1%", "verified": True}
        ],
        "steps": ["Preparation and dilation", "Anesthesia (topical)", "Lens removal", "IOL implantation", "Recovery"],
        "recovery_time": "1-2 weeks for initial healing, 4-8 weeks full recovery",
        "alternatives": ["Glasses (for early cataracts)", "Magnifying lenses"]
    },
    "coronary_artery_bypass_grafting": {
        "name": "Coronary Artery Bypass Grafting (CABG)",
        "verified": True,
        "sources": ["AHA", "Mayo Clinic", "NIH"],
        "overview": "CABG surgery improves blood flow to the heart by using a healthy blood vessel from the leg, arm, or chest to create a new path around a blocked coronary artery.",
        "risks": [
            {"title": "Heart attack", "likelihood": "1-5%", "verified": True},
            {"title": "Stroke", "likelihood": "1-2%", "verified": True},
            {"title": "Infection", "likelihood": "2-4%", "verified": True},
            {"title": "Kidney problems", "likelihood": "5-10%", "verified": True}
        ],
        "steps": ["Preparation", "Anesthesia", "Graft harvesting", "Bypass creation", "Closure"],
        "recovery_time": "6-12 weeks for most activities, 6-12 months full recovery",
        "alternatives": ["Angioplasty with stent", "Medication management", "Lifestyle changes"]
    }
}


def get_verified_procedure(procedure: str) -> dict | None:
    """Look up a procedure in the verified database."""
    key = procedure.lower().replace(" ", "_").replace("-", "_")
    # Try exact match first
    if key in VERIFIED_DB:
        return VERIFIED_DB[key]
    # Try partial match
    for k, v in VERIFIED_DB.items():
        if key in k or k in key:
            return v
    return None


def get_all_verified_procedures() -> list:
    """Return list of all verified procedure names."""
    return [{"key": k, "name": v["name"]} for k, v in VERIFIED_DB.items()]


def save_verified_db():
    """Persist the verified database to disk."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DB_PATH.write_text(json.dumps(VERIFIED_DB, indent=2))
    print(f"✅ Verified database saved: {len(VERIFIED_DB)} procedures")
