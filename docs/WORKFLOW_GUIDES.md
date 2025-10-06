# ClinicalAI Assistant - Workflow Guides

Complete step-by-step guides for common workflows in the Mental Scribe application.

---

## 1. Sign Up & Enable Multi-Factor Authentication (MFA)

### Prerequisites
- Valid email address
- Authenticator app installed (Google Authenticator, Authy, Microsoft Authenticator, etc.)

### Step-by-Step Instructions

#### Part A: Create Your Account

1. **Navigate to the Sign-Up Page**
   - Open your browser and go to the ClinicalAI Assistant application
   - Click on the "Sign Up" tab if not already selected

2. **Enter Your Credentials**
   - Email: Enter your professional email address
   - Password: Create a strong password that meets these requirements:
     * Minimum 8 characters
     * At least one uppercase letter
     * At least one lowercase letter
     * At least one number
     * At least one special character (!@#$%^&* etc.)

3. **Submit Your Registration**
   - Click "Create Account"
   - Wait for confirmation message
   - Your account is now created and you can sign in

4. **Sign In to Your Account**
   - Switch to the "Sign In" tab
   - Enter your email and password
   - Click "Sign In"

#### Part B: Enable Multi-Factor Authentication

5. **Navigate to Security Settings**
   - Once logged in, click on "Settings" in the navigation menu
   - Select "Security Settings" from the settings options

6. **Initiate MFA Setup**
   - Locate the "Multi-Factor Authentication" section
   - Click "Enable MFA" or "Setup MFA"

7. **Scan the QR Code**
   - Open your authenticator app on your mobile device
   - Select "Add Account" or tap the "+" icon
   - Scan the QR code displayed on screen
   - The app will add an entry for "ClinicalAI Assistant"

8. **Verify Your Setup**
   - Enter the 6-digit code shown in your authenticator app
   - Click "Verify and Enable"
   - You should see a success message

9. **Save Recovery Codes** (Important!)
   - Download and securely store the recovery codes provided
   - Store these in a safe location separate from your authenticator device
   - You'll need these if you lose access to your authenticator app

#### Part C: Testing MFA

10. **Test Your MFA Setup**
    - Sign out of your account
    - Sign back in with your email and password
    - When prompted, enter the current 6-digit code from your authenticator app
    - Successful login confirms MFA is working

### Troubleshooting

**Problem**: "Invalid code" error
- **Solution**: Ensure your device time is synchronized (authenticator apps use time-based codes)

**Problem**: Lost access to authenticator app
- **Solution**: Use one of your saved recovery codes to sign in, then set up MFA again

**Problem**: Can't scan QR code
- **Solution**: Use the "Enter code manually" option and type the setup key into your authenticator app

---

## 2. Upload and Analyze Clinical Notes

### Prerequisites
- Active ClinicalAI Assistant session
- Clinical notes in supported format (PDF or TXT file, max 10MB)
- (Optional) Client/patient selected if tracking by client

### Step-by-Step Instructions

#### Part A: Starting a New Session

1. **Create a New Conversation**
   - Click "New Conversation" or the "+" button in the sidebar
   - A new blank conversation will open

2. **Select Client (Optional)**
   - If your notes are for a specific client, click "Select Client"
   - Choose the client from the dropdown menu
   - This associates the conversation with the client's record

3. **Mark Part 2 Protection (If Applicable)**
   - If the session involves substance abuse treatment (42 CFR Part 2 protected)
   - Check the "Part 2 Protected" checkbox
   - This ensures proper access logging and consent requirements

#### Part B: Uploading Your Notes

4. **Choose Upload Method**
   
   **Method 1: File Upload**
   - Click the paperclip icon (📎) in the chat interface
   - Click "Choose File" or drag and drop your file
   - Supported formats: PDF, TXT
   - Maximum file size: 10MB
   - Wait for "File uploaded successfully!" message

   **Method 2: Direct Text Entry**
   - Simply paste your session notes directly into the chat input box
   - This works well for notes you've typed elsewhere

#### Part C: Analyzing Your Notes

5. **Select Analysis Type**
   
   Choose from these quick action buttons:
   - **SOAP Note**: Generates structured Subjective, Objective, Assessment, Plan format
   - **Summary**: Creates comprehensive session summary with key moments
   - **Key Points**: Extracts clinically significant points in bullet format
   - **Progress Report**: Documents therapeutic gains and continued focus areas

6. **Initiate Analysis**
   - Click your preferred analysis button, OR
   - Type a custom request (e.g., "Create a progress note focusing on anxiety symptoms")
   - Press "Send" or hit Enter

7. **Watch Real-Time Generation**
   - The AI response appears word-by-word as it's generated
   - A progress indicator shows the analysis is in progress
   - You can stop generation at any time by clicking "Stop"

#### Part D: Working with Results

8. **Review the Generated Content**
   - Read through the AI-generated clinical note
   - Check for accuracy and completeness

9. **Edit if Needed**
   - Click the "Edit" icon on any AI response
   - Provide specific instructions (e.g., "Add more detail about coping strategies")
   - The AI will generate a revised version

10. **Export Your Documentation**
    - Click the three-dot menu (⋮) at the top of the conversation
    - Select export format:
      * **PDF**: Professional formatted document
      * **Text**: Plain text version
      * **Copy to Clipboard**: Quick copy for pasting elsewhere

### Tips for Best Results

- **Be Specific**: More detailed notes yield more comprehensive analyses
- **Use Structure**: If your notes follow a format, the AI maintains it
- **Iterate**: Use the edit function to refine output rather than starting over
- **Privacy**: Never include patient identifiers in uploaded documents

### Troubleshooting

**Problem**: File upload fails
- **Solution**: Check file size (must be under 10MB) and format (PDF or TXT only)

**Problem**: Analysis is too brief
- **Solution**: Provide more detailed input notes, or use edit function to request expansion

**Problem**: Generation stopped unexpectedly
- **Solution**: Check your internet connection; click "Regenerate" to try again

---

## 3. Manage Disclosure Consents (42 CFR Part 2)

### Prerequisites
- Admin role or clinical staff role
- Part 2 protected program configured
- Patient/client record created

### Step-by-Step Instructions

#### Part A: Understanding Part 2 Requirements

1. **What is 42 CFR Part 2?**
   - Federal regulation protecting substance abuse treatment records
   - Requires explicit patient consent for most disclosures
   - More restrictive than HIPAA
   - Violations carry significant penalties

2. **When is Consent Required?**
   - Sharing records with other providers
   - Coordination of care disclosures
   - Legal proceedings (with exceptions)
   - Quality assurance activities

#### Part B: Creating a Consent Record

3. **Navigate to Client Profile**
   - Go to "Clients" section
   - Select the specific client
   - Click on "Disclosure Consents" tab

4. **Initiate New Consent**
   - Click "+ New Consent" button
   - The consent form will open

5. **Complete Consent Details**
   
   Required fields:
   - **Purpose of Disclosure**: Select from dropdown
     * Treatment Coordination
     * Legal Proceedings
     * Research
     * Other (specify)
   
   - **Recipient Name**: Who will receive the information
   - **Recipient Organization**: Name of organization
   
   - **Scope of Information**:
     * All Records
     * Specific Date Range
     * Specific Type of Information
   
   - **Expiration Date**: When consent expires
     * Must not exceed one year for most purposes
     * Can be "Until revoked" for ongoing treatment
   
   - **Patient Signature**: Electronic signature capture
   - **Date Signed**: Automatically populated

6. **Review and Submit**
   - Verify all information is accurate
   - Click "Save Consent"
   - Consent status will show as "Active"

#### Part C: Managing Existing Consents

7. **View Active Consents**
   - Navigate to client's "Disclosure Consents" tab
   - Active consents show with green "Active" badge
   - Expired consents show with gray "Expired" badge
   - Revoked consents show with red "Revoked" badge

8. **Revoke a Consent**
   - Click on the consent you want to revoke
   - Click "Revoke Consent" button
   - Confirm revocation in the dialog
   - Enter reason for revocation (optional but recommended)
   - Click "Confirm Revocation"

9. **Renew an Expiring Consent**
   - Identify consents nearing expiration
   - Click "+ New Consent" to create a fresh consent
   - Fill out form with updated information
   - Have patient sign new consent

#### Part D: Audit and Compliance

10. **Review Disclosure Audit Log**
    - Navigate to Security Settings > Audit Logs
    - Filter by action type: "disclosure_accessed"
    - Review who accessed Part 2 protected information and when

11. **Generate Compliance Reports**
    - Go to Reports section
    - Select "Part 2 Compliance Report"
    - Choose date range
    - Export as PDF for record-keeping

### Important Legal Notes

⚠️ **Critical Compliance Points**:

1. **Consent Must Be Written**: Electronic signatures are acceptable
2. **Must Specify**: Who, what, why, and for how long
3. **Patient Can Revoke**: Patients can withdraw consent at any time
4. **Cannot Be Coerced**: Consent must be truly voluntary
5. **Audit Trail Required**: All access must be logged

### Troubleshooting

**Problem**: Cannot create consent for client
- **Solution**: Verify client is assigned to a Part 2 protected program

**Problem**: Consent form won't submit
- **Solution**: Check that all required fields are completed, including signature

**Problem**: Cannot access Part 2 protected notes
- **Solution**: Verify active, non-expired consent exists for the specific disclosure purpose

---

## 4. Export Clinical Documentation

### Prerequisites
- Active conversation with clinical notes
- Sufficient permissions to export conversations

### Step-by-Step Instructions

#### Part A: Preparing for Export

1. **Review Your Content**
   - Open the conversation you want to export
   - Scroll through to ensure all content is complete
   - Make any final edits to AI-generated notes

2. **Clean Up (Optional)**
   - Remove any test messages or irrelevant content
   - Use the delete function on individual messages if needed

#### Part B: Export Options

3. **Access Export Menu**
   - Locate the three-dot menu (⋮) icon in the conversation header
   - Click to reveal export options

4. **Choose Export Format**

   **Option 1: PDF Export**
   - Click "Export as PDF"
   - A professionally formatted PDF will be generated
   - Includes:
     * Conversation title
     * Date and timestamp
     * All messages in chronological order
     * Proper formatting for clinical notes
   - PDF downloads automatically to your Downloads folder

   **Option 2: Plain Text Export**
   - Click "Export as Text"
   - Creates a .txt file with all conversation content
   - Useful for:
     * Importing into other systems
     * Creating backups
     * Text-based analysis
   - Downloads to your Downloads folder

   **Option 3: Copy to Clipboard**
   - Click "Copy to Clipboard"
   - Entire conversation is copied as formatted text
   - Use this to:
     * Paste into EHR systems
     * Include in emails
     * Add to other documents

#### Part C: Export with Attachments

5. **Export Documents Separately**
   - If your conversation includes uploaded files
   - Navigate to the Files section in the conversation
   - Click on each file to download
   - These are not included in PDF/text exports

#### Part D: Batch Export (Multiple Conversations)

6. **Export Conversation History**
   - Go to History page
   - Select date range or specific conversations
   - Click "Export Selected"
   - Choose format (PDF or Text)
   - A zip file containing all selected conversations will download

#### Part E: FHIR-Compliant Export

7. **Generate FHIR Bundle** (Advanced)
   - For interoperability with other healthcare systems
   - Click "Export as FHIR"
   - Select FHIR version (R4 recommended)
   - Download JSON bundle
   - This creates a standards-compliant health record

#### Part F: Secure Handling

8. **Protect Exported Files**
   
   ⚠️ **Security Best Practices**:
   
   - **Encrypt**: Use encryption software for exported files containing PHI
   - **Secure Storage**: Store exports in HIPAA-compliant locations
   - **Access Control**: Limit who can access exported documents
   - **Disposal**: Permanently delete exports when no longer needed
   - **Transmission**: Use secure methods (encrypted email, secure portals) when sharing

### Export Use Cases

**Clinical Documentation**
- Add to patient's EHR
- Submit for billing/coding
- Include in treatment planning meetings

**Quality Assurance**
- Review for clinical supervision
- Analyze documentation completeness
- Training and education

**Legal/Compliance**
- Response to subpoenas (with appropriate consents)
- Compliance audits
- Malpractice defense

### Troubleshooting

**Problem**: PDF export is blank
- **Solution**: Ensure conversation has content; try text export instead

**Problem**: Export file is too large
- **Solution**: Export in smaller batches; split long conversations

**Problem**: Cannot find exported file
- **Solution**: Check your browser's download folder; check download settings

**Problem**: Formatting is lost in text export
- **Solution**: Use PDF export for formatted output

---

## Additional Resources

### Support
- Email: support@clinicalai-assistant.com
- Documentation: [Link to full documentation]
- Community Forums: [Link to forums]

### Training Videos
- [Placeholder for video: "Getting Started with ClinicalAI"]
- [Placeholder for video: "Advanced Documentation Techniques"]
- [Placeholder for video: "Part 2 Compliance Deep Dive"]

### Quick Reference Cards
- Download: MFA Setup Quick Guide [PDF]
- Download: Export Options Cheat Sheet [PDF]
- Download: Part 2 Consent Checklist [PDF]

---

*Last Updated: October 2025*  
*Version: 1.0*
