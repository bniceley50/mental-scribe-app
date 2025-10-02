import { LucideIcon, FileText, AlertCircle, ClipboardList } from "lucide-react";

/**
 * Example prompt interface
 */
export interface ExamplePrompt {
  icon: LucideIcon;
  label: string;
  prompt: string;
}

/**
 * Generates a brief therapy note example with current date
 */
const getBriefTherapyNote = (): string => `Session Date: ${new Date().toLocaleDateString()}
Client: [Client initials]
Session Type: Individual therapy, 50 minutes

Presenting Issue: Client reports increased anxiety around work deadlines and social situations.

Session Content:
- Discussed recent anxiety triggers at workplace
- Client shared feeling overwhelmed by project timelines
- Explored breathing techniques and grounding exercises
- Client expressed concerns about upcoming social event
- Practiced cognitive reframing of anxious thoughts

Observations:
- Client appeared tense initially, relaxed as session progressed
- Good engagement with therapeutic exercises
- Demonstrated insight into anxiety patterns
- Willing to practice homework assignments

Interventions:
- CBT techniques for anxiety management
- Introduced 4-7-8 breathing exercise
- Assigned daily mood tracking
- Scheduled follow-up for next week

Plan: Continue CBT approach, monitor progress with anxiety management techniques.`;

/**
 * Generates a crisis intervention note example with current date
 */
const getCrisisInterventionNote = (): string => `Session Date: ${new Date().toLocaleDateString()}
Session Type: Crisis intervention, phone session

Presenting Concern: Client called reporting acute suicidal ideation.

Assessment:
- Client experiencing severe depressive symptoms
- Suicidal ideation present with plan but no intent
- Stressors: job loss, relationship conflict, financial stress
- Protective factors: supportive family, religious beliefs, no access to means
- Risk level: Moderate

Interventions:
- Conducted comprehensive suicide risk assessment
- Developed safety plan with client
- Identified warning signs and coping strategies
- Connected client with family support person
- Scheduled emergency follow-up appointment for tomorrow
- Provided crisis line numbers

Client agreed to:
- Remove access to potential means
- Contact support person tonight
- Call crisis line if symptoms worsen
- Attend tomorrow's appointment

Follow-up: Emergency session scheduled for tomorrow at 10 AM.`;

/**
 * Generates an intake assessment example with current date
 */
const getIntakeAssessment = (): string => `Client Name: [Initials]
Date: ${new Date().toLocaleDateString()}
Session Type: Initial intake assessment

Presenting Problem:
Client seeks therapy for depression and relationship difficulties. Reports low mood for past 6 months, difficulty sleeping, and decreased interest in activities.

Background:
- Age: 34, employed full-time
- No previous therapy experience
- No current medications
- Family history of depression

Current Symptoms:
- Depressed mood most days
- Difficulty initiating and maintaining sleep
- Decreased energy and motivation
- Feelings of worthlessness
- Difficulty concentrating at work
- Social withdrawal

Mental Status:
- Appearance: Well-groomed, appropriate dress
- Mood: Depressed
- Affect: Constricted, tearful at times
- Thought process: Linear, goal-directed
- Cognition: Alert and oriented x4
- Insight: Good, recognizes need for help
- Judgment: Intact

Diagnostic Impression: Major Depressive Disorder, moderate severity (provisional)

Treatment Plan:
- Weekly individual therapy using CBT approach
- Referral for psychiatric evaluation
- Goal setting for symptom reduction
- Sleep hygiene education
- Safety planning

Next Session: Scheduled for next week`;

/**
 * Available example prompts for users to get started
 */
export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    icon: FileText,
    label: "Brief Therapy Note",
    get prompt() { return getBriefTherapyNote(); },
  },
  {
    icon: AlertCircle,
    label: "Crisis Intervention Note",
    get prompt() { return getCrisisInterventionNote(); },
  },
  {
    icon: ClipboardList,
    label: "Intake Assessment",
    get prompt() { return getIntakeAssessment(); },
  },
];
