import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Target,
  ArrowRight,
  Wallet,
  TrendingUp,
  PiggyBank,
  ShoppingCart,
} from "lucide-react";

const navCards = [
  {
    emoji: "📊",
    title: "Anggaran",
    subtitle: "Budget",
    description: "Kelola anggaran bulanan Anda",
    href: "/dashboard/planning/budget",
    icon: BarChart3,
    gradient: "from-blue-500 to-blue-600",
    shadowColor: "shadow-blue-500/20",
  },
  {
    emoji: "📅",
    title: "Acara",
    subtitle: "Events",
    description: "Rencanakan keuangan untuk acara",
    href: "/dashboard/planning/events",
    icon: CalendarDays,
    gradient: "from-violet-500 to-purple-600",
    shadowColor: "shadow-violet-500/20",
  },
  {
    emoji: "🎯",
    title: "Tabungan",
    subtitle: "Savings",
    description: "Atur target tabungan",
    href: "/dashboard/planning/savings",
    icon: Target,
    gradient: "from-emerald-500 to-teal-600",
    shadowColor: "shadow-emerald-500/20",
  },
  {
    emoji: "📈",
    title: "Investasi",
    subtitle: "Investments",
    description: "Pantau dan kelola portofolio investasi Anda",
    href: "/dashboard/planning/investments",
    icon: TrendingUp,
    gradient: "from-amber-500 to-orange-600",
    shadowColor: "shadow-amber-500/20",
  },
  {
    emoji: "🛒",
    title: "Belanja",
    subtitle: "Shopping",
    description: "Rencanakan belanja harian/bulanan & catat realisasinya",
    href: "/dashboard/planning/shopping",
    icon: ShoppingCart,
    gradient: "from-rose-500 to-red-600",
    shadowColor: "shadow-rose-500/20",
  },
];

const quickStats = [
  {
    label: "Total Anggaran",
    value: "Rp15.000.000",
    icon: Wallet,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    label: "Terpakai",
    value: "Rp8.200.000",
    icon: TrendingUp,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    label: "Sisa",
    value: "Rp6.800.000",
    icon: PiggyBank,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
];

export default function PlanningPage() {
  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
          Perencanaan Keuangan
        </h1>
        <p className="text-dashboard-gray max-w-2xl text-lg leading-relaxed">
          Kelola anggaran, rencanakan keuangan acara, pantau target tabungan,
          dan kelola portofolio investasi Anda dari satu tempat.
        </p>
      </section>

      {/* Navigation Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
        {navCards.map((card) => (
          <Link key={card.href} href={card.href} className="group h-full flex flex-col">
            <div
              className={`custom-card p-6 md:p-10 relative overflow-hidden transition-all duration-300 hover:shadow-xl ${card.shadowColor} hover:-translate-y-1 h-full flex flex-col justify-between`}
            >
              <div>
                {/* Background gradient accent */}
                <div
                  className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${card.gradient} opacity-[0.06] rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500`}
                />

                {/* Emoji icon */}
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">{card.emoji}</span>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-slate-800 mb-1">
                  {card.title}
                </h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">
                  {card.subtitle}
                </span>

                {/* Description */}
                <p className="text-dashboard-gray text-sm leading-relaxed mb-8">
                  {card.description}
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-dashboard-blue font-bold text-sm group-hover:gap-3 transition-all mt-auto relative z-10">
                <span>Lihat Detail</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Quick Stats Row */}
      <section className="custom-card p-6 md:p-10">
        <h3 className="font-black text-xl text-slate-800 mb-2">
          Ringkasan Anggaran Bulan Ini
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
          Mei 2026
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`${stat.bg} ${stat.border} border rounded-2xl p-6 flex items-center gap-4`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}
                >
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-xl font-black ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500">
              Penggunaan Anggaran
            </span>
            <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              54.7%
            </span>
          </div>
          <div className="h-4 bg-blue-50 rounded-full overflow-hidden p-0.5 border border-blue-100/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm transition-all duration-1000"
              style={{ width: "54.7%" }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-400">Rp0</span>
            <span className="text-xs text-slate-400">Rp15.000.000</span>
          </div>
        </div>
      </section>
    </>
  );
}
