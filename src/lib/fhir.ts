// FHIR R4 Export Utilities for Clinical Notes
// Implements FHIR DocumentReference and DiagnosticReport resources

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  external_id?: string;
}

interface StructuredNote {
  id: string;
  session_date: string;
  clinical_impression?: string;
  treatment_plan?: string;
  goals_progress?: string;
  safety_assessment?: string;
  client_perspective?: string;
  current_status?: string;
  response_to_interventions?: string;
  new_issues_presented?: boolean;
  new_issues_details?: string;
  next_steps?: string;
  is_telehealth?: boolean;
}

interface FHIRExportOptions {
  client: Client;
  note: StructuredNote;
  practitionerName?: string;
  organizationName?: string;
}

export function generateFHIRDocumentReference(options: FHIRExportOptions) {
  const { client, note, practitionerName = "Unknown Provider", organizationName = "Mental Health Clinic" } = options;

  const noteContent = [
    note.current_status && `Current Status: ${note.current_status}`,
    note.clinical_impression && `Clinical Impression: ${note.clinical_impression}`,
    note.goals_progress && `Goals Progress: ${note.goals_progress}`,
    note.response_to_interventions && `Response to Interventions: ${note.response_to_interventions}`,
    note.new_issues_presented && note.new_issues_details && `New Issues: ${note.new_issues_details}`,
    note.safety_assessment && `Safety Assessment: ${note.safety_assessment}`,
    note.treatment_plan && `Treatment Plan: ${note.treatment_plan}`,
    note.next_steps && `Next Steps: ${note.next_steps}`,
    note.client_perspective && `Client Perspective: ${note.client_perspective}`,
  ].filter(Boolean).join('\n\n');

  const documentReference = {
    resourceType: "DocumentReference",
    id: note.id,
    meta: {
      versionId: "1",
      lastUpdated: new Date().toISOString(),
    },
    status: "current",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11488-4",
          display: "Consult note"
        }
      ],
      text: "Mental Health Session Note"
    },
    category: [
      {
        coding: [
          {
            system: "http://loinc.org",
            code: "LP173421-1",
            display: "Report"
          }
        ]
      }
    ],
    subject: {
      reference: `Patient/${client.id}`,
      display: `${client.first_name} ${client.last_name}`
    },
    date: new Date(note.session_date).toISOString(),
    author: [
      {
        display: practitionerName
      }
    ],
    custodian: {
      display: organizationName
    },
    content: [
      {
        attachment: {
          contentType: "text/plain",
          data: btoa(noteContent),
          title: `Mental Health Session Note - ${new Date(note.session_date).toLocaleDateString()}`
        }
      }
    ],
    context: {
      event: [
        {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "108313002",
              display: "Psychiatric interview and evaluation"
            }
          ]
        }
      ],
      period: {
        start: new Date(note.session_date).toISOString()
      },
      facilityType: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
            code: note.is_telehealth ? "CVDX" : "HOSP",
            display: note.is_telehealth ? "Telemedicine" : "Hospital"
          }
        ]
      }
    }
  };

  return documentReference;
}

export function generateFHIRBundle(options: FHIRExportOptions) {
  const { client, note } = options;
  
  const documentReference = generateFHIRDocumentReference(options);
  
  const patient = {
    resourceType: "Patient",
    id: client.id,
    identifier: client.external_id ? [
      {
        system: "http://example.org/patient-ids",
        value: client.external_id
      }
    ] : [],
    name: [
      {
        use: "official",
        family: client.last_name,
        given: [client.first_name]
      }
    ],
    birthDate: client.date_of_birth
  };

  const bundle = {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    entry: [
      {
        fullUrl: `Patient/${client.id}`,
        resource: patient
      },
      {
        fullUrl: `DocumentReference/${note.id}`,
        resource: documentReference
      }
    ]
  };

  return bundle;
}

export function exportFHIRAsJSON(bundle: any): string {
  return JSON.stringify(bundle, null, 2);
}

export function exportFHIRAsXML(bundle: any): string {
  // Simple XML conversion - for production, use a proper FHIR library
  const escapeXml = (str: string) => {
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const toXML = (obj: any, rootName: string = 'root'): string => {
    if (typeof obj !== 'object' || obj === null) {
      return `<${rootName}>${escapeXml(String(obj))}</${rootName}>`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => toXML(item, rootName)).join('');
    }

    const entries = Object.entries(obj);
    const childElements = entries
      .map(([key, value]) => toXML(value, key))
      .join('');

    return `<${rootName}>${childElements}</${rootName}>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXML(bundle, 'Bundle')}`;
}

export function downloadFHIRBundle(bundle: any, format: 'json' | 'xml' = 'json', filename?: string) {
  const content = format === 'json' 
    ? exportFHIRAsJSON(bundle)
    : exportFHIRAsXML(bundle);
  
  const blob = new Blob([content], { 
    type: format === 'json' ? 'application/fhir+json' : 'application/fhir+xml' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `fhir-bundle-${Date.now()}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
