import { motion } from "framer-motion";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { IcoCheck, IcoEmail, IcoLoader, IcoLocation, IcoPhone } from "../components/icons";
import { GradientBlobs, SectionHeading } from "../components/ui";

export function ContactPage() {
  const { toast } = useApp();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast("Message sent! We'll get back to you shortly.", "success");
    }, 1200);
  }

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero px-4 py-20 text-center">
        <GradientBlobs />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Get In Touch</h1>
          <p className="mt-4 text-brand-muted">We're here to help. Reach out and we'll respond within 24 hours.</p>
        </motion.div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <SectionHeading title="Contact Info" />
            {[
              { icon: <IcoPhone size={20} className="text-brand-gold" />, label: "Phone", value: "+254 700 000 000", href: "tel:+254700000000" },
              { icon: <IcoEmail size={20} className="text-brand-gold" />, label: "Email", value: "hello@stayhere.co.ke", href: "mailto:hello@stayhere.co.ke" },
              { icon: <IcoLocation size={20} className="text-brand-gold" />, label: "Office", value: "Westlands, Nairobi, Kenya", href: undefined },
            ].map((c) => (
              <div key={c.label} className="card-dark p-5 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10">
                  {c.icon}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-brand-muted mb-0.5">{c.label}</div>
                  {c.href ? (
                    <a href={c.href} className="text-sm font-medium text-white hover:text-brand-gold transition">{c.value}</a>
                  ) : (
                    <span className="text-sm font-medium text-white">{c.value}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Office hours */}
            <div className="card-dark p-5">
              <h4 className="text-sm font-semibold text-white mb-3">Office Hours</h4>
              <div className="space-y-1.5 text-sm text-brand-muted">
                <div className="flex justify-between"><span>Monday – Friday</span><span className="text-white">8:00 – 17:00</span></div>
                <div className="flex justify-between"><span>Saturday</span><span className="text-white">9:00 – 13:00</span></div>
                <div className="flex justify-between"><span>Sunday</span><span className="text-brand-muted/50">Closed</span></div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="card-dark overflow-hidden h-40 flex items-center justify-center bg-white/5 relative">
              <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600')] bg-cover" />
              <div className="z-10 flex flex-col items-center gap-2 text-brand-muted">
                <IcoLocation size={24} className="text-brand-gold" />
                <span className="text-sm">Westlands, Nairobi</span>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="lg:col-span-3"
          >
            <div className="glass-strong rounded-3xl p-8">
              {sent ? (
                <div className="flex flex-col items-center gap-5 py-8 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <IcoCheck size={38} />
                  </motion.div>
                  <h3 className="font-display text-xl font-semibold text-white">Message Sent!</h3>
                  <p className="text-brand-muted">Thanks for reaching out. We'll respond within 24 hours.</p>
                  <button onClick={() => setSent(false)} className="btn-ghost text-sm">Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-display text-xl font-semibold text-white mb-6">Send a Message</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Name *</label>
                      <input required value={form.name} onChange={set("name")} placeholder="Your full name" className="input-dark" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Email *</label>
                      <input required type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" className="input-dark" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Phone</label>
                      <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+254…" className="input-dark" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Subject *</label>
                      <select required value={form.subject} onChange={set("subject")} className="input-dark">
                        <option value="">Select subject…</option>
                        <option>General Enquiry</option>
                        <option>Property Viewing Request</option>
                        <option>Partnership</option>
                        <option>Technical Support</option>
                        <option>Feedback</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Message *</label>
                    <textarea required rows={5} value={form.message} onChange={set("message")} placeholder="Tell us how we can help…" className="input-dark resize-none" />
                  </div>
                  <button type="submit" disabled={sending} className="btn-gold w-full justify-center mt-2 disabled:opacity-50">
                    {sending ? <IcoLoader size={18} /> : <><IcoCheck size={17} /> Send Message</>}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
