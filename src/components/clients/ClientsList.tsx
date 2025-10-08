import { useNavigate } from 'react-router-dom';
import { logClientView } from '../../lib/clientAudit';

export function ClientCard({ client }: { client: { id: string; name: string } }) {
  const nav = useNavigate();

  // Wrap whatever onClick/open logic you already have
  const open = async () => {
    // Non-blocking audit: best effort; don’t let errors block UX
    try { await logClientView(client.id); } catch {}
    nav(`/clients/${client.id}`);
  };

  return (
    <button onClick={open} className="w-full text-left">
      <div className="font-medium">{client.name}</div>
    </button>
  );
}