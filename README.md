# Mental Scribe - Clinical Note Assistant

[![Test Coverage](https://img.shields.io/badge/coverage-70%25-yellow)](docs/TEST_COVERAGE_SETUP.md)
[![Security](https://img.shields.io/badge/security-HIPAA%20compliant-green.svg)](SECURITY.md)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](CHANGELOG.md)

A HIPAA-aware clinical documentation assistant powered by AI to help mental health professionals create structured clinical notes.

📐 **[Architecture](docs/ARCHITECTURE.md)** | 📚 **[API Reference](docs/API_REFERENCE.md)** | 🧪 **[Testing Guide](docs/TEST_COVERAGE_SETUP.md)**

## Project Info

**URL**: https://lovable.dev/projects/b290dcd4-80b3-4d0e-a9ae-3d208a63c988

## Features

### 🎤 Voice Features
- **Speech-to-Text**: Dictate clinical notes hands-free using your device's microphone
- **Text-to-Speech**: Listen to your notes and AI responses read aloud
- **Real-time Transcription**: Notes are transcribed and added as you speak
- **Browser-based**: No additional software required (works in Chrome, Edge, Safari)

### 🤖 AI-Powered Analysis
- **SOAP Note Generation**: Automatically format notes into SOAP structure
- **Medical Entity Extraction**: Identify diagnoses, medications, symptoms, and vitals
- **Clinical Summarization**: Generate comprehensive session summaries
- **Risk Assessment**: Evaluate safety concerns and protective factors
- **Progress Reports**: Track treatment progress over time

### 📝 Flexible Documentation
- **Free-form Notes**: AI-assisted note taking with quick action buttons
- **Structured Forms**: Standardized clinical documentation templates
- **Auto-save**: Never lose your work with automatic saving every 30 seconds
- **Template Library**: Pre-built templates for various clinical scenarios

### 📁 Session Management
- **Conversation History**: Save and manage multiple sessions
- **Export Options**: Download as PDF, text, or copy to clipboard
- **File Upload**: Upload and analyze PDF or text documents
- **Search & Filter**: Easily find past sessions

### 🔒 Security & Privacy
- **Content Sanitization**: All user inputs sanitized to prevent XSS attacks
- **Row-Level Security**: Database policies ensure users only access their own data
- **Encrypted Storage**: Session data encrypted at rest
- **Audit Logging**: Track all AI analysis requests for compliance
- **HIPAA-Aware Design**: Built with healthcare privacy in mind

## Quick Start Guide

### Using Voice Features

1. **Dictate Your Notes**
   - Click the 🎤 microphone button in the input area
   - Start speaking your clinical notes
   - The button will pulse red while listening
   - Click again to stop recording
   - Your transcribed text appears in the input field

2. **Listen to Notes**
   - Click the 🔊 speaker icon next to any text
   - Your device will read the content aloud
   - Click again to stop playback

### Creating Clinical Documentation

#### Free-form Mode
1. Enter your session notes in the text area
2. Use voice input for hands-free dictation
3. Click quick action buttons for instant formatting:
   - **SOAP Note**: Structured medical note format
   - **Session Summary**: Comprehensive session overview
   - **Key Points**: Extract critical clinical insights
   - **Progress Report**: Track treatment progress

#### Structured Form Mode
1. Switch to the "Structured Form" tab
2. Fill in standardized fields:
   - Client perspective
   - Current status & interventions
   - Response to treatment
   - Safety assessment
   - Treatment plan updates
3. Forms auto-save every 30 seconds

### Advanced AI Analysis

Enter your notes and access powerful analysis tools:

- **Medical Entity Extraction**: Automatically identifies and categorizes:
  - Diagnoses and conditions
  - Medications with dosages
  - Symptoms and complaints
  - Procedures and interventions
  - Mental status indicators
  - Risk factors and clinical concerns

- **Clinical Summary**: Generates comprehensive assessment including:
  - Chief complaint
  - Clinical assessment
  - Treatment progress
  - Recommendations and follow-up

- **Risk Assessment**: Evaluates:
  - Immediate risk factors
  - Protective factors
  - Risk level classification
  - Safety planning needs

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (Database, Auth, Storage, Edge Functions)
- **AI Integration**: OpenAI API via Supabase Edge Functions
- **Testing**: Vitest, React Testing Library

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b290dcd4-80b3-4d0e-a9ae-3d208a63c988) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b290dcd4-80b3-4d0e-a9ae-3d208a63c988) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Troubleshooting

### Voice Features

**Microphone not working?**
- Check browser permissions for microphone access
- Ensure you're using Chrome, Edge, or Safari
- Try refreshing the page and allowing microphone access again
- Check that no other application is using your microphone

**Text-to-speech not playing?**
- Check your device volume settings
- Ensure your browser supports speech synthesis
- Try a different browser if issues persist
- Some browsers may require user interaction before enabling audio

### AI Analysis

**Analysis failing?**
- Ensure you are logged in
- Check your internet connection
- Verify your notes contain sufficient content
- Try again in a few moments if service is busy

## Keyboard Shortcuts

- `Ctrl+Enter` / `Cmd+Enter`: Submit notes for analysis
- `Esc`: Close dialogs and modals

## Browser Compatibility

### Recommended Browsers
- **Chrome** (latest): Full feature support ✅
- **Edge** (latest): Full feature support ✅
- **Safari** (latest): Full feature support ✅

### Limited Support
- **Firefox**: Most features work, voice input may have limitations
- **Opera**: Similar to Chrome, should work well

### Voice Feature Requirements
- Modern browser with Web Speech API support
- Microphone access permission
- HTTPS connection (automatically provided)

## Security & Privacy

- **No PHI Storage**: This tool does not store Protected Health Information
- **Content Sanitization**: All user inputs are sanitized to prevent XSS attacks
- **Encrypted Storage**: Session data encrypted at rest
- **HIPAA-Aware Design**: Built with healthcare privacy in mind

⚠️ **Important**: This tool is for clinical documentation assistance only. Always review AI-generated content for accuracy and compliance with your organization's policies.
