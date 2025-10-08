import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { logClientView } from '../lib/clientAudit';

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) void logClientView(id);
  }, [id]);

  // …existing component logic/render
  return (
    // …existing JSX
    <div />
  );
}
