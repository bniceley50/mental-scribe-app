import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateFHIRBundle, downloadFHIRBundle } from '@/lib/fhir';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface FHIRExportProps {
  note: any;
  client: any;
}

const FHIRExport: React.FC<FHIRExportProps> = ({ note, client }) => {
  const [format, setFormat] = useState<'json' | 'xml'>('json');
  const [practitionerName, setPractitionerName] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const handleExport = () => {
    if (!note || !client) {
      toast.error('Note and client data are required for export');
      return;
    }

    try {
      const bundle = generateFHIRBundle({
        client,
        note,
        practitionerName: practitionerName || 'Unknown Provider',
        organizationName: organizationName || 'Mental Health Clinic'
      });

      const filename = `fhir-note-${client.last_name}-${new Date(note.session_date).toISOString().split('T')[0]}.${format}`;
      downloadFHIRBundle(bundle, format, filename);

      toast.success(`FHIR bundle exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export FHIR bundle');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Export to EHR (FHIR)
        </CardTitle>
        <CardDescription>
          Export this note as a FHIR-compliant document for integration with electronic health records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="practitioner">Practitioner Name</Label>
          <Input
            id="practitioner"
            placeholder="Dr. Jane Smith"
            value={practitionerName}
            onChange={(e) => setPractitionerName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization">Organization Name</Label>
          <Input
            id="organization"
            placeholder="Mental Health Clinic"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">Export Format</Label>
          <Select value={format} onValueChange={(value: 'json' | 'xml') => setFormat(value)}>
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON (recommended)</SelectItem>
              <SelectItem value="xml">XML</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} className="w-full gap-2">
          <FileDown className="h-4 w-4" />
          Export FHIR Bundle
        </Button>

        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-semibold">Next steps:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Save the exported file to your computer</li>
            <li>Open your EHR system</li>
            <li>Navigate to the import/upload section</li>
            <li>Select the downloaded FHIR file</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FHIRExport;
