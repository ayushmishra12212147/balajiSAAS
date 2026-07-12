"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Building as BuildingIcon,
  Layers,
  Home,
  Bed as BedIcon,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
  DoorOpen,
  DollarSign,
} from "lucide-react";

// Types corresponding to DB models
interface BedType {
  id: string;
  roomId: string;
  bedNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
}

interface RoomType {
  id: string;
  roomNumber: string;
  roomType: string;
  chargePerDay: number;
  wardId: string;
  beds: BedType[];
}

interface WardType {
  id: string;
  name: string;
  code: string;
  floorId: string;
  rooms: RoomType[];
}

interface FloorType {
  id: string;
  name: string;
  buildingId: string;
  wards: WardType[];
}

interface BuildingType {
  id: string;
  name: string;
  code: string;
  floors: FloorType[];
}

export default function WardBedManager() {
  const [hierarchy, setHierarchy] = useState<BuildingType[]>([]);
  const [loading, setLoading] = useState(true);

  // Active selections
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");

  // Modal controls
  const [modalType, setModalType] = useState<"building" | "floor" | "ward" | "room" | "bed" | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "update">("create");
  const [activeItem, setActiveItem] = useState<any>(null); // Holds the entity being edited/parent details

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formRoomType, setFormRoomType] = useState("GENERAL_WARD"); // roomType
  const [formCharge, setFormCharge] = useState("");
  const [formBedNumber, setFormBedNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient<BuildingType[]>("/api/admin/wards?type=all");
      setHierarchy(data);

      // Pre-select first building and floor if none selected
      if (data.length > 0) {
        if (!selectedBuildingId || !data.some((b) => b.id === selectedBuildingId)) {
          setSelectedBuildingId(data[0].id);
          if (data[0].floors.length > 0) {
            setSelectedFloorId(data[0].floors[0].id);
          } else {
            setSelectedFloorId("");
          }
        } else {
          // Verify active building still has active floor
          const b = data.find((x) => x.id === selectedBuildingId);
          if (b && b.floors.length > 0 && (!selectedFloorId || !b.floors.some((f) => f.id === selectedFloorId))) {
            setSelectedFloorId(b.floors[0].id);
          }
        }
      } else {
        setSelectedBuildingId("");
        setSelectedFloorId("");
      }
    } catch {
      toast.error("Failed to load hierarchical ward structure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuildingChange = (bId: string) => {
    setSelectedBuildingId(bId);
    const b = hierarchy.find((x) => x.id === bId);
    if (b && b.floors.length > 0) {
      setSelectedFloorId(b.floors[0].id);
    } else {
      setSelectedFloorId("");
    }
  };

  // CRUD handlers
  const openModal = (
    type: "building" | "floor" | "ward" | "room" | "bed",
    mode: "create" | "update",
    item: any = null
  ) => {
    setModalType(type);
    setModalMode(mode);
    setActiveItem(item);

    // Populate forms
    if (mode === "update" && item) {
      setFormName(item.name || item.roomNumber || item.bedNumber || "");
      setFormCode(item.code || "");
      setFormRoomType(item.roomType || "GENERAL_WARD");
      setFormCharge(item.chargePerDay ? String(item.chargePerDay) : "");
      setFormBedNumber(item.bedNumber || "");
    } else {
      setFormName("");
      setFormCode("");
      setFormRoomType("GENERAL_WARD");
      setFormCharge("");
      setFormBedNumber("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let payload: Record<string, any> = { type: modalType };

      if (modalMode === "create") {
        if (modalType === "building") {
          payload.name = formName;
          payload.code = formCode;
        } else if (modalType === "floor") {
          payload.name = formName;
          payload.buildingId = selectedBuildingId;
        } else if (modalType === "ward") {
          payload.name = formName;
          payload.code = formCode;
          payload.floorId = selectedFloorId;
        } else if (modalType === "room") {
          payload.roomNumber = formName;
          payload.roomType = formRoomType;
          payload.chargePerDay = Number(formCharge);
          payload.wardId = activeItem.id; // activeItem is parent Ward
        } else if (modalType === "bed") {
          payload.roomId = activeItem.id; // activeItem is parent Room
          payload.bedNumber = formBedNumber;
        }

        await apiClient("/api/admin/wards", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`${modalType?.toUpperCase()} created successfully.`);
      } else {
        // Update
        payload.id = activeItem.id;
        if (modalType === "building") {
          payload.name = formName;
          payload.code = formCode;
        } else if (modalType === "floor") {
          payload.name = formName;
        } else if (modalType === "ward") {
          payload.name = formName;
          payload.code = formCode;
        } else if (modalType === "room") {
          payload.roomNumber = formName;
          payload.roomType = formRoomType;
          payload.chargePerDay = Number(formCharge);
        } else if (modalType === "bed") {
          payload.bedNumber = formBedNumber;
          payload.status = activeItem.status;
        }

        await apiClient("/api/admin/wards", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`${modalType?.toUpperCase()} updated successfully.`);
      }

      setModalType(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}? It will hide all child entries.`)) return;
    try {
      await apiClient(`/api/admin/wards?type=${type}&id=${id}`, {
        method: "DELETE",
      });
      toast.success(`${type.toUpperCase()} soft-deleted.`);
      loadData();
    } catch {
      toast.error("Deletion failed. It might be in clinical use.");
    }
  };

  const toggleBedStatus = async (bed: BedType) => {
    const nextStatus = bed.status === "AVAILABLE" ? "MAINTENANCE" : bed.status === "MAINTENANCE" ? "AVAILABLE" : "AVAILABLE";
    if (bed.status === "OCCUPIED") {
      toast.error("Cannot toggle status of currently occupied inpatient bed.");
      return;
    }
    try {
      await apiClient("/api/admin/wards", {
        method: "PUT",
        body: JSON.stringify({
          type: "bed",
          id: bed.id,
          bedNumber: bed.bedNumber,
          status: nextStatus,
        }),
      });
      toast.success("Bed status updated.");
      loadData();
    } catch {
      toast.error("Failed to alter bed maintenance status.");
    }
  };

  // Navigation helpers
  const activeBuilding = hierarchy.find((b) => b.id === selectedBuildingId);
  const activeFloor = activeBuilding?.floors.find((f) => f.id === selectedFloorId);

  if (loading && hierarchy.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-zinc-400 text-sm font-mono space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span>Synchronizing clinical building layouts & bed maps...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Buildings & Floors */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase">
              <BuildingIcon size={14} />
              <span>Buildings Setup</span>
            </h3>
            <button
              onClick={() => openModal("building", "create")}
              className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <Plus size={10} />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {hierarchy.map((b) => (
              <div
                key={b.id}
                onClick={() => handleBuildingChange(b.id)}
                className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  selectedBuildingId === b.id
                    ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-semibold"
                    : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <span className="truncate">{b.name} ({b.code})</span>
                <div className="flex space-x-1 shrink-0 ml-2">
                  <Edit
                    size={11}
                    className="text-slate-500 hover:text-slate-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal("building", "update", b);
                    }}
                  />
                  <Trash2
                    size={11}
                    className="text-slate-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete("building", b.id);
                    }}
                  />
                </div>
              </div>
            ))}
            {hierarchy.length === 0 && (
              <p className="text-[10px] text-zinc-500 italic text-center py-2">No buildings configured.</p>
            )}
          </div>
        </div>

        {selectedBuildingId && (
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center space-x-2 uppercase">
                <Layers size={14} />
                <span>Floors Setup</span>
              </h3>
              <button
                onClick={() => openModal("floor", "create")}
                className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Plus size={10} />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {activeBuilding?.floors.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFloorId(f.id)}
                  className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    selectedFloorId === f.id
                      ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 font-semibold"
                      : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <span className="truncate">{f.name}</span>
                  <div className="flex space-x-1 shrink-0 ml-2">
                    <Edit
                      size={11}
                      className="text-slate-500 hover:text-slate-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal("floor", "update", f);
                      }}
                    />
                    <Trash2
                      size={11}
                      className="text-slate-500 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete("floor", f.id);
                      }}
                    />
                  </div>
                </div>
              ))}
              {activeBuilding?.floors.length === 0 && (
                <p className="text-[10px] text-zinc-500 italic text-center py-2">No floors added to building.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Wards, Rooms, and Beds */}
      <div className="lg:col-span-3 space-y-6">
        {selectedFloorId ? (
          <div className="space-y-6">
            {/* Floor Header */}
            <div className="flex justify-between items-center bg-slate-900/20 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h2 className="text-sm font-bold text-slate-100">{activeBuilding?.name} • {activeFloor?.name}</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Manage wards, rooms and occupancy layouts on this floor level.</p>
              </div>
              <button
                onClick={() => openModal("ward", "create")}
                className="flex items-center space-x-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-[10px] font-semibold py-2 px-3 rounded-lg shadow cursor-pointer transition-all"
              >
                <Plus size={11} />
                <span>Add Ward Group</span>
              </button>
            </div>

            {/* Wards Lists */}
            {activeFloor?.wards.map((ward) => (
              <div key={ward.id} className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-sm shadow relative">
                {/* Ward Heading */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Home size={14} className="text-emerald-450" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">{ward.name} ({ward.code})</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] font-bold">
                    <button
                      onClick={() => openModal("room", "create", ward)}
                      className="text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus size={10} />
                      <span>Add Room</span>
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      onClick={() => openModal("ward", "update", ward)}
                      className="text-slate-450 hover:text-slate-200 cursor-pointer"
                    >
                      Edit
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      onClick={() => handleDelete("ward", ward.id)}
                      className="text-slate-450 hover:text-red-400 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ward.rooms.map((room) => (
                    <div key={room.id} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 shadow-inner hover:border-slate-800 transition-all">
                      {/* Room details */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <DoorOpen size={13} className="text-slate-400" />
                            <h4 className="text-xs font-bold text-slate-200">Room {room.roomNumber}</h4>
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{room.roomType.replace("_", " ")}</p>
                        </div>
                        <div className="flex items-center space-x-3 text-right">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-400 font-mono">₹{Number(room.chargePerDay).toFixed(0)}</span>
                            <span className="text-[8px] text-zinc-550 block">/ Day</span>
                          </div>
                          <div className="flex flex-col space-y-0.5">
                            <Edit
                              size={11}
                              className="text-slate-500 hover:text-slate-200 cursor-pointer"
                              onClick={() => openModal("room", "update", room)}
                            />
                            <Trash2
                              size={11}
                              className="text-slate-500 hover:text-red-400 cursor-pointer"
                              onClick={() => handleDelete("room", room.id)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Beds layout */}
                      <div className="border-t border-slate-900/60 pt-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-semibold text-slate-450 uppercase tracking-wider">Bed Units Layout</span>
                          <button
                            onClick={() => openModal("bed", "create", room)}
                            className="text-[9px] text-emerald-400 hover:underline flex items-center space-x-0.5 cursor-pointer font-bold"
                          >
                            <Plus size={8} />
                            <span>Add Bed</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {room.beds.map((bed) => {
                            const isAvailable = bed.status === "AVAILABLE";
                            const isOccupied = bed.status === "OCCUPIED";
                            const isMaint = bed.status === "MAINTENANCE";

                            return (
                              <div
                                key={bed.id}
                                onClick={() => toggleBedStatus(bed)}
                                className={`p-2 rounded-lg text-center cursor-pointer transition-all border flex flex-col items-center justify-center ${
                                  isAvailable
                                    ? "bg-emerald-950/10 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/20"
                                    : isOccupied
                                    ? "bg-blue-950/15 border-blue-900/30 text-blue-400 cursor-not-allowed"
                                    : "bg-amber-950/10 border-amber-900/35 text-amber-500 hover:bg-amber-950/20"
                                }`}
                                title={`${bed.bedNumber} - ${bed.status} (Click to toggle Maintenance status)`}
                              >
                                <BedIcon size={12} />
                                <span className="text-[9px] font-bold mt-1 font-mono">{bed.bedNumber}</span>
                                <Trash2
                                  size={9}
                                  className="text-slate-600 hover:text-red-400 mt-1 cursor-pointer opacity-40 hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete("bed", bed.id);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        {room.beds.length === 0 && (
                          <p className="text-[9px] text-zinc-600 italic py-1">No bed units allocated.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {ward.rooms.length === 0 && (
                  <p className="text-[10px] text-zinc-500 italic py-4 text-center">No rooms configured in this ward level.</p>
                )}
              </div>
            ))}

            {activeFloor?.wards.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl text-zinc-550 text-xs">
                <PlusCircle size={24} className="mb-2 text-slate-600" />
                <span>No inpatient wards created on this floor level yet.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl text-zinc-500 text-xs">
            <BuildingIcon size={32} className="mb-2 text-slate-700" />
            <span>Select building and floor setup from the sidebar navigator to configure ward allocations.</span>
          </div>
        )}
      </div>

      {/* POPUP MODAL */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4 capitalize">
              {modalMode} {modalType}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Conditional Inputs */}
              {(modalType === "building" || modalType === "floor" || modalType === "ward" || modalType === "room") && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">
                    {modalType === "room" ? "Room Number *" : "Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none"
                    placeholder={`e.g. ${modalType === "room" ? "Room 201" : "General Block"}`}
                  />
                </div>
              )}

              {(modalType === "building" || modalType === "ward") && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Unique Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none"
                    placeholder="e.g. BLDG-A, WARD-GEN"
                  />
                </div>
              )}

              {modalType === "room" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Category *</label>
                      <select
                        value={formRoomType}
                        onChange={(e) => setFormRoomType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none"
                      >
                        <option value="GENERAL_WARD">General Ward</option>
                        <option value="SEMI_PRIVATE">Semi Private</option>
                        <option value="PRIVATE">Private Room</option>
                        <option value="ICU">ICU</option>
                        <option value="HDU">HDU</option>
                        <option value="EMERGENCY">Emergency</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Charge Per Day (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formCharge}
                        onChange={(e) => setFormCharge(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none font-mono"
                        placeholder="2500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "bed" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Bed Code/Number *</label>
                  <input
                    type="text"
                    required
                    value={formBedNumber}
                    onChange={(e) => setFormBedNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl outline-none font-mono"
                    placeholder="e.g. Bed-1A"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center space-x-1.5 cursor-pointer font-semibold shadow"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
