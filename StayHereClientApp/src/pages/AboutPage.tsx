import { motion } from "framer-motion";
import { IcoBuilding, IcoCheck, IcoStar } from "../components/icons";
import { AnimatedCounter, GradientBlobs, SectionHeading } from "../components/ui";

const TEAM = [
  { name: "Amara Osei", role: "CEO & Co-Founder", initial: "AO", color: "#c9a227" },
  { name: "Brian Kamau", role: "CTO", initial: "BK", color: "#0d9488" },
  { name: "Christine Wanjiku", role: "Head of Operations", initial: "CW", color: "#a78bfa" },
];

const VALUES = [
  { icon: <IcoStar size={22} className="text-brand-gold" />, title: "Transparency", desc: "Every listing shows real prices, real photos, and honest descriptions — no surprises." },
  { icon: <IcoCheck size={22} className="text-brand-teallight" />, title: "Trust", desc: "Verified property owners and background-checked listings so you rent with confidence." },
  { icon: <IcoBuilding size={22} className="text-brand-gold" />, title: "Technology", desc: "AI-powered search, smart matching, and digital lease management built for modern Kenya." },
];

export function AboutPage() {
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero py-24 px-4 text-center">
        <GradientBlobs />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl"
        >
          <span className="inline-block rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-gold mb-6">
            Our Story
          </span>
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl leading-tight">
            Making Quality Housing<br />
            <span className="text-gradient-gold">Accessible to Every Kenyan</span>
          </h1>
          <p className="mt-6 text-lg text-brand-muted leading-relaxed">
            StayHere was born from a simple observation: finding a trustworthy rental in Nairobi was harder than it needed to be. We're changing that with technology, transparency, and genuine care.
          </p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: 4200, suffix: "+", label: "Active Listings" },
            { value: 1200, suffix: "+", label: "Property Owners" },
            { value: 8500, suffix: "+", label: "Happy Tenants" },
            { value: 15, suffix: " cities", label: "Cities Covered" },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card-dark p-6 text-center"
            >
              <div className="font-display text-3xl font-bold text-brand-gold">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-1 text-sm text-brand-muted">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <SectionHeading title="Our Mission" subtitle="We believe every Kenyan deserves a safe, comfortable home. StayHere connects tenants with verified property owners through a transparent, technology-first platform that makes the rental journey simple, fast, and trustworthy." />
            <ul className="mt-6 space-y-3">
              {["Verified listings from trusted owners", "AI-powered property matching", "Transparent pricing — no hidden fees", "Digital lease and payment management"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-brand-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/20 text-brand-teallight">
                    <IcoCheck size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative h-72 overflow-hidden rounded-3xl">
            <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80" alt="Modern Nairobi building" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/50 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading title="Our Values" center />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-dark p-6 text-center space-y-3 hover:border-brand-gold/30 transition"
            >
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-white/5">
                {v.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-white">{v.title}</h3>
              <p className="text-sm text-brand-muted leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section id="team" className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading title="Meet the Team" subtitle="Passionate Kenyans building the future of real estate." center />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {TEAM.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-dark p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-brand-dark" style={{ background: `linear-gradient(135deg,${member.color}cc,${member.color})` }}>
                {member.initial}
              </div>
              <h4 className="font-display text-lg font-semibold text-white">{member.name}</h4>
              <p className="text-sm text-brand-muted mt-1">{member.role}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
