import { useMemo, useState } from "react";

const CONTACTS = [
  { label: "On-campus counseling", phone: "+91-863-2344700" },
  { label: "iCall Helpline", phone: "9152987821" },
  { label: "Vandrevala Foundation (24x7)", phone: "1860-2662-345" },
  { label: "AASRA (24x7)", phone: "9820466627" },
];

const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export default function MentalHealthBanner({ triggered = false, crisis = false }) {
  const [dismissed, setDismissed] = useState(false);

  const visible = useMemo(() => {
    if (crisis) {
      return true;
    }
    return triggered && !dismissed;
  }, [triggered, crisis, dismissed]);

  if (!visible) {
    return null;
  }

  if (crisis) {
    return (
      <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-400/60 dark:bg-red-900/25 dark:text-red-100">
        <p className="text-base font-semibold">
          Please reach out right now. You matter and help is available.
          Call or text any of these numbers immediately:
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONTACTS.map((contact) => (
            <a
              key={contact.label}
              href={telHref(contact.phone)}
              className="rounded-lg border border-red-300 bg-white p-3 text-sm hover:bg-red-100 dark:border-red-300/60 dark:bg-red-900/35 dark:hover:bg-red-900/50"
            >
              <p className="font-semibold">{contact.label}</p>
              <p className="mt-1">{contact.phone}</p>
              <span className="mt-2 inline-block rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white">
                CALL NOW
              </span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-900/25 dark:text-emerald-100">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          It sounds like you're going through a tough time.
          <br />
          You are not alone — support is available at Vignan. 💚
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded px-2 py-1 text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/45"
          aria-label="Dismiss support banner"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CONTACTS.map((contact) => (
          <a
            key={contact.label}
            href={telHref(contact.phone)}
            className="rounded-lg border border-emerald-200 bg-white p-3 text-sm hover:bg-emerald-100 dark:border-emerald-400/50 dark:bg-emerald-900/35 dark:hover:bg-emerald-900/50"
          >
            <p className="font-semibold">{contact.label}</p>
            <p className="mt-1">{contact.phone}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
