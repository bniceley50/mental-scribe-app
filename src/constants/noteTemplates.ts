/**
 * Clinical note templates for various documentation types
 */

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

/**
 * Available clinical note templates organized by category
 */
export const NOTE_TEMPLATES: Template[] = [
  {
    id: "soap-basic",
    name: "Basic SOAP Note Template",
    description: "Standard SOAP format for general sessions",
    category: "SOAP Notes",
    content: `SOAP Note - [Date]

SUBJECTIVE:
Client reports: [Main concerns/complaints]
- Current symptoms: 
- Duration/frequency:
- Impact on daily functioning:

OBJECTIVE:
- Appearance: 
- Mood: 
- Affect: 
- Speech: 
- Thought process: 
- Insight/Judgment:

ASSESSMENT:
- Clinical impression:
- Progress toward goals:
- Risk assessment:

PLAN:
- Interventions used this session:
- Homework assigned:
- Next session: [Date]
- Additional referrals/recommendations:`,
  },
  {
    id: "progress-note",
    name: "Progress Note Template",
    description: "Track client progress over time",
    category: "Progress Tracking",
    content: `Progress Note - [Date]

CLIENT PROGRESS SUMMARY:

Current Treatment Goals:
1. [Goal 1]
   Status: [On track/Needs adjustment]
   Progress: [Details]

2. [Goal 2]
   Status: [On track/Needs adjustment]
   Progress: [Details]

Interventions This Period:
- [Intervention 1]
- [Intervention 2]

Client Response to Treatment:
[Describe engagement, compliance, outcomes]

Barriers to Progress:
[Identify any obstacles]

Modifications to Treatment Plan:
[Any adjustments needed]

Next Steps:
[Plan for upcoming sessions]`,
  },
  {
    id: "crisis-template",
    name: "Crisis Assessment Template",
    description: "Structured crisis intervention documentation",
    category: "Crisis Intervention",
    content: `CRISIS ASSESSMENT - [Date/Time]

CRISIS SITUATION:
Nature of crisis:
Precipitating events:
Current location/safety:

RISK ASSESSMENT:
Suicidal Ideation: [Yes/No]
- If yes: Plan? Intent? Means?

Homicidal Ideation: [Yes/No]
- If yes: Target? Plan? Means?

Risk Level: [Low/Moderate/High/Imminent]

PROTECTIVE FACTORS:
- Support system:
- Coping skills:
- Reasons for living:
- Access to means:

INTERVENTIONS IMPLEMENTED:
- Safety planning:
- Collateral contacts:
- Resources provided:
- Referrals made:

DISPOSITION:
- Current safety status:
- Follow-up plan:
- Emergency contacts provided:

NEXT STEPS:
- Immediate: 
- Short-term (24-48 hours):
- Long-term:`,
  },
  {
    id: "intake-template",
    name: "Initial Intake Template",
    description: "Comprehensive first session documentation",
    category: "Intake/Assessment",
    content: `INITIAL INTAKE ASSESSMENT - [Date]

IDENTIFYING INFORMATION:
Age: | Gender: | Occupation:
Referral source:
Insurance/Payment:

PRESENTING PROBLEM:
Chief complaint:
History of present problem:
Onset and duration:

MENTAL HEALTH HISTORY:
Previous therapy: [Yes/No]
Previous psychiatric hospitalizations: [Yes/No]
Current medications:
Family mental health history:

CURRENT SYMPTOMS:
- Mood:
- Sleep:
- Appetite:
- Energy level:
- Concentration:
- Social functioning:

MENTAL STATUS EXAM:
Appearance:
Mood/Affect:
Speech:
Thought process/content:
Cognition:
Insight/Judgment:

SUBSTANCE USE:
Alcohol:
Drugs:
Tobacco:

SAFETY ASSESSMENT:
Suicidal ideation:
Homicidal ideation:
Self-harm history:

STRENGTHS & RESOURCES:
- Personal strengths:
- Support system:
- Coping mechanisms:

DIAGNOSTIC IMPRESSION:
[Provisional diagnosis]

TREATMENT RECOMMENDATIONS:
- Frequency of sessions:
- Treatment modality:
- Goals:
- Referrals needed:`,
  },
  {
    id: "termination-template",
    name: "Termination Summary Template",
    description: "Final session and treatment summary",
    category: "Termination",
    content: `TREATMENT TERMINATION SUMMARY

Client: [Initials]
Treatment Period: [Start date] - [End date]
Total Sessions: [Number]

PRESENTING PROBLEM AT INTAKE:
[Brief description]

TREATMENT PROVIDED:
- Primary interventions:
- Frequency/duration:
- Modalities used:

PROGRESS TOWARD GOALS:
Goal 1: [Description]
Outcome: [Achieved/Partially achieved/Not achieved]

Goal 2: [Description]
Outcome: [Achieved/Partially achieved/Not achieved]

CURRENT FUNCTIONING:
- Symptom status:
- Coping skills developed:
- Areas of improvement:
- Remaining challenges:

REASON FOR TERMINATION:
[Treatment goals met/Client decision/Other]

RECOMMENDATIONS:
- Follow-up needs:
- Relapse prevention plan:
- Resources for future support:
- Referrals provided:

PROGNOSIS:
[Good/Fair/Guarded]

FINAL NOTES:
[Any additional relevant information]`,
  },
];
