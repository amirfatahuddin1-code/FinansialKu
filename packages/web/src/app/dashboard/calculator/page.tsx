"use client";

import { useState } from "react";
import {
  Calculator,
  Landmark,
  PiggyBank,
  TrendingUp,
  ArrowRight,
  Info,
} from "lucide-react";

type Tab = "pinjaman" | "tabungan" | "investasi";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pinjaman");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "pinjaman",
      label: "Pinjaman",
      icon: <Landmark className="h-4.5 w-4.5" />,
    },
    {
      key: "tabungan",
      label: "Tabungan",
      icon: <PiggyBank className="h-4.5 w-4.5" />,
    },
    {
      key: "investasi",
      label: "Investasi",
      icon: <TrendingUp className="h-4.5 w-4.5" />,
    },
  ];

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <p className="text-xs font-bold text-dashboard-gray uppercase tracking-widest mb-3">
          Dashboard &rsaquo; Kalkulator
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800 flex items-center gap-4">
          <span className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Calculator className="h-6 w-6 text-white" />
          </span>
          Kalkulator Keuangan
        </h1>
        <p className="text-dashboard-gray max-w-2xl text-lg leading-relaxed">
          Simulasikan pinjaman, tabungan, dan investasi Anda dengan kalkulator
          interaktif yang akurat.
        </p>
      </section>

      {/* Tab Bar */}
      <div className="flex items-center gap-2 bg-white/50 p-2 rounded-2xl border border-white mb-8 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-dashboard-blue text-white shadow-md shadow-blue-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/80"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "pinjaman" && <LoanCalculator />}
      {activeTab === "tabungan" && <SavingsCalculator />}
      {activeTab === "investasi" && <InvestmentCalculator />}
    </>
  );
}

/* ---- Loan Calculator ---- */

function LoanCalculator() {
  const [amount, setAmount] = useState(500000000);
  const [rate, setRate] = useState(8.5);
  const [tenor, setTenor] = useState(240);

  const monthlyRate = rate / 100 / 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (amount * monthlyRate * Math.pow(1 + monthlyRate, tenor)) /
        (Math.pow(1 + monthlyRate, tenor) - 1)
      : amount / tenor;
  const totalPayment = monthlyPayment * tenor;
  const totalInterest = totalPayment - amount;

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Input Section */}
      <div className="col-span-12 lg:col-span-5 custom-card p-8 md:p-10">
        <h3 className="font-black text-xl text-slate-800 mb-2">
          Simulasi Pinjaman
        </h3>
        <p className="text-sm text-slate-400 mb-8">
          Hitung cicilan bulanan pinjaman Anda
        </p>

        <div className="space-y-6">
          <InputField
            label="Jumlah Pinjaman"
            value={amount}
            onChange={setAmount}
            prefix="Rp"
            step={10000000}
            min={1000000}
            max={10000000000}
          />
          <InputField
            label="Suku Bunga Tahunan"
            value={rate}
            onChange={setRate}
            suffix="% / tahun"
            step={0.5}
            min={0.1}
            max={30}
            isDecimal
          />
          <InputField
            label="Tenor"
            value={tenor}
            onChange={setTenor}
            suffix="bulan"
            step={12}
            min={1}
            max={600}
          />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-dashboard-blue shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 leading-relaxed">
            Perhitungan menggunakan metode anuitas. Cicilan tetap setiap bulan
            selama masa pinjaman.
          </p>
        </div>
      </div>

      {/* Results Section */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        <ResultCard
          label="Cicilan Bulanan"
          value={formatRupiah(monthlyPayment)}
          accent
          subtitle={`Selama ${tenor} bulan (${(tenor / 12).toFixed(1)} tahun)`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ResultCard
            label="Total Pembayaran"
            value={formatRupiah(totalPayment)}
            subtitle="Pokok + Bunga"
          />
          <ResultCard
            label="Total Bunga"
            value={formatRupiah(totalInterest)}
            subtitle={`${((totalInterest / amount) * 100).toFixed(1)}% dari pokok`}
          />
        </div>

        {/* Breakdown Bar */}
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Komposisi Pembayaran
          </p>
          <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-dashboard-blue rounded-l-full transition-all duration-500"
              style={{
                width: `${(amount / totalPayment) * 100}%`,
              }}
            />
            <div
              className="bg-rose-400 rounded-r-full transition-all duration-500"
              style={{
                width: `${(totalInterest / totalPayment) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-dashboard-blue" />
              <span className="text-xs font-bold text-slate-600">
                Pokok ({((amount / totalPayment) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="text-xs font-bold text-slate-600">
                Bunga ({((totalInterest / totalPayment) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Savings Calculator ---- */

function SavingsCalculator() {
  const [target, setTarget] = useState(100000000);
  const [duration, setDuration] = useState(36);
  const [rate, setRate] = useState(4.5);

  const monthlyRate = rate / 100 / 12;
  const monthlySavings =
    monthlyRate > 0
      ? (target * monthlyRate) / (Math.pow(1 + monthlyRate, duration) - 1)
      : target / duration;
  const totalDeposits = monthlySavings * duration;
  const totalInterest = target - totalDeposits;

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Input Section */}
      <div className="col-span-12 lg:col-span-5 custom-card p-8 md:p-10">
        <h3 className="font-black text-xl text-slate-800 mb-2">
          Simulasi Tabungan
        </h3>
        <p className="text-sm text-slate-400 mb-8">
          Hitung berapa yang perlu ditabung setiap bulan
        </p>

        <div className="space-y-6">
          <InputField
            label="Target Tabungan"
            value={target}
            onChange={setTarget}
            prefix="Rp"
            step={5000000}
            min={1000000}
            max={10000000000}
          />
          <InputField
            label="Durasi"
            value={duration}
            onChange={setDuration}
            suffix="bulan"
            step={6}
            min={1}
            max={600}
          />
          <InputField
            label="Suku Bunga Tabungan"
            value={rate}
            onChange={setRate}
            suffix="% / tahun"
            step={0.5}
            min={0}
            max={15}
            isDecimal
          />
        </div>

        <div className="mt-8 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-700 leading-relaxed">
            Perhitungan mengasumsikan bunga majemuk bulanan dan setoran rutin di
            awal setiap bulan.
          </p>
        </div>
      </div>

      {/* Results Section */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        <ResultCard
          label="Tabungan Bulanan"
          value={formatRupiah(monthlySavings)}
          accent
          subtitle={`Selama ${duration} bulan (${(duration / 12).toFixed(1)} tahun)`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ResultCard
            label="Total Setoran"
            value={formatRupiah(totalDeposits)}
            subtitle="Akumulasi tabungan Anda"
          />
          <ResultCard
            label="Bunga Diperoleh"
            value={formatRupiah(Math.max(0, totalInterest))}
            subtitle="Penghasilan pasif dari bunga"
          />
        </div>

        {/* Target Progress */}
        <div className="custom-card p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Menuju Target
            </p>
            <span className="text-sm font-black text-dashboard-blue">
              {formatRupiah(target)}
            </span>
          </div>
          <div className="h-5 bg-green-50 rounded-full overflow-hidden border border-green-100 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (totalDeposits / target) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-xs font-bold text-slate-500">
              Setoran: {((totalDeposits / target) * 100).toFixed(1)}%
            </span>
            <span className="text-xs font-bold text-green-600">
              Bunga: {((Math.max(0, totalInterest) / target) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Investment Calculator ---- */

function InvestmentCalculator() {
  const [initial, setInitial] = useState(50000000);
  const [monthly, setMonthly] = useState(2000000);
  const [returnRate, setReturnRate] = useState(10);
  const [duration, setDuration] = useState(120);

  const monthlyReturn = returnRate / 100 / 12;
  // Future value of initial + future value of annuity
  const fvInitial = initial * Math.pow(1 + monthlyReturn, duration);
  const fvAnnuity =
    monthlyReturn > 0
      ? monthly *
        ((Math.pow(1 + monthlyReturn, duration) - 1) / monthlyReturn)
      : monthly * duration;
  const futureValue = fvInitial + fvAnnuity;
  const totalCapital = initial + monthly * duration;
  const totalEarnings = futureValue - totalCapital;

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Input Section */}
      <div className="col-span-12 lg:col-span-5 custom-card p-8 md:p-10">
        <h3 className="font-black text-xl text-slate-800 mb-2">
          Simulasi Investasi
        </h3>
        <p className="text-sm text-slate-400 mb-8">
          Proyeksi pertumbuhan investasi jangka panjang
        </p>

        <div className="space-y-6">
          <InputField
            label="Modal Awal"
            value={initial}
            onChange={setInitial}
            prefix="Rp"
            step={5000000}
            min={0}
            max={10000000000}
          />
          <InputField
            label="Kontribusi Bulanan"
            value={monthly}
            onChange={setMonthly}
            prefix="Rp"
            step={500000}
            min={0}
            max={1000000000}
          />
          <InputField
            label="Return Tahunan"
            value={returnRate}
            onChange={setReturnRate}
            suffix="% / tahun"
            step={0.5}
            min={0}
            max={50}
            isDecimal
          />
          <InputField
            label="Durasi Investasi"
            value={duration}
            onChange={setDuration}
            suffix="bulan"
            step={12}
            min={1}
            max={600}
          />
        </div>

        <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 leading-relaxed">
            Simulasi menggunakan compound return bulanan. Hasil aktual dapat
            bervariasi tergantung instrumen investasi.
          </p>
        </div>
      </div>

      {/* Results Section */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        <ResultCard
          label="Nilai di Masa Depan"
          value={formatRupiah(futureValue)}
          accent
          subtitle={`Setelah ${duration} bulan (${(duration / 12).toFixed(1)} tahun)`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ResultCard
            label="Total Modal"
            value={formatRupiah(totalCapital)}
            subtitle={`Modal awal + ${duration}x kontribusi`}
          />
          <ResultCard
            label="Total Keuntungan"
            value={formatRupiah(totalEarnings)}
            subtitle={`Return ${((totalEarnings / totalCapital) * 100).toFixed(1)}% dari modal`}
          />
        </div>

        {/* Growth Visualization */}
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Komposisi Nilai Akhir
          </p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="w-full h-2 bg-dashboard-blue rounded-full mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Modal Awal
              </p>
              <p className="text-sm font-black text-slate-800">
                {formatRupiah(initial)}
              </p>
            </div>
            <div className="text-center">
              <div className="w-full h-2 bg-blue-300 rounded-full mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Kontribusi
              </p>
              <p className="text-sm font-black text-slate-800">
                {formatRupiah(monthly * duration)}
              </p>
            </div>
            <div className="text-center">
              <div className="w-full h-2 bg-emerald-400 rounded-full mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Keuntungan
              </p>
              <p className="text-sm font-black text-slate-800">
                {formatRupiah(totalEarnings)}
              </p>
            </div>
          </div>
          <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-dashboard-blue transition-all duration-500"
              style={{
                width: `${(initial / futureValue) * 100}%`,
              }}
            />
            <div
              className="bg-blue-300 transition-all duration-500"
              style={{
                width: `${((monthly * duration) / futureValue) * 100}%`,
              }}
            />
            <div
              className="bg-emerald-400 rounded-r-full transition-all duration-500"
              style={{
                width: `${(totalEarnings / futureValue) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Shared Components ---- */

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min,
  max,
  isDecimal = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step: number;
  min: number;
  max: number;
  isDecimal?: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = isDecimal
      ? parseFloat(e.target.value) || 0
      : parseInt(e.target.value) || 0;
    onChange(Math.min(max, Math.max(min, val)));
  };

  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-dashboard-blue focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        {prefix && (
          <span className="text-sm font-bold text-slate-400 pl-4">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={handleChange}
          step={step}
          min={min}
          max={max}
          className="flex-1 bg-transparent px-4 py-3.5 text-sm font-bold text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="text-xs font-bold text-slate-400 pr-4 shrink-0">
            {suffix}
          </span>
        )}
      </div>
      {/* Quick adjust buttons */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="text-xs font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-lg transition-colors cursor-pointer border border-slate-100"
        >
          −{isDecimal ? step : formatShort(step)}
        </button>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="text-xs font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 px-3 py-1 rounded-lg transition-colors cursor-pointer border border-slate-100"
        >
          +{isDecimal ? step : formatShort(step)}
        </button>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  subtitle,
  accent = false,
}: {
  label: string;
  value: string;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`custom-card p-8 ${
        accent
          ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white"
          : ""
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-widest mb-2 ${
          accent ? "text-white/70" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <h3
        className={`text-3xl md:text-4xl font-black mb-2 ${
          accent ? "text-white" : "text-slate-800"
        }`}
      >
        {value}
      </h3>
      <div className="flex items-center gap-2">
        <ArrowRight
          className={`h-3.5 w-3.5 ${
            accent ? "text-white/50" : "text-slate-300"
          }`}
        />
        <p
          className={`text-sm font-medium ${
            accent ? "text-white/70" : "text-slate-400"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function formatShort(n: number): string {
  if (n >= 1_000_000_000) return `${n / 1_000_000_000}M`;
  if (n >= 1_000_000) return `${n / 1_000_000}jt`;
  if (n >= 1_000) return `${n / 1_000}rb`;
  return String(n);
}
