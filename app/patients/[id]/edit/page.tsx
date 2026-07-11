"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PatientFormSchema, PatientFormInput } from "@/modules/patients/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Gender, BloodGroup, MaritalStatus } from "@prisma/client";
import { DuplicateMatch } from "@/modules/patients/services/patient-service";

type ServerPatientType = {
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
 * Helper to display calculated age.
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
 * EditPatientPage
 * demographic editor form. Coordinates version-checking controls.
 */
export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(1);

  // Duplicates modal warnings
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicatesList, setDuplicatesList] = useState<DuplicateMatch[]>([]);
  const [tempPayload, setTempPayload] = useState<PatientFormInput | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PatientFormInput>({
    resolver: zodResolver(PatientFormSchema),
  });

  // Watch Date of Birth to calculate age inline
  const dobVal = useWatch({ control, name: "dob" });
  const calculatedAge = dobVal ? calculateAge(String(dobVal)) : 0;

  // Watch Referral Type to autofill default self referrer
  const referralTypeVal = useWatch({ control, name: "referralType" });
  useEffect(() => {
    if (referralTypeVal === "SELF") {
      setValue("referralName", "Self");
    }
  }, [referralTypeVal, setValue]);

  useEffect(() => {
    async function loadPatient() {
      try {
        const data = await apiClient<ServerPatientType>(`/api/patients/${patientId}`);
        setVersion(data.version);
        
        // Format ISO Date to YYYY-MM-DD for form date input
        const dobFormatted = data.dob ? new Date(data.dob).toISOString().split("T")[0] : "";

        reset({
          name: data.name,
          phone: data.phone,
          alternatePhone: data.alternatePhone || "",
          email: data.email || "",
          dob: dobFormatted as unknown as Date,
          gender: data.gender as Gender,
          bloodGroup: data.bloodGroup as BloodGroup | null,
          aadhaarNumber: data.aadhaarNumber || "",
          occupation: data.occupation || "",
          maritalStatus: data.maritalStatus as MaritalStatus | null,
          nationality: data.nationality || "Indian",
          remarks: data.remarks || "",
          photoUrl: data.photoUrl || "",
          addressLine: data.address?.addressLine || "",
          city: data.address?.city || "",
          state: data.address?.state || "",
          pincode: data.address?.pincode || "",
          emergencyContactName: data.emergencyContact?.name || "",
          emergencyContactPhone: data.emergencyContact?.phone || "",
          emergencyContactRelation: data.emergencyContact?.relation || "",
          referralType: data.referrals?.[0]?.referralType || "SELF",
          referralName: data.referrals?.[0]?.referralName || "Self",
          referralNotes: data.referrals?.[0]?.referralNotes || "",
          confirmDuplicate: false,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load patient card details.";
        toast.error(msg);
        router.push("/patients");
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [patientId, reset, router]);

  const runUpdate = async (payload: PatientFormInput) => {
    setSaving(true);
    try {
      const res = await apiClient<{
        duplicateDetected: boolean;
        duplicates?: DuplicateMatch[];
        patient?: { id: string; name: string; version: number };
      }>(`/api/patients/${patientId}`, {
        method: "PUT",
        body: JSON.stringify({ ...payload, version }),
      });

      if (res.duplicateDetected && res.duplicates) {
        // Halt and display warnings matches
        setDuplicatesList(res.duplicates);
        setTempPayload(payload);
        setDuplicateWarningOpen(true);
        toast.warning("Possible duplicate records match updated parameters.");
      } else {
        toast.success("Demographic parameters updated successfully.");
        router.push(`/patients/${patientId}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save updates.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (data: PatientFormInput) => {
    runUpdate({ ...data, confirmDuplicate: false });
  };

  const handleConfirmBypass = () => {
    if (!tempPayload) return;
    setDuplicateWarningOpen(false);
    runUpdate({ ...tempPayload, confirmDuplicate: true });
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-400 text-sm font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mr-3" />
        <span>Loading Patient Demographic Form...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header and Back Link */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
        <Link
          href={`/patients/${patientId}`}
          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Edit Demographics</h1>
          <p className="text-xs text-slate-400">Update demographic cards for current record</p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Personal Demographic Details */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            1. Personal Demographics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Full Name *</label>
              <input
                type="text"
                {...register("name")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
              {errors.name && <p className="text-red-400 text-[10px]">{errors.name.message}</p>}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Mobile Number *</label>
              <input
                type="text"
                {...register("phone")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
              {errors.phone && <p className="text-red-400 text-[10px]">{errors.phone.message}</p>}
            </div>

            {/* Alternate Mobile */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Alternate Mobile</label>
              <input
                type="text"
                {...register("alternatePhone")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
              {errors.alternatePhone && (
                <p className="text-red-400 text-[10px]">{errors.alternatePhone.message}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Date of Birth *</label>
              <input
                type="date"
                {...register("dob")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
              {errors.dob && <p className="text-red-400 text-[10px]">{errors.dob.message}</p>}
            </div>

            {/* Age display (read-only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Calculated Age</label>
              <div className="w-full bg-slate-950/40 border border-slate-800 text-slate-400 text-xs rounded-xl px-4 py-2.5 font-mono select-none">
                {calculatedAge > 0 ? `${calculatedAge} Years` : "Enter Date of Birth"}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Gender *</label>
              <select
                {...register("gender")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && <p className="text-red-400 text-[10px]">{errors.gender.message}</p>}
            </div>

            {/* Aadhaar Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Aadhaar Number</label>
              <input
                type="text"
                {...register("aadhaarNumber")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
              {errors.aadhaarNumber && (
                <p className="text-red-400 text-[10px]">{errors.aadhaarNumber.message}</p>
              )}
            </div>

            {/* Blood Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Blood Group</label>
              <select
                {...register("bloodGroup")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              >
                <option value="">Unknown</option>
                {Object.values(BloodGroup).map((bg) => (
                  <option key={bg} value={bg}>
                    {bg.replace("_POSITIVE", "+").replace("_NEGATIVE", "-")}
                  </option>
                ))}
              </select>
            </div>

            {/* Marital Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Marital Status</label>
              <select
                {...register("maritalStatus")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              >
                <option value="">Select...</option>
                {Object.values(MaritalStatus).map((ms) => (
                  <option key={ms} value={ms}>
                    {ms.charAt(0) + ms.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <input
                type="email"
                {...register("email")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
              {errors.email && <p className="text-red-400 text-[10px]">{errors.email.message}</p>}
            </div>

            {/* Occupation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Occupation</label>
              <input
                type="text"
                {...register("occupation")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
            </div>

            {/* Nationality */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Nationality</label>
              <input
                type="text"
                {...register("nationality")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Address Details */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            2. Permanent Address Details
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Address Details *</label>
              <input
                type="text"
                {...register("addressLine")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
              />
              {errors.addressLine && <p className="text-red-400 text-[10px]">{errors.addressLine.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">City / Town *</label>
                <input
                  type="text"
                  {...register("city")}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
                />
                {errors.city && <p className="text-red-400 text-[10px]">{errors.city.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">State *</label>
                <input
                  type="text"
                  {...register("state")}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
                />
                {errors.state && <p className="text-red-400 text-[10px]">{errors.state.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Pincode *</label>
                <input
                  type="text"
                  {...register("pincode")}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
                />
                {errors.pincode && <p className="text-red-400 text-[10px]">{errors.pincode.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contact */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            3. Emergency Contact Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Contact Person Name *</label>
              <input
                type="text"
                {...register("emergencyContactName")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
              />
              {errors.emergencyContactName && (
                <p className="text-red-400 text-[10px]">{errors.emergencyContactName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Emergency Phone *</label>
              <input
                type="text"
                {...register("emergencyContactPhone")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
              />
              {errors.emergencyContactPhone && (
                <p className="text-red-400 text-[10px]">{errors.emergencyContactPhone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Relationship *</label>
              <input
                type="text"
                {...register("emergencyContactRelation")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
              />
              {errors.emergencyContactRelation && (
                <p className="text-red-400 text-[10px]">{errors.emergencyContactRelation.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Referral Info */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            4. Referral Source
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Referral Type</label>
              <select
                {...register("referralType")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
              >
                <option value="SELF">Self / Walk-in</option>
                <option value="DOCTOR">Referred by Doctor</option>
                <option value="CLINIC">Referred by Clinic</option>
                <option value="HOSPITAL">Referred by Hospital</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Referral Name</label>
              <input
                type="text"
                disabled={referralTypeVal === "SELF"}
                {...register("referralName")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Referral Notes</label>
              <input
                type="text"
                {...register("referralNotes")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Remarks & Photos */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            5. Additional Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Profile Photo URL (Mock Upload)</label>
              <input
                type="text"
                {...register("photoUrl")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Remarks / History Notes</label>
              <input
                type="text"
                {...register("remarks")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
          <Link
            href={`/patients/${patientId}`}
            className="flex items-center justify-center bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Cancel Changes
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-sm py-2.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer animate-pulse-once"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Edits...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Demographics Updates</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* DUPLICATE WARNING MODAL DIALOG BOX */}
      {duplicateWarningOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setDuplicateWarningOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center space-x-2 text-amber-400 mb-3 pb-2 border-b border-slate-800">
              <AlertTriangle size={20} className="animate-pulse" />
              <h3 className="text-base font-bold text-slate-100">Potential Duplicate Patient Profiles Found</h3>
            </div>
            
            <p className="text-xs text-slate-400 mb-4">
              Updating these fields matches other patients in the registry. Review details:
            </p>

            {/* List matches */}
            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/80 mb-5 bg-slate-950/20">
              {duplicatesList.map((dup, index) => (
                <div key={index} className="p-3 text-xs flex justify-between items-center hover:bg-slate-900/40">
                  <div>
                    <h4 className="font-semibold text-slate-200">{dup.patient.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      UHID: {dup.patient.uhid} | Phone: {dup.patient.phone}
                    </p>
                  </div>
                  <span className="bg-amber-950/30 text-amber-400 border border-amber-800/30 text-[9px] font-mono px-2 py-0.5 rounded-md">
                    {dup.reason}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDuplicateWarningOpen(false)}
                className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Cancel Edits
              </button>
              <button
                type="button"
                onClick={handleConfirmBypass}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold"
              >
                <CheckCircle2 size={13} className="mr-1.5" />
                <span>Confirm Bypass and Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
