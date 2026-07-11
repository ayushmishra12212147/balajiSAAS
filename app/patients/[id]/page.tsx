"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  User,
  MapPin,
  PhoneCall,
  Link as LinkIcon,
  ShieldCheck,
  Calendar,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";

type PatientDetailsType = {
  id: string;
  uhid: string;
  name: string;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  dob: string;
  gender: string;
  bloodGroup: string | null;
  aadhaarNumber: string | null;
  occupation: string | null;
  photoUrl: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  remarks: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  address?: {
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  } | null;
  referrals?: {
    referralType: string;
    referralName: string;
    referralNotes: string | null;
  }[];
};

/**
 * calculateAge
 * Helper to display current calculated age.
 */
function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

/**
 * PatientDetailsPage
 * Renders full demographic cards and sets up static sub-module history logs.
 */
export default function PatientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  // Photo URL Modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);

  // Active History Tab placeholder state
  const [activeTab, setActiveTab] = useState("opd");

  const loadPatient = async () => {
    setLoading(true);
    try {
      const data = await apiClient<PatientDetailsType>(`/api/patients/${patientId}`);
      setPatient(data);
      setNewPhotoUrl(data.photoUrl || "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load patient card.";
      toast.error(msg);
      router.push("/patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoSaving(true);
    try {
      await apiClient(`/api/patients/${patientId}/photo`, {
        method: "PUT",
        body: JSON.stringify({ photoUrl: newPhotoUrl }),
      });
      toast.success("Patient profile photo updated successfully.");
      setPhotoModalOpen(false);
      loadPatient();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update photo.";
      toast.error(msg);
    } finally {
      setPhotoSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Electronic Patient Record...</span>
      </div>
    );
  }

  if (!patient) return null;

  // Static placeholders definition for downstream clinical modules
  const historyTabs = [
    { id: "opd", label: "OPD History" },
    { id: "ipd", label: "IPD History" },
    { id: "ot", label: "OT History" },
    { id: "lab", label: "Laboratory" },
    { id: "radiology", label: "Radiology" },
    { id: "billing", label: "Billing Ledger" },
    { id: "pharmacy", label: "Pharmacy Logs" },
    { id: "birth", label: "Birth Record" },
    { id: "death", label: "Death Record" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/patients"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">{patient.name}</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full uppercase">
                {patient.gender}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              UHID: <strong className="text-slate-200 font-mono">{patient.uhid}</strong> | Version: {patient.version}
            </p>
          </div>
        </div>

        <Link
          href={`/patients/${patient.id}/edit`}
          className="flex items-center justify-center space-x-2 bg-slate-900 border border-slate-800 hover:border-slate-750 hover:bg-slate-850 text-slate-200 hover:text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Edit size={14} />
          <span>Edit Demographics</span>
        </Link>
      </div>

      {/* Main Grid: Card Details & Photo Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Card & Photo Section */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-between space-y-5 text-center backdrop-blur-sm shadow-xl">
          <div className="space-y-4 w-full flex flex-col items-center">
            <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              {patient.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={patient.photoUrl}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={36} className="text-slate-600" />
              )}
              {/* Photo Overlay hover trigger */}
              <button
                onClick={() => setPhotoModalOpen(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer text-[10px] font-semibold text-white space-x-1"
              >
                <ImageIcon size={12} />
                <span>Upload</span>
              </button>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{patient.name}</h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{calculateAge(patient.dob)} Years Old</p>
            </div>
          </div>

          <div className="w-full space-y-2 text-left border-t border-slate-800/80 pt-4">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-500">Blood Group:</span>
              <span className="text-zinc-300 font-mono">{patient.bloodGroup ? patient.bloodGroup.replace("_POSITIVE", "+").replace("_NEGATIVE", "-") : "--"}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-500">Aadhaar No:</span>
              <span className="text-zinc-300 font-mono">{patient.aadhaarNumber ? patient.aadhaarNumber : "--"}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-500">Marital Status:</span>
              <span className="text-zinc-300 uppercase">{patient.maritalStatus || "--"}</span>
            </div>
          </div>
        </div>

        {/* Informative Demographic Data Cards */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Contact details */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
                <PhoneCall size={13} />
                <span>Contact Demographics</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-zinc-500">Mobile Phone:</span> <span className="text-zinc-300 font-mono">{patient.phone}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Alternate Phone:</span> <span className="text-zinc-300 font-mono">{patient.alternatePhone || "--"}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Email Address:</span> <span className="text-zinc-300">{patient.email || "--"}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Nationality:</span> <span className="text-zinc-300">{patient.nationality || "Indian"}</span></div>
              </div>
            </div>

            {/* Card 2: Address Details */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
                <MapPin size={13} />
                <span>Permanent Address</span>
              </h3>
              {patient.address ? (
                <div className="space-y-2 text-xs">
                  <div><span className="text-zinc-500 block mb-0.5">Address details:</span> <span className="text-zinc-300 font-medium">{patient.address.addressLine}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">City / State:</span> <span className="text-zinc-300">{patient.address.city}, {patient.address.state}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Pincode:</span> <span className="text-zinc-300 font-mono">{patient.address.pincode}</span></div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 font-mono">No Address parameters logged.</p>
              )}
            </div>

            {/* Card 3: Emergency contact details */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
                <ShieldCheck size={13} />
                <span>Emergency Contact Card</span>
              </h3>
              {patient.emergencyContact ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Person Name:</span> <span className="text-zinc-300 font-semibold">{patient.emergencyContact.name}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Relationship:</span> <span className="text-zinc-300">{patient.emergencyContact.relation}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Phone Contact:</span> <span className="text-zinc-300 font-mono">{patient.emergencyContact.phone}</span></div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 font-mono">No Emergency details logged.</p>
              )}
            </div>

            {/* Card 4: Referral source details */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase border-b border-slate-800 pb-2">
                <LinkIcon size={13} />
                <span>Referral Information</span>
              </h3>
              {patient.referrals && patient.referrals[0] ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Source Type:</span> <span className="text-zinc-300 uppercase">{patient.referrals[0].referralType}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Referred Name:</span> <span className="text-zinc-300">{patient.referrals[0].referralName}</span></div>
                  <div><span className="text-zinc-500 block mb-0.5">Notes:</span> <span className="text-zinc-300">{patient.referrals[0].referralNotes || "--"}</span></div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 font-mono">No Referral information logged.</p>
              )}
            </div>
          </div>

          {/* Remarks text block */}
          {patient.remarks && (
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-sm">
              <h4 className="text-xs font-semibold text-slate-350">Admitting Notes / Clinical Remarks</h4>
              <p className="text-xs text-zinc-300 italic">{patient.remarks}</p>
            </div>
          )}
        </div>
      </div>

      {/* TABS: Future History Placeholder Log Blocks */}
      <div className="space-y-4 border-t border-slate-800 pt-6">
        <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2 uppercase tracking-wide">
          <Calendar size={14} />
          <span>Patient Clinical History Ledger</span>
        </h3>

        {/* Tab Selection buttons */}
        <div className="flex items-center space-x-1 border-b border-slate-800 pb-1.5 select-none overflow-x-auto scrollbar-none">
          {historyTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border shrink-0 cursor-pointer ${
                activeTab === t.id
                  ? "bg-slate-800 border-slate-700 text-emerald-400"
                  : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Static Placeholder Box representing pending functional modules */}
        <div className="bg-slate-900/20 border border-slate-800/60 border-dashed p-10 rounded-2xl text-center">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h4 className="text-xs font-bold text-slate-300">
            {historyTabs.find((t) => t.id === activeTab)?.label} Logs Placeholder
          </h4>
          <p className="text-[10px] text-zinc-500 max-w-sm mx-auto mt-1 leading-relaxed">
            Clinical logs mapping will be synchronized automatically once the respective downstream module (OPD queue routing, IPD wards allocations, surgical scheduling, or billing ledger) is fully implemented.
          </p>
        </div>
      </div>

      {/* MOCK PHOTO URL DIALOG MODAL */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPhotoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-base font-bold text-slate-100 mb-2">Simulate Patient Photo Update</h3>
            <p className="text-[10px] text-zinc-400 mb-4">
              Enter an image URL reference to simulate profile uploading (Architecture only).
            </p>
            <form onSubmit={handleUpdatePhoto} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400">Photo URL</label>
                <input
                  type="text"
                  required
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg p-2.5 outline-none font-mono"
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={photoSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  {photoSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  <span>Save URL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
