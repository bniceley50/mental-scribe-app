# Mental Scribe - Clinical Note Assistant

A HIPAA-aware clinical documentation assistant powered by AI to help mental health professionals create structured clinical notes.

## Project Info

**URL**: https://lovable.dev/projects/b290dcd4-80b3-4d0e-a9ae-3d208a63c988

## Features

- **AI-Powered Note Generation**: Generate SOAP notes, progress reports, and session summaries
- **Template Library**: Pre-built templates for various clinical documentation types
- **Conversation History**: Save and manage multiple sessions
- **Export Options**: Export notes as PDF, text, or copy to clipboard
- **File Upload**: Upload and analyze session documents
- **Security First**: Content sanitization, encrypted storage, end-to-end security

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

## Security & Privacy

- **No PHI Storage**: This tool does not store Protected Health Information
- **Content Sanitization**: All user inputs are sanitized to prevent XSS attacks
- **Encrypted Storage**: Session data encrypted at rest
- **HIPAA-Aware Design**: Built with healthcare privacy in mind

⚠️ **Important**: This tool is for clinical documentation assistance only. Always review AI-generated content for accuracy and compliance with your organization's policies.
