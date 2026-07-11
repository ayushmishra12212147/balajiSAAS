"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PatientFormSchema, PatientFormInput } from "@/modules/patients/schemas";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Save, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Gender } from "@prisma/client";
import { DuplicateMatch } from "@/modules/patients/services/patient-service";

type QuickPatientFormProps = {
  onSuccess: (patient: { id: string; name: string; uhid: string; isRevisit?: boolean }) => void;
  onCancel?: () => void;
};

export default function QuickPatientForm({ onSuccess, onCancel }: QuickPatientFormProps) {
  const [saving, setSaving] = useState(false);
  const [useAgeInput, setUseAgeInput] = useState(true);
  const [ageYears, setAgeYears] = useState("");

  // Duplicates modal warnings
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicatesList, setDuplicatesList] = useState<DuplicateMatch[]>([]);
  const [tempPayload, setTempPayload] = useState<PatientFormInput | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PatientFormInput>({
    resolver: zodResolver(PatientFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      gender: "MALE" as Gender,
      bloodGroup: null,
      aadhaarNumber: "",
      occupation: "",
      maritalStatus: null,
      nationality: "Indian",
      remarks: "",
      photoUrl: "",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelation: "",
      referralType: "SELF",
      referralName: "Self",
      referralNotes: "",
      confirmDuplicate: false,
    },
  });

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAgeYears(val);
    if (val && !isNaN(Number(val))) {
      const birthYear = new Date().getFullYear() - Number(val);
      // Format to YYYY-MM-DD (e.g. Jan 1st of that year)
      const dobString = `${birthYear}-01-01`;
      setValue("dob", dobString as unknown as Date);
    } else {
      setValue("dob", "" as unknown as Date);
    }
  };

  const runRegistration = async (payload: PatientFormInput) => {
    setSaving(true);
    try {
      const res = await apiClient<{
        duplicateDetected: boolean;
        duplicates?: DuplicateMatch[];
        patient?: { id: string; name: string; uhid: string; isRevisit?: boolean };
      }>("/api/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.duplicateDetected && res.duplicates) {
        setDuplicatesList(res.duplicates);
        setTempPayload(payload);
        setDuplicateWarningOpen(true);
        toast.warning("Potential duplicate patient profiles detected.");
      } else if (res.patient) {
        toast.success(`Patient registered with UHID: ${res.patient.uhid}`);
        onSuccess(res.patient);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register patient.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (data: PatientFormInput) => {
    runRegistration({ ...data, confirmDuplicate: false });
  };

  const handleConfirmBypass = () => {
    if (!tempPayload) return;
    setDuplicateWarningOpen(false);
    runRegistration({ ...tempPayload, confirmDuplicate: true });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
          Quick Patient Registration
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Full Name *</label>
            <input
              type="text"
              required
              {...register("name")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
              placeholder="e.g. Ayush Mishra"
            />
            {errors.name && <p className="text-red-400 text-[10px]">{errors.name.message}</p>}
          </div>

          {/* Mobile Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Mobile Number *</label>
            <input
              type="text"
              required
              {...register("phone")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
              placeholder="10-digit number"
            />
            {errors.phone && <p className="text-red-400 text-[10px]">{errors.phone.message}</p>}
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Gender *</label>
            <select
              {...register("gender")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.gender && <p className="text-red-400 text-[10px]">{errors.gender.message}</p>}
          </div>

          {/* Age or DOB input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">
                {useAgeInput ? "Age (Years) *" : "Date of Birth *"}
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseAgeInput(!useAgeInput);
                  setAgeYears("");
                  setValue("dob", "" as unknown as Date);
                }}
                className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
              >
                Use {useAgeInput ? "Calendar" : "Age in Years"}
              </button>
            </div>
            {useAgeInput ? (
              <input
                type="number"
                min="0"
                max="125"
                required
                value={ageYears}
                onChange={handleAgeChange}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
                placeholder="Age in Years"
              />
            ) : (
              <input
                type="date"
                required
                {...register("dob")}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
              />
            )}
            {errors.dob && <p className="text-red-400 text-[10px]">{errors.dob.message}</p>}
          </div>

          {/* Aadhaar Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Aadhaar Number (Optional)</label>
            <input
              type="text"
              {...register("aadhaarNumber")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
              placeholder="12-digit number"
            />
            {errors.aadhaarNumber && (
              <p className="text-red-400 text-[10px]">{errors.aadhaarNumber.message}</p>
            )}
          </div>

          {/* Blood Group */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Blood Group (Optional)</label>
            <select
              {...register("bloodGroup")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
            >
              <option value="">Select Blood Group...</option>
              <option value="A_POSITIVE">A+</option>
              <option value="A_NEGATIVE">A-</option>
              <option value="B_POSITIVE">B+</option>
              <option value="B_NEGATIVE">B-</option>
              <option value="AB_POSITIVE">AB+</option>
              <option value="AB_NEGATIVE">AB-</option>
              <option value="O_POSITIVE">O+</option>
              <option value="O_NEGATIVE">O-</option>
            </select>
            {errors.bloodGroup && (
              <p className="text-red-400 text-[10px]">{errors.bloodGroup.message}</p>
            )}
          </div>

          {/* City / Town */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">City / Town *</label>
            <input
              type="text"
              required
              {...register("city")}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
              placeholder="City Name"
            />
            {errors.city && <p className="text-red-400 text-[10px]">{errors.city.message}</p>}
          </div>
        </div>

        {/* Address Details */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Address Line (Optional)</label>
          <input
            type="text"
            {...register("addressLine")}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none transition-all"
            placeholder="Street or area details"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs py-2 px-5 rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Register Patient</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* DUPLICATE WARNING MODAL */}
      {duplicateWarningOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setDuplicateWarningOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center space-x-2 text-amber-400 mb-3 pb-2 border-b border-slate-800">
              <AlertTriangle size={20} className="animate-pulse" />
              <h3 className="text-base font-bold text-slate-100">Potential Duplicate Profiles Found</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Similar patient records already exist in the database. Please review:
            </p>

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
                className="bg-slate-850 hover:bg-slate-800 text-zinc-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBypass}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-1 cursor-pointer font-semibold"
              >
                <CheckCircle2 size={13} className="mr-1.5" />
                <span>Confirm Bypass and Register</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {saving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center space-y-4 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs font-mono text-slate-350">Registering new patient profile, please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
}
