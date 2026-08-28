/**
 * Corbin Valley Hospital: the discharge summary from the hospitalization that
 * started everything else in this patient's chart.
 *
 * ALL DATA IS FABRICATED. See ../../DISCLAIMER.md.
 *
 * This is the one thing none of the other three portals can show: why the
 * patient has a cardiologist and a nephrologist at all. The blocked artery
 * found on this stay's catheterization is the reason metoprolol and
 * atorvastatin exist on Northfield's list, both starting the day of this
 * discharge. The mildly elevated creatinine found on the same admission is
 * the reason a nephrology referral went out at all, almost two years before
 * St. Albans Kidney Care has a single lab result on file.
 *
 * What this record can see: only this one stay, frozen on the day of
 * discharge. It has no idea what happened afterward: not the later
 * medication changes, not the rising potassium, not the second prescriber
 * writing for the same drug. It is a fixed document, not a live feed, and it
 * says so throughout.
 */

export const HOSPITAL = {
  name: 'Corbin Valley Hospital',
  short: 'Corbin Valley Hospital',
  attending: 'Dana Whitfield, MD',
  phone: '(617) 555-0177',
  portalName: 'Corbin Valley Discharge Record',
};

export const PATIENT = {
  name: 'Rui Duarte',
  dob: '1952-03-11',
  mrn: 'CVH-2023-8841',
  ageAtAdmission: 71,
};

export const ADMISSION = {
  admitted: '2023-11-09',
  discharged: '2023-11-14',
  reasonForVisit: 'Chest pain and shortness of breath, three hours in duration',
  service: 'Inpatient Medicine / Cardiology',
};

export const DIAGNOSES = [
  {
    id: 'cvh-dx-1',
    title: 'Non-ST elevation myocardial infarction (NSTEMI)',
    detail:
      'Cardiac catheterization on hospital day 1 found a severe blockage in the left ' +
      'anterior descending artery. A stent was placed and blood flow was restored. This ' +
      'is the finding behind the lifelong statin and beta blocker started at discharge.',
  },
  {
    id: 'cvh-dx-2',
    title: 'Newly noted reduced kidney function',
    detail:
      'Admission creatinine was 1.3 mg/dL, estimated eGFR 52 mL/min/1.73m2, higher than ' +
      'expected for this patient. Nephrology was consulted inpatient, felt this reflected ' +
      'early chronic kidney disease rather than anything acute, and recommended outpatient ' +
      'follow-up rather than any change during this stay.',
  },
  {
    id: 'cvh-dx-3',
    title: 'Hypertension, longstanding',
    detail: null,
  },
];

export const HOSPITAL_COURSE =
  'Presented to the emergency department with new chest pain radiating to the left arm. ' +
  'An electrocardiogram and troponin confirmed a non-ST elevation myocardial infarction. ' +
  'Taken for cardiac catheterization the following morning, which found a severe blockage ' +
  'in the left anterior descending artery. A stent was placed and flow was restored without ' +
  'complication. Admission labs also showed a creatinine above the expected range for this ' +
  'patient, prompting an inpatient nephrology consult. Kidney function stayed stable through ' +
  'the remainder of the stay. Recovered without further chest pain, tolerated a cardiac ' +
  'rehabilitation walk on hospital day 4, and was discharged home in stable condition on ' +
  'hospital day 6.';

export const CONSULTS = [
  {
    id: 'cvh-consult-1',
    service: 'Cardiology',
    clinician: 'Imani Osei, MD',
    org: 'Northfield Cardiology Associates',
    note:
      'Performed the catheterization and stent placement. Will continue as outpatient ' +
      'cardiologist after discharge.',
  },
  {
    id: 'cvh-consult-2',
    service: 'Nephrology',
    clinician: 'Inpatient nephrology consult service',
    org: 'Corbin Valley Hospital',
    note:
      'Reviewed the elevated creatinine and recommended outpatient nephrology follow-up ' +
      'within four weeks.',
  },
];

export const DISCHARGE_MEDICATIONS = [
  {
    id: 'cvh-med-1',
    name: 'Metoprolol succinate',
    strength: '50 mg',
    sig: 'Take 1 tablet by mouth daily',
    reason: 'Started for the heart attack and to protect the artery the stent opened.',
  },
  {
    id: 'cvh-med-2',
    name: 'Atorvastatin',
    strength: '40 mg',
    sig: 'Take 1 tablet by mouth at bedtime',
    reason: 'Started to lower cholesterol and reduce the risk of another heart attack.',
  },
];

export const FOLLOW_UP = [
  {
    id: 'cvh-fu-1',
    with: 'Cardiology follow-up',
    org: 'Northfield Cardiology Associates',
    clinician: 'Imani Osei, MD',
    timing: 'Within 1 week of discharge',
  },
  {
    id: 'cvh-fu-2',
    with: 'Nephrology referral',
    org: 'St. Albans Kidney Care',
    clinician: 'Assigned at first visit',
    timing: 'Within 4 weeks of discharge',
  },
];

export const DISCHARGE_INSTRUCTIONS =
  'Take all medications as prescribed. Weigh yourself each morning and call your ' +
  'cardiologist if you gain more than 3 pounds in a day or 5 pounds in a week. Return to ' +
  'the emergency department for chest pain, shortness of breath at rest, or swelling that ' +
  'is getting worse. Referrals for both follow-up visits above have been sent on your behalf.';
