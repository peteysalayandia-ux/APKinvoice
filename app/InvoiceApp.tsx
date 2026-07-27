"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PaymentStatus = "Pending" | "Paid" | "Overdue";

type ExtraCharge = {
  id: string;
  description: string;
  amount: string;
};

type Invoice = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  invoiceDate: string;
  invoiceNumber: string;
  workDescription: string;
  hoursWorked: string;
  hourlyRate: string;
  extras: ExtraCharge[];
  paymentStatus: PaymentStatus;
  notes: string;
  updatedAt: string;
};

const STORAGE_KEY = "invoice-pocket-invoices-v1";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function nextInvoiceNumber() {
  const date = new Date();
  const stamp = [
    date.getFullYear().toString().slice(-2),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  return `INV-${stamp}-${String(Date.now()).slice(-4)}`;
}

function emptyInvoice(): Invoice {
  return {
    id: makeId(),
    customerName: "",
    phone: "",
    address: "",
    invoiceDate: today(),
    invoiceNumber: nextInvoiceNumber(),
    workDescription: "",
    hoursWorked: "",
    hourlyRate: "",
    extras: [{ id: makeId(), description: "", amount: "" }],
    paymentStatus: "Pending",
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

function invoiceTotal(invoice: Invoice) {
  const labor =
    (Number(invoice.hoursWorked) || 0) * (Number(invoice.hourlyRate) || 0);
  const extras = invoice.extras.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  return labor + extras;
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "plus"
    | "invoice"
    | "save"
    | "share"
    | "print"
    | "trash"
    | "edit"
    | "back"
    | "close"
    | "download";
  size?: number;
}) {
  const paths = {
    plus: "M12 5v14M5 12h14",
    invoice: "M7 3h8l4 4v14H7V3Zm8 0v5h5M10 13h6M10 17h6",
    save: "M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6",
    share:
      "M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 18 8ZM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.6 16.5l6.8 3M8.6 10.5l6.8-4",
    print:
      "M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7v-7Z",
    trash: "M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6",
    edit: "m4 20 4.5-1 10-10a2.12 2.12 0 0 0-3-3l-10 10L4 20Zm10-13 3 3",
    back: "m15 18-6-6 6-6",
    close: "m6 6 12 12M18 6 6 18",
    download: "M12 3v12m-5-5 5 5 5-5M5 21h14",
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function InvoiceApp() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [draft, setDraft] = useState<Invoice>(() => emptyInvoice());
  const [view, setView] = useState<"list" | "editor">("list");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | PaymentStatus>("All");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setInvoices(JSON.parse(saved));
      } catch {
        setNotice("Saved invoices could not be loaded.");
      } finally {
        setReady(true);
      }
    }, 0);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => {
      window.clearTimeout(hydrationTimer);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }, [invoices, ready]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredInvoices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return invoices
      .filter((invoice) => filter === "All" || invoice.paymentStatus === filter)
      .filter(
        (invoice) =>
          !needle ||
          invoice.customerName.toLowerCase().includes(needle) ||
          invoice.invoiceNumber.toLowerCase().includes(needle),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [filter, invoices, query]);

  const summary = useMemo(
    () => ({
      outstanding: invoices
        .filter((invoice) => invoice.paymentStatus !== "Paid")
        .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
      paid: invoices
        .filter((invoice) => invoice.paymentStatus === "Paid")
        .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
    }),
    [invoices],
  );

  const total = invoiceTotal(draft);
  const laborTotal =
    (Number(draft.hoursWorked) || 0) * (Number(draft.hourlyRate) || 0);
  const extrasTotal = draft.extras.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  function update<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function newInvoice() {
    setDraft(emptyInvoice());
    setView("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editInvoice(invoice: Invoice) {
    setDraft(structuredClone(invoice));
    setView("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveInvoice(event?: FormEvent) {
    event?.preventDefault();
    if (!draft.customerName.trim() || !draft.invoiceNumber.trim()) {
      setNotice("Add a customer name and invoice number.");
      return;
    }
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    setInvoices((current) => {
      const exists = current.some((invoice) => invoice.id === saved.id);
      return exists
        ? current.map((invoice) => (invoice.id === saved.id ? saved : invoice))
        : [saved, ...current];
    });
    setDraft(saved);
    setNotice("Invoice saved on this device.");
  }

  function deleteInvoice(id: string) {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice || !window.confirm(`Delete ${invoice.invoiceNumber}?`)) return;
    setInvoices((current) => current.filter((item) => item.id !== id));
    if (draft.id === id) {
      setDraft(emptyInvoice());
      setView("list");
    }
    setNotice("Invoice deleted.");
  }

  function updateExtra(id: string, field: "description" | "amount", value: string) {
    update(
      "extras",
      draft.extras.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeExtra(id: string) {
    const remaining = draft.extras.filter((item) => item.id !== id);
    update(
      "extras",
      remaining.length
        ? remaining
        : [{ id: makeId(), description: "", amount: "" }],
    );
  }

  async function shareInvoice() {
    saveInvoice();
    const text = `${draft.invoiceNumber} for ${draft.customerName} — ${currency.format(total)} (${draft.paymentStatus})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: draft.invoiceNumber, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setNotice("Invoice summary copied.");
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setNotice("Sharing is not available right now.");
      }
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await (installPrompt as Event & { prompt: () => Promise<void> }).prompt();
    setInstallPrompt(null);
  }

  if (!ready) {
    return (
      <main className="loading">
        <div className="brand-mark">
          <Icon name="invoice" size={26} />
        </div>
        <p>Opening Invoice Pocket…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {view === "list" ? (
        <>
          <header className="topbar">
            <a className="brand" href="#" aria-label="Invoice Pocket home">
              <span className="brand-mark">
                <Icon name="invoice" size={23} />
              </span>
              <span>
                <strong>Invoice Pocket</strong>
                <small>Simple work. Clear payment.</small>
              </span>
            </a>
            <div className="top-actions">
              {installPrompt && (
                <button className="button button-quiet" onClick={installApp}>
                  <Icon name="download" /> Install
                </button>
              )}
              <button className="button button-primary" onClick={newInvoice}>
                <Icon name="plus" /> New invoice
              </button>
            </div>
          </header>

          <section className="hero">
            <div>
              <p className="eyebrow">Your local invoice book</p>
              <h1>Get the job billed.</h1>
              <p>
                Create polished invoices in minutes—online or off. Your records
                stay on this device.
              </p>
            </div>
            <div className="summary-card">
              <div>
                <span>Outstanding</span>
                <strong>{currency.format(summary.outstanding)}</strong>
              </div>
              <div>
                <span>Collected</span>
                <strong>{currency.format(summary.paid)}</strong>
              </div>
              <div>
                <span>Total invoices</span>
                <strong>{invoices.length}</strong>
              </div>
            </div>
          </section>

          <section className="invoice-library">
            <div className="library-heading">
              <div>
                <p className="eyebrow">Invoice library</p>
                <h2>Recent work</h2>
              </div>
              <div className="search-row">
                <label className="search">
                  <span className="sr-only">Search invoices</span>
                  <input
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search customer or number"
                    type="search"
                    value={query}
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by status</span>
                  <select
                    onChange={(event) =>
                      setFilter(event.target.value as "All" | PaymentStatus)
                    }
                    value={filter}
                  >
                    <option>All</option>
                    <option>Pending</option>
                    <option>Paid</option>
                    <option>Overdue</option>
                  </select>
                </label>
              </div>
            </div>

            {filteredInvoices.length ? (
              <div className="invoice-grid">
                {filteredInvoices.map((invoice) => (
                  <article className="invoice-card" key={invoice.id}>
                    <div className="card-topline">
                      <span className={`status status-${invoice.paymentStatus.toLowerCase()}`}>
                        {invoice.paymentStatus}
                      </span>
                      <span>{new Date(`${invoice.invoiceDate}T12:00:00`).toLocaleDateString()}</span>
                    </div>
                    <div className="card-main">
                      <p>{invoice.invoiceNumber}</p>
                      <h3>{invoice.customerName}</h3>
                      <strong>{currency.format(invoiceTotal(invoice))}</strong>
                    </div>
                    <div className="card-actions">
                      <button onClick={() => editInvoice(invoice)}>
                        <Icon name="edit" size={18} /> Edit
                      </button>
                      <button
                        className="danger"
                        onClick={() => deleteInvoice(invoice.id)}
                      >
                        <Icon name="trash" size={18} /> Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Icon name="invoice" size={30} />
                </span>
                <h3>{invoices.length ? "No matching invoices" : "Your first invoice starts here"}</h3>
                <p>
                  {invoices.length
                    ? "Try another search or status."
                    : "Add the job details, save it locally, then print or share."}
                </p>
                {!invoices.length && (
                  <button className="button button-primary" onClick={newInvoice}>
                    <Icon name="plus" /> Create an invoice
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      ) : (
        <form className="editor" onSubmit={saveInvoice}>
          <header className="editor-bar no-print">
            <button
              className="back-button"
              onClick={() => setView("list")}
              type="button"
            >
              <Icon name="back" /> Invoices
            </button>
            <div className="editor-actions">
              <button className="button button-quiet" onClick={() => window.print()} type="button">
                <Icon name="print" /> Print / PDF
              </button>
              <button className="button button-quiet" onClick={shareInvoice} type="button">
                <Icon name="share" /> Share
              </button>
              <button className="button button-primary" type="submit">
                <Icon name="save" /> Save
              </button>
            </div>
          </header>

          <div className="invoice-paper">
            <div className="paper-header">
              <div className="invoice-title">
                <span className="brand-mark">
                  <Icon name="invoice" size={23} />
                </span>
                <div>
                  <p>Invoice Pocket</p>
                  <h1>INVOICE</h1>
                </div>
              </div>
              <div className="invoice-meta">
                <label>
                  <span>Invoice number</span>
                  <input
                    onChange={(event) => update("invoiceNumber", event.target.value)}
                    required
                    value={draft.invoiceNumber}
                  />
                </label>
                <label>
                  <span>Invoice date</span>
                  <input
                    onChange={(event) => update("invoiceDate", event.target.value)}
                    type="date"
                    value={draft.invoiceDate}
                  />
                </label>
              </div>
            </div>

            <section className="paper-section">
              <div className="section-label">
                <span>01</span>
                <p>Bill to</p>
              </div>
              <div className="field-grid customer-grid">
                <label className="field-wide">
                  <span>Customer name *</span>
                  <input
                    autoFocus
                    onChange={(event) => update("customerName", event.target.value)}
                    placeholder="Name or business"
                    required
                    value={draft.customerName}
                  />
                </label>
                <label>
                  <span>Phone number</span>
                  <input
                    inputMode="tel"
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="(555) 555-0123"
                    type="tel"
                    value={draft.phone}
                  />
                </label>
                <label className="field-full">
                  <span>Customer address</span>
                  <textarea
                    onChange={(event) => update("address", event.target.value)}
                    placeholder="Street, city, state, ZIP"
                    rows={2}
                    value={draft.address}
                  />
                </label>
              </div>
            </section>

            <section className="paper-section">
              <div className="section-label">
                <span>02</span>
                <p>Work</p>
              </div>
              <div className="field-grid">
                <label className="field-full">
                  <span>Work description</span>
                  <textarea
                    onChange={(event) =>
                      update("workDescription", event.target.value)
                    }
                    placeholder="Describe the completed work"
                    rows={3}
                    value={draft.workDescription}
                  />
                </label>
                <label>
                  <span>Hours worked</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => update("hoursWorked", event.target.value)}
                    placeholder="0"
                    step="0.25"
                    type="number"
                    value={draft.hoursWorked}
                  />
                </label>
                <label>
                  <span>Hourly rate</span>
                  <div className="money-input">
                    <span>$</span>
                    <input
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => update("hourlyRate", event.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={draft.hourlyRate}
                    />
                  </div>
                </label>
                <div className="labor-total">
                  <span>Labor subtotal</span>
                  <strong>{currency.format(laborTotal)}</strong>
                </div>
              </div>
            </section>

            <section className="paper-section">
              <div className="section-label">
                <span>03</span>
                <p>Materials & extras</p>
              </div>
              <div className="extras-list">
                {draft.extras.map((extra) => (
                  <div className="extra-row" key={extra.id}>
                    <label>
                      <span>Description</span>
                      <input
                        onChange={(event) =>
                          updateExtra(extra.id, "description", event.target.value)
                        }
                        placeholder="Material or extra charge"
                        value={extra.description}
                      />
                    </label>
                    <label>
                      <span>Amount</span>
                      <div className="money-input">
                        <span>$</span>
                        <input
                          inputMode="decimal"
                          min="0"
                          onChange={(event) =>
                            updateExtra(extra.id, "amount", event.target.value)
                          }
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={extra.amount}
                        />
                      </div>
                    </label>
                    <button
                      aria-label="Remove charge"
                      className="icon-button no-print"
                      onClick={() => removeExtra(extra.id)}
                      type="button"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                ))}
                <button
                  className="add-line no-print"
                  onClick={() =>
                    update("extras", [
                      ...draft.extras,
                      { id: makeId(), description: "", amount: "" },
                    ])
                  }
                  type="button"
                >
                  <Icon name="plus" size={18} /> Add another charge
                </button>
              </div>
            </section>

            <section className="paper-section finishing-section">
              <div className="field-grid">
                <label>
                  <span>Payment status</span>
                  <select
                    onChange={(event) =>
                      update("paymentStatus", event.target.value as PaymentStatus)
                    }
                    value={draft.paymentStatus}
                  >
                    <option>Pending</option>
                    <option>Paid</option>
                    <option>Overdue</option>
                  </select>
                </label>
                <label className="field-full notes-field">
                  <span>Notes</span>
                  <textarea
                    onChange={(event) => update("notes", event.target.value)}
                    placeholder="Payment terms, thank-you note, or other details"
                    rows={3}
                    value={draft.notes}
                  />
                </label>
              </div>
              <aside className="totals-panel">
                <div>
                  <span>Labor</span>
                  <strong>{currency.format(laborTotal)}</strong>
                </div>
                <div>
                  <span>Materials & extras</span>
                  <strong>{currency.format(extrasTotal)}</strong>
                </div>
                <div className="grand-total">
                  <span>Total</span>
                  <strong>{currency.format(total)}</strong>
                </div>
                <span className={`status status-${draft.paymentStatus.toLowerCase()}`}>
                  {draft.paymentStatus}
                </span>
              </aside>
            </section>
          </div>

          <div className="mobile-save no-print">
            <button className="button button-primary" type="submit">
              <Icon name="save" /> Save invoice · {currency.format(total)}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
