import { ExternalLink } from "lucide-react";

// Same instance as ODOO_BASE_URL, which is server-only.
const ODOO_WEB_URL = "https://suvanza.odoo.com";

/** "ID 77 ↗", opening the contact's form in Odoo in a new tab. */
export function OdooPartnerLink({ id, className = "" }: { id: number; className?: string }) {
  return (
    <a
      href={`${ODOO_WEB_URL}/odoo/contacts/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir el contacto en Odoo"
      className={`inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-sky-700 ${className}`}
    >
      ID {id}
      <ExternalLink size={12} aria-hidden />
    </a>
  );
}
