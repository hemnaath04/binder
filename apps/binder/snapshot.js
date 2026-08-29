/**
 * GENERATED FILE, do not edit by hand.
 * Run: node tools/make-snapshot.mjs
 *
 * Stands in for the last successful read of each portal, so the host works with
 * no agent and no live federation. Day 5 replaces this path with real
 * cross-origin WebMCP tool calls; this remains the documented fallback.
 *
 * ALL DATA IS FABRICATED. See ../../DISCLAIMER.md.
 */

export const PATIENT = {
  "name": "Rui Duarte",
  "dob": "1952-03-11",
  "recordNumbers": {
    "northfield": "NC-448201",
    "stalbans": "SA-7734",
    "wellspring": "WS-90114-2"
  }
};

export const SNAPSHOT_TAKEN_AT = "2026-08-28T17:00:11.963Z";

export const SOURCES = [
  {
    "id": "northfield",
    "name": "Northfield Cardiology",
    "kind": "clinic",
    "origin": "http://localhost:8091",
    "medications": [
      {
        "id": "nc-med-1",
        "name": "Lisinopril",
        "strength": "10 mg",
        "sig": "Take 1 tablet by mouth daily",
        "class": "ACE inhibitor",
        "started": "2024-06-02",
        "prescriber": "Imani Osei, MD",
        "status": "active"
      },
      {
        "id": "nc-med-2",
        "name": "Furosemide",
        "strength": "40 mg",
        "sig": "Take 1 tablet by mouth every morning",
        "class": "Loop diuretic",
        "started": "2024-06-02",
        "prescriber": "Imani Osei, MD",
        "status": "active"
      },
      {
        "id": "nc-med-3",
        "name": "Spironolactone",
        "strength": "25 mg",
        "sig": "Take 1 tablet by mouth daily",
        "class": "Mineralocorticoid receptor antagonist",
        "started": "2026-06-18",
        "prescriber": "Imani Osei, MD",
        "status": "active",
        "note": "Added for heart failure management at the June visit."
      },
      {
        "id": "nc-med-4",
        "name": "Metoprolol succinate",
        "strength": "50 mg",
        "sig": "Take 1 tablet by mouth daily",
        "class": "Beta blocker",
        "started": "2023-11-14",
        "prescriber": "Imani Osei, MD",
        "status": "active"
      },
      {
        "id": "nc-med-5",
        "name": "Atorvastatin",
        "strength": "40 mg",
        "sig": "Take 1 tablet by mouth at bedtime",
        "class": "Statin",
        "started": "2023-11-14",
        "prescriber": "Imani Osei, MD",
        "status": "active"
      }
    ],
    "labs": [
      {
        "id": "nc-lab-1",
        "panel": "Lipid panel",
        "date": "2026-06-18",
        "results": [
          {
            "analyte": "Total cholesterol",
            "value": 164,
            "unit": "mg/dL",
            "ref": "<200",
            "flag": null
          },
          {
            "analyte": "LDL cholesterol",
            "value": 82,
            "unit": "mg/dL",
            "ref": "<100",
            "flag": null
          },
          {
            "analyte": "HDL cholesterol",
            "value": 44,
            "unit": "mg/dL",
            "ref": ">40",
            "flag": null
          },
          {
            "analyte": "Triglycerides",
            "value": 188,
            "unit": "mg/dL",
            "ref": "<150",
            "flag": "high"
          }
        ]
      },
      {
        "id": "nc-lab-2",
        "panel": "BNP",
        "date": "2026-06-18",
        "results": [
          {
            "analyte": "B-type natriuretic peptide",
            "value": 412,
            "unit": "pg/mL",
            "ref": "<100",
            "flag": "high"
          }
        ]
      }
    ],
    "appointments": [
      {
        "id": "nc-appt-1",
        "kind": "Cardiology follow-up",
        "clinician": "Imani Osei, MD",
        "date": "2026-09-14",
        "time": "10:30",
        "location": "Northfield Medical Building, 2nd floor, Suite 210",
        "status": "scheduled"
      },
      {
        "id": "nc-appt-2",
        "kind": "Echocardiogram",
        "clinician": "Cardiac imaging",
        "date": "2026-10-06",
        "time": "08:15",
        "location": "Northfield Medical Building, ground floor",
        "status": "scheduled"
      }
    ],
    "messages": [
      {
        "id": "nc-msg-1",
        "from": "Imani Osei, MD",
        "date": "2026-06-19",
        "subject": "Your visit summary",
        "body": "Good to see you. We added spironolactone 25 mg daily to help with the fluid retention. Please have your primary care office check a basic metabolic panel in two weeks so we can keep an eye on your kidney function and potassium. Call the office if you notice muscle weakness or an irregular heartbeat."
      },
      {
        "id": "nc-msg-2",
        "from": "Northfield scheduling",
        "date": "2026-08-11",
        "subject": "Upcoming appointment reminder",
        "body": "This is a reminder of your cardiology follow-up on September 14 at 10:30 AM with Dr. Osei. Please arrive 15 minutes early and bring a current list of all your medications, including anything you buy without a prescription."
      }
    ]
  },
  {
    "id": "stalbans",
    "name": "St. Albans Nephrology",
    "kind": "clinic",
    "origin": "http://localhost:8092",
    "medications": [
      {
        "id": "sa-med-1",
        "name": "Spironolactone",
        "strength": "12.5 mg",
        "sig": "Take 1 tablet by mouth twice daily",
        "class": "Mineralocorticoid receptor antagonist",
        "started": "2026-07-09",
        "prescriber": "Rafael Cardoso, MD",
        "status": "active",
        "note": "Split dosing to improve tolerance."
      },
      {
        "id": "sa-med-2",
        "name": "Sevelamer carbonate",
        "strength": "800 mg",
        "sig": "Take 1 tablet by mouth three times daily with meals",
        "class": "Phosphate binder",
        "started": "2025-02-20",
        "prescriber": "Rafael Cardoso, MD",
        "status": "active"
      },
      {
        "id": "sa-med-3",
        "name": "Calcitriol",
        "strength": "0.25 mcg",
        "sig": "Take 1 capsule by mouth daily",
        "class": "Vitamin D analogue",
        "started": "2025-02-20",
        "prescriber": "Rafael Cardoso, MD",
        "status": "active"
      },
      {
        "id": "sa-med-4",
        "name": "Sodium bicarbonate",
        "strength": "650 mg",
        "sig": "Take 1 tablet by mouth twice daily",
        "class": "Alkalinizing agent",
        "started": "2025-09-03",
        "prescriber": "Rafael Cardoso, MD",
        "status": "active"
      }
    ],
    "labs": [
      {
        "id": "sa-lab-3",
        "panel": "Basic metabolic panel",
        "date": "2026-08-04",
        "results": [
          {
            "analyte": "Potassium",
            "value": 5.4,
            "unit": "mmol/L",
            "ref": "3.5 - 5.0",
            "flag": "high"
          },
          {
            "analyte": "Creatinine",
            "value": 2.1,
            "unit": "mg/dL",
            "ref": "0.7 - 1.3",
            "flag": "high"
          },
          {
            "analyte": "eGFR",
            "value": 31,
            "unit": "mL/min/1.73m2",
            "ref": ">60",
            "flag": "low"
          },
          {
            "analyte": "Sodium",
            "value": 138,
            "unit": "mmol/L",
            "ref": "135 - 145",
            "flag": null
          },
          {
            "analyte": "Bicarbonate",
            "value": 21,
            "unit": "mmol/L",
            "ref": "22 - 29",
            "flag": "low"
          }
        ]
      },
      {
        "id": "sa-lab-2",
        "panel": "Basic metabolic panel",
        "date": "2026-04-22",
        "results": [
          {
            "analyte": "Potassium",
            "value": 5.1,
            "unit": "mmol/L",
            "ref": "3.5 - 5.0",
            "flag": "high"
          },
          {
            "analyte": "Creatinine",
            "value": 1.8,
            "unit": "mg/dL",
            "ref": "0.7 - 1.3",
            "flag": "high"
          },
          {
            "analyte": "eGFR",
            "value": 38,
            "unit": "mL/min/1.73m2",
            "ref": ">60",
            "flag": "low"
          },
          {
            "analyte": "Sodium",
            "value": 139,
            "unit": "mmol/L",
            "ref": "135 - 145",
            "flag": null
          },
          {
            "analyte": "Bicarbonate",
            "value": 22,
            "unit": "mmol/L",
            "ref": "22 - 29",
            "flag": null
          }
        ]
      },
      {
        "id": "sa-lab-1",
        "panel": "Basic metabolic panel",
        "date": "2025-11-19",
        "results": [
          {
            "analyte": "Potassium",
            "value": 4.6,
            "unit": "mmol/L",
            "ref": "3.5 - 5.0",
            "flag": null
          },
          {
            "analyte": "Creatinine",
            "value": 1.6,
            "unit": "mg/dL",
            "ref": "0.7 - 1.3",
            "flag": "high"
          },
          {
            "analyte": "eGFR",
            "value": 42,
            "unit": "mL/min/1.73m2",
            "ref": ">60",
            "flag": "low"
          },
          {
            "analyte": "Sodium",
            "value": 140,
            "unit": "mmol/L",
            "ref": "135 - 145",
            "flag": null
          },
          {
            "analyte": "Bicarbonate",
            "value": 23,
            "unit": "mmol/L",
            "ref": "22 - 29",
            "flag": null
          }
        ]
      }
    ],
    "appointments": [
      {
        "id": "sa-appt-1",
        "kind": "Lab draw, basic metabolic panel",
        "clinician": "Phlebotomy",
        "date": "2026-09-02",
        "time": "07:45",
        "location": "St. Albans Renal Center, lab suite",
        "status": "scheduled"
      },
      {
        "id": "sa-appt-2",
        "kind": "Nephrology follow-up",
        "clinician": "Rafael Cardoso, MD",
        "date": "2026-09-14",
        "time": "10:00",
        "location": "St. Albans Renal Center, Clinic B",
        "status": "scheduled"
      },
      {
        "id": "sa-appt-3",
        "kind": "Dialysis planning education",
        "clinician": "Renal nurse educator",
        "date": "2026-09-29",
        "time": "13:30",
        "location": "St. Albans Renal Center, education room",
        "status": "scheduled"
      }
    ],
    "messages": [
      {
        "id": "sa-msg-1",
        "from": "Rafael Cardoso, MD",
        "date": "2026-08-06",
        "subject": "August lab results",
        "body": "Your kidney numbers have moved in the wrong direction since April and your potassium is above range at 5.4. Please avoid anti-inflammatory painkillers such as ibuprofen and naproxen, including the ones sold without a prescription. Bring every medication you take to the September visit, and let me know if any other doctor has started something new."
      }
    ]
  },
  {
    "id": "corbinvalley",
    "name": "Corbin Valley Hospital",
    "kind": "hospital",
    "origin": "http://localhost:8094",
    "discharge": {
      "admission": {
        "admitted": "2023-11-09",
        "discharged": "2023-11-14",
        "reasonForVisit": "Chest pain and shortness of breath, three hours in duration",
        "service": "Inpatient Medicine / Cardiology"
      },
      "attending": "Dana Whitfield, MD",
      "diagnoses": [
        {
          "id": "cvh-dx-1",
          "title": "Non-ST elevation myocardial infarction (NSTEMI)",
          "detail": "Cardiac catheterization on hospital day 1 found a severe blockage in the left anterior descending artery. A stent was placed and blood flow was restored. This is the finding behind the lifelong statin and beta blocker started at discharge."
        },
        {
          "id": "cvh-dx-2",
          "title": "Newly noted reduced kidney function",
          "detail": "Admission creatinine was 1.3 mg/dL, estimated eGFR 52 mL/min/1.73m2, higher than expected for this patient. Nephrology was consulted inpatient, felt this reflected early chronic kidney disease rather than anything acute, and recommended outpatient follow-up rather than any change during this stay."
        },
        {
          "id": "cvh-dx-3",
          "title": "Hypertension, longstanding",
          "detail": null
        }
      ],
      "hospitalCourse": "Presented to the emergency department with new chest pain radiating to the left arm. An electrocardiogram and troponin confirmed a non-ST elevation myocardial infarction. Taken for cardiac catheterization the following morning, which found a severe blockage in the left anterior descending artery. A stent was placed and flow was restored without complication. Admission labs also showed a creatinine above the expected range for this patient, prompting an inpatient nephrology consult. Kidney function stayed stable through the remainder of the stay. Recovered without further chest pain, tolerated a cardiac rehabilitation walk on hospital day 4, and was discharged home in stable condition on hospital day 6."
    },
    "medicationOrigins": [
      {
        "id": "cvh-med-1",
        "name": "Metoprolol succinate",
        "strength": "50 mg",
        "sig": "Take 1 tablet by mouth daily",
        "reason": "Started for the heart attack and to protect the artery the stent opened."
      },
      {
        "id": "cvh-med-2",
        "name": "Atorvastatin",
        "strength": "40 mg",
        "sig": "Take 1 tablet by mouth at bedtime",
        "reason": "Started to lower cholesterol and reduce the risk of another heart attack."
      }
    ],
    "referrals": [
      {
        "id": "cvh-fu-1",
        "with": "Cardiology follow-up",
        "org": "Northfield Cardiology Associates",
        "clinician": "Imani Osei, MD",
        "timing": "Within 1 week of discharge"
      },
      {
        "id": "cvh-fu-2",
        "with": "Nephrology referral",
        "org": "St. Albans Kidney Care",
        "clinician": "Assigned at first visit",
        "timing": "Within 4 weeks of discharge"
      }
    ],
    "medications": []
  },
  {
    "id": "wellspring",
    "name": "Wellspring",
    "kind": "pharmacy",
    "origin": "http://localhost:8093",
    "prescriptions": [
      {
        "id": "ws-rx-1",
        "rxNumber": "4471902",
        "drug": "Lisinopril",
        "strength": "10 mg",
        "quantity": "90 tablets",
        "prescriber": "Imani Osei, MD",
        "lastFilled": "2026-08-02",
        "daysSupply": 90,
        "refillsLeft": 1,
        "status": "active"
      },
      {
        "id": "ws-rx-2",
        "rxNumber": "4471903",
        "drug": "Furosemide",
        "strength": "40 mg",
        "quantity": "90 tablets",
        "prescriber": "Imani Osei, MD",
        "lastFilled": "2026-08-02",
        "daysSupply": 90,
        "refillsLeft": 1,
        "status": "active"
      },
      {
        "id": "ws-rx-3",
        "rxNumber": "4488115",
        "drug": "Spironolactone",
        "strength": "25 mg",
        "quantity": "30 tablets",
        "prescriber": "Imani Osei, MD",
        "lastFilled": "2026-08-18",
        "daysSupply": 30,
        "refillsLeft": 2,
        "status": "active"
      },
      {
        "id": "ws-rx-4",
        "rxNumber": "4492771",
        "drug": "Spironolactone",
        "strength": "12.5 mg",
        "quantity": "60 tablets",
        "prescriber": "Rafael Cardoso, MD",
        "lastFilled": "2026-08-21",
        "daysSupply": 30,
        "refillsLeft": 2,
        "status": "active"
      },
      {
        "id": "ws-rx-5",
        "rxNumber": "4390045",
        "drug": "Sevelamer carbonate",
        "strength": "800 mg",
        "quantity": "270 tablets",
        "prescriber": "Rafael Cardoso, MD",
        "lastFilled": "2026-07-28",
        "daysSupply": 90,
        "refillsLeft": 0,
        "status": "active"
      },
      {
        "id": "ws-rx-6",
        "rxNumber": "4390046",
        "drug": "Calcitriol",
        "strength": "0.25 mcg",
        "quantity": "90 capsules",
        "prescriber": "Rafael Cardoso, MD",
        "lastFilled": "2026-07-28",
        "daysSupply": 90,
        "refillsLeft": 0,
        "status": "active"
      },
      {
        "id": "ws-rx-7",
        "rxNumber": "4402318",
        "drug": "Metoprolol succinate",
        "strength": "50 mg",
        "quantity": "90 tablets",
        "prescriber": "Imani Osei, MD",
        "lastFilled": "2026-06-30",
        "daysSupply": 90,
        "refillsLeft": 1,
        "status": "active"
      },
      {
        "id": "ws-rx-8",
        "rxNumber": "4402319",
        "drug": "Atorvastatin",
        "strength": "40 mg",
        "quantity": "90 tablets",
        "prescriber": "Imani Osei, MD",
        "lastFilled": "2026-06-30",
        "daysSupply": 90,
        "refillsLeft": 1,
        "status": "active"
      },
      {
        "id": "ws-rx-9",
        "rxNumber": "4410884",
        "drug": "Sodium bicarbonate",
        "strength": "650 mg",
        "quantity": "180 tablets",
        "prescriber": "Rafael Cardoso, MD",
        "lastFilled": "2026-07-12",
        "daysSupply": 90,
        "refillsLeft": 2,
        "status": "active"
      }
    ],
    "purchases": [
      {
        "id": "ws-otc-1",
        "item": "Ibuprofen 200 mg, 100 count",
        "category": "Pain relief",
        "date": "2026-08-19",
        "qty": 1
      },
      {
        "id": "ws-otc-2",
        "item": "Ibuprofen 200 mg, 100 count",
        "category": "Pain relief",
        "date": "2026-07-27",
        "qty": 1
      },
      {
        "id": "ws-otc-3",
        "item": "Ibuprofen 200 mg, 100 count",
        "category": "Pain relief",
        "date": "2026-06-30",
        "qty": 1
      },
      {
        "id": "ws-otc-4",
        "item": "Acetaminophen 500 mg, 50 count",
        "category": "Pain relief",
        "date": "2026-05-14",
        "qty": 1
      },
      {
        "id": "ws-otc-5",
        "item": "Blood pressure cuff, upper arm",
        "category": "Home health",
        "date": "2026-04-02",
        "qty": 1
      }
    ],
    "alerts": [
      {
        "id": "ws-alert-1",
        "severity": "informational",
        "title": "Same drug from two prescribers",
        "detail": "Spironolactone is on file under two active prescriptions, 25 mg once daily from Osei and 12.5 mg twice daily from Cardoso. Confirm with the patient which regimen is current.",
        "drugs": [
          "Spironolactone"
        ]
      },
      {
        "id": "ws-alert-2",
        "severity": "informational",
        "title": "Potassium-sparing diuretic with ACE inhibitor",
        "detail": "Spironolactone and lisinopril together can raise serum potassium. Routine monitoring is usually sufficient. No recent potassium result is on file at this pharmacy.",
        "drugs": [
          "Spironolactone",
          "Lisinopril"
        ]
      }
    ],
    "medications": [
      {
        "name": "Lisinopril",
        "strength": "10 mg",
        "sig": "90 tablets dispensed",
        "prescriber": "Imani Osei, MD",
        "started": "2026-08-02",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Furosemide",
        "strength": "40 mg",
        "sig": "90 tablets dispensed",
        "prescriber": "Imani Osei, MD",
        "started": "2026-08-02",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Spironolactone",
        "strength": "25 mg",
        "sig": "30 tablets dispensed",
        "prescriber": "Imani Osei, MD",
        "started": "2026-08-18",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Spironolactone",
        "strength": "12.5 mg",
        "sig": "60 tablets dispensed",
        "prescriber": "Rafael Cardoso, MD",
        "started": "2026-08-21",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Sevelamer carbonate",
        "strength": "800 mg",
        "sig": "270 tablets dispensed",
        "prescriber": "Rafael Cardoso, MD",
        "started": "2026-07-28",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Calcitriol",
        "strength": "0.25 mcg",
        "sig": "90 capsules dispensed",
        "prescriber": "Rafael Cardoso, MD",
        "started": "2026-07-28",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Metoprolol succinate",
        "strength": "50 mg",
        "sig": "90 tablets dispensed",
        "prescriber": "Imani Osei, MD",
        "started": "2026-06-30",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Atorvastatin",
        "strength": "40 mg",
        "sig": "90 tablets dispensed",
        "prescriber": "Imani Osei, MD",
        "started": "2026-06-30",
        "status": "active",
        "dispensedOnly": true
      },
      {
        "name": "Sodium bicarbonate",
        "strength": "650 mg",
        "sig": "180 tablets dispensed",
        "prescriber": "Rafael Cardoso, MD",
        "started": "2026-07-12",
        "status": "active",
        "dispensedOnly": true
      }
    ]
  }
];
