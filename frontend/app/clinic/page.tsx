"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope,
  Calendar,
  Users,
  Clock,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  DollarSign,
  Tag,
  Code2,
  Copy,
  Check,
  CalendarCheck,
  Trash2,
  Ban,
  Power,
  Pencil,
  ChevronDown,
  ChevronUp,
  UserX,
  UserCheck,
  CalendarX,
  Layers,
  X,
  ExternalLink,
  Eye,
  User,
  FileText,
  KeyRound,
  Lock,
  Menu,
  Shield,
  MessageSquare,
} from "lucide-react";
import WhatsAppConnectCard from "@/src/components/WhatsAppConnectCard";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAuth,
  clearAuth,
  getClinicDoctors,
  createClinicDoctor,
  updateClinicDoctor,
  toggleDoctorAvailabilityToday,
  getClinicSlots,
  createClinicSlots,
  deleteClinicSlot,
  toggleSlotDisabled,
  manualBookClinicSlot,
  manualUnbookClinicSlot,
  getClinicAppointments,
  getProfile,
  changePassword,
  Doctor,
  DoctorSlot,
  ClinicAppointment,
  API_BASE,
} from "@/lib/api";

const DAYS_OF_WEEK = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export default function ClinicDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"appointments" | "doctors" | "slots" | "whatsapp" | "widget" | "security">("appointments");
  const [tenantName, setTenantName] = useState<string>("Clinic");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Clinic Profile & Widget State
  const [clinicProfile, setClinicProfile] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Change Password State
  const [changePasswordCurrent, setChangePasswordCurrent] = useState("");
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Data State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Doctor Form State
  const [docName, setDocName] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("");
  const [docSymptoms, setDocSymptoms] = useState("");
  const [docFee, setDocFee] = useState<number>(50);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [doctorSuccessMsg, setDoctorSuccessMsg] = useState<string | null>(null);

  // Single Slot Creator Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [slotStartTime, setSlotStartTime] = useState("09:00");
  const [slotEndTime, setSlotEndTime] = useState("09:30");
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [slotSuccessMsg, setSlotSuccessMsg] = useState<string | null>(null);

  // Bulk Slot Creator Form State
  const [bulkDoctorId, setBulkDoctorId] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bulkEndDate, setBulkEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 6);
    return nextWeek.toISOString().split("T")[0];
  });
  const [bulkStartTime, setBulkStartTime] = useState("09:00");
  const [bulkEndTime, setBulkEndTime] = useState("17:00");
  const [hasBreak, setHasBreak] = useState(true);
  const [breakStartTime, setBreakStartTime] = useState("13:00");
  const [breakEndTime, setBreakEndTime] = useState("14:00");
  const [slotInterval, setSlotInterval] = useState<number>(15);
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [creatingBulkSlots, setCreatingBulkSlots] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // Filters
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [slotDoctorFilter, setSlotDoctorFilter] = useState("");

  // Doctor Details Modal State
  const [selectedDoctorModal, setSelectedDoctorModal] = useState<Doctor | null>(null);
  const [isEditingDoctor, setIsEditingDoctor] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editFee, setEditFee] = useState(50);
  const [editSymptoms, setEditSymptoms] = useState("");
  const [isSlotsCollapsed, setIsSlotsCollapsed] = useState(true);
  const [updatingDoctor, setUpdatingDoctor] = useState(false);

  // Manual Booking Modal State
  const [bookingSlotModal, setBookingSlotModal] = useState<DoctorSlot | null>(null);
  const [bookPatientName, setBookPatientName] = useState("");
  const [bookPatientPhone, setBookPatientPhone] = useState("");
  const [bookSymptoms, setBookSymptoms] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingModalError, setBookingModalError] = useState<string | null>(null);

  // Appointment Details Modal State
  const [selectedAppointmentModal, setSelectedAppointmentModal] = useState<ClinicAppointment | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Auth Guard
  useEffect(() => {
    const auth = getAuth();
    if (!auth.token) {
      router.push("/login");
      return;
    }
    if (auth.business_type && auth.business_type !== "clinic") {
      router.push("/restaurant");
      return;
    }
    if (auth.name) {
      setTenantName(auth.name);
    }
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [docsData, slotsData, apptsData, profData] = await Promise.all([
        getClinicDoctors(),
        getClinicSlots(),
        getClinicAppointments(),
        getProfile().catch(() => null),
      ]);
      setDoctors(docsData);
      setSlots(slotsData);
      setAppointments(apptsData);
      if (profData) {
        setClinicProfile(profData);
        if (profData.name) setTenantName(profData.name);
      }
      if (docsData.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docsData[0].id);
        setBulkDoctorId(docsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load clinic dashboard records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);
    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordError("New password and confirm password do not match.");
      return;
    }
    if (changePasswordNew.length < 6) {
      setChangePasswordError("New password must be at least 6 characters.");
      return;
    }
    setChangePasswordLoading(true);
    try {
      await changePassword(changePasswordCurrent, changePasswordNew);
      setChangePasswordSuccess("Password successfully changed!");
      setChangePasswordCurrent("");
      setChangePasswordNew("");
      setChangePasswordConfirm("");
    } catch (err: any) {
      setChangePasswordError(err.message || "Failed to update password.");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  // Add Doctor Handler
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingDoctor(true);
    setDoctorSuccessMsg(null);
    setError(null);

    const symptomsList = docSymptoms
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const newDoc = await createClinicDoctor({
        name: docName.trim(),
        specialty: docSpecialty.trim(),
        symptoms_treated: symptomsList,
        fee: Number(docFee),
      });
      setDoctors((prev) => [...prev, newDoc]);
      setDoctorSuccessMsg(`Dr. ${newDoc.name} registered successfully!`);
      setDocName("");
      setDocSpecialty("");
      setDocSymptoms("");
      setDocFee(50);
      if (!selectedDoctorId) setSelectedDoctorId(newDoc.id);
      if (!bulkDoctorId) setBulkDoctorId(newDoc.id);
    } catch (err: any) {
      setError(err.message || "Could not register doctor.");
    } finally {
      setCreatingDoctor(false);
    }
  };

  // Single Slot Creation
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setError("Please select a doctor to add an appointment slot.");
      return;
    }
    setCreatingSlot(true);
    setSlotSuccessMsg(null);
    setError(null);

    try {
      const formattedStart = slotStartTime.length === 5 ? `${slotStartTime}:00` : slotStartTime;
      const formattedEnd = slotEndTime.length === 5 ? `${slotEndTime}:00` : slotEndTime;

      const created = await createClinicSlots([
        {
          doctor_id: selectedDoctorId,
          slot_date: slotDate,
          start_time: formattedStart,
          end_time: formattedEnd,
        },
      ]);
      setSlots((prev) => [...created, ...prev]);
      setSlotSuccessMsg("Appointment slot created successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to create slot.");
    } finally {
      setCreatingSlot(false);
    }
  };

  // Bulk Slot Creation
  const handleCreateBulkSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = bulkDoctorId || selectedDoctorId;
    if (!docId) {
      setError("Please select a doctor for bulk slot creation.");
      return;
    }
    if (bulkStartDate > bulkEndDate) {
      setError("Start Date cannot be later than End Date.");
      return;
    }
    if (bulkDays.length === 0) {
      setError("Please select at least one day of the week.");
      return;
    }
    if (bulkStartTime >= bulkEndTime) {
      setError("Start Time must be earlier than End Time.");
      return;
    }
    if (hasBreak && breakStartTime >= breakEndTime) {
      setError("Break Start Time must be earlier than Break End Time.");
      return;
    }

    setCreatingBulkSlots(true);
    setBulkSuccessMsg(null);
    setError(null);

    try {
      const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const fromMinutes = (m: number) => {
        const h = String(Math.floor(m / 60)).padStart(2, "0");
        const min = String(m % 60).padStart(2, "0");
        return `${h}:${min}:00`;
      };

      const startM = toMinutes(bulkStartTime);
      const endM = toMinutes(bulkEndTime);
      const breakStartM = hasBreak ? toMinutes(breakStartTime) : -1;
      const breakEndM = hasBreak ? toMinutes(breakEndTime) : -1;

      const slotsToCreate: { doctor_id: string; slot_date: string; start_time: string; end_time: string }[] = [];

      const start = new Date(bulkStartDate + "T00:00:00");
      const end = new Date(bulkEndDate + "T00:00:00");

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (!bulkDays.includes(dayOfWeek)) continue;

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        for (let cur = startM; cur + slotInterval <= endM; cur += slotInterval) {
          const next = cur + slotInterval;
          // Check break overlap
          if (hasBreak && Math.max(cur, breakStartM) < Math.min(next, breakEndM)) {
            continue; // Skip slot inside break window
          }

          slotsToCreate.push({
            doctor_id: docId,
            slot_date: dateStr,
            start_time: fromMinutes(cur),
            end_time: fromMinutes(next),
          });
        }
      }

      if (slotsToCreate.length === 0) {
        setError("No slots match the specified hours, intervals, and weekdays.");
        setCreatingBulkSlots(false);
        return;
      }

      const created = await createClinicSlots(slotsToCreate);
      setSlots((prev) => [...created, ...prev]);
      setBulkSuccessMsg(`Successfully created ${created.length} slots across the selected date range!`);
    } catch (err: any) {
      setError(err.message || "Failed to generate bulk slots.");
    } finally {
      setCreatingBulkSlots(false);
    }
  };

  // Toggle Day Checkbox for Bulk Generation
  const toggleBulkDay = (dayVal: number) => {
    setBulkDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal]
    );
  };

  // Delete Slot Handler
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this time slot?")) return;
    try {
      await deleteClinicSlot(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: any) {
      alert(err.message || "Failed to delete slot.");
    }
  };

  // Toggle Slot Disabled Handler
  const handleToggleSlotDisabled = async (slotId: string) => {
    try {
      const updated = await toggleSlotDisabled(slotId);
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, is_disabled: updated.is_disabled } : s))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update slot status.");
    }
  };

  // Open Manual Booking Modal
  const handleOpenBookModal = (slot: DoctorSlot) => {
    setBookingSlotModal(slot);
    setBookPatientName("");
    setBookPatientPhone("");
    setBookSymptoms("");
    setBookingModalError(null);
  };

  // Submit Manual Booking
  const handleSubmitManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlotModal) return;
    if (!bookPatientName.trim() || !bookPatientPhone.trim()) {
      setBookingModalError("Patient name and phone number are required.");
      return;
    }
    setIsSubmittingBooking(true);
    setBookingModalError(null);
    try {
      const updatedSlot = await manualBookClinicSlot(bookingSlotModal.id, {
        patient_name: bookPatientName.trim(),
        patient_phone: bookPatientPhone.trim(),
        symptoms_reported: bookSymptoms.trim() || undefined,
      });
      setSlots((prev) => prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)));
      const appts = await getClinicAppointments();
      setAppointments(appts);
      setBookingSlotModal(null);
      setSlotSuccessMsg("Appointment booked manually successfully!");
    } catch (err: any) {
      setBookingModalError(err.message || "Failed to book slot.");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Manual Unbook Slot
  const handleUnbookSlot = async (slotId: string) => {
    const linkedAppt = appointments.find((a) => a.slot_id === slotId);
    const confirmMsg = linkedAppt
      ? `Unbook slot for ${linkedAppt.patient_name} (${linkedAppt.patient_phone})?\n\nThis will cancel the appointment and open up the slot for new bookings.`
      : "Are you sure you want to unbook this slot? This will cancel the associated appointment.";
    if (!confirm(confirmMsg)) return;

    try {
      const updatedSlot = await manualUnbookClinicSlot(slotId);
      setSlots((prev) => prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)));
      const appts = await getClinicAppointments();
      setAppointments(appts);
      setSlotSuccessMsg("Slot has been unbooked and opened up for new bookings.");
    } catch (err: any) {
      alert(err.message || "Failed to unbook slot.");
    }
  };

  // Open Doctor Modal
  const handleOpenDoctorModal = (doc: Doctor) => {
    setSelectedDoctorModal(doc);
    setEditName(doc.name);
    setEditSpecialty(doc.specialty);
    setEditFee(doc.fee);
    setEditSymptoms((doc.symptoms_treated || []).join(", "));
    setIsEditingDoctor(false);
    setIsSlotsCollapsed(true);
  };

  // Toggle Doctor Availability Today
  const handleToggleAvailabilityToday = async (docId: string) => {
    try {
      const updated = await toggleDoctorAvailabilityToday(docId);
      setDoctors((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      if (selectedDoctorModal && selectedDoctorModal.id === docId) {
        setSelectedDoctorModal(updated);
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle doctor availability.");
    }
  };

  // Save Doctor Edit Changes
  const handleSaveDoctorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorModal) return;
    setUpdatingDoctor(true);

    const symptomsList = editSymptoms
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const updated = await updateClinicDoctor(selectedDoctorModal.id, {
        name: editName.trim(),
        specialty: editSpecialty.trim(),
        fee: Number(editFee),
        symptoms_treated: symptomsList,
      });

      setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setSelectedDoctorModal(updated);
      setIsEditingDoctor(false);
    } catch (err: any) {
      alert(err.message || "Failed to update doctor details.");
    } finally {
      setUpdatingDoctor(false);
    }
  };

  // Doctor ID to Name lookup
  const getDoctorName = (id: string) => {
    const found = doctors.find((d) => d.id === id);
    return found ? found.name : "Physician";
  };

  const filteredAppointments = appointments.filter((a) => {
    const query = appointmentSearch.toLowerCase();
    const doc = getDoctorName(a.doctor_id).toLowerCase();
    return (
      a.patient_name.toLowerCase().includes(query) ||
      a.patient_phone.includes(query) ||
      doc.includes(query) ||
      (a.symptoms_reported && a.symptoms_reported.toLowerCase().includes(query))
    );
  });

  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      if (!slotDoctorFilter) return true;
      return s.doctor_id === slotDoctorFilter;
    });
  }, [slots, slotDoctorFilter]);

  const modalDoctorSlots = useMemo(() => {
    if (!selectedDoctorModal) return [];
    return slots.filter((s) => s.doctor_id === selectedDoctorModal.id);
  }, [slots, selectedDoctorModal]);

  const modalAppointmentSlot = useMemo(() => {
    if (!selectedAppointmentModal) return null;
    return slots.find((s) => s.id === selectedAppointmentModal.slot_id) || null;
  }, [slots, selectedAppointmentModal]);

  const modalAppointmentDoctor = useMemo(() => {
    if (!selectedAppointmentModal) return null;
    return doctors.find((d) => d.id === selectedAppointmentModal.doctor_id) || null;
  }, [doctors, selectedAppointmentModal]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#070b14] text-slate-100">
      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#0a0f1d] border-r border-emerald-500/10 flex flex-col shrink-0 z-30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
              <div className="w-full h-full bg-[#070b14] rounded-xl flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block truncate max-w-[150px]">
                {tenantName}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                Clinic Portal
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className={`p-3 space-y-1.5 flex-1 ${isMobileMenuOpen ? "block" : "hidden md:block"}`}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("appointments");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "appointments"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="w-4 h-4" />
              <span>Appointments</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {appointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("doctors");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "doctors"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Doctor Roster</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {doctors.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("slots");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "slots"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>Slot Management</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
              {slots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("whatsapp");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Automation</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("widget");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "widget"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Code2 className="w-4 h-4" />
              <span>AI Widget & Embed</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                clinicProfile?.is_widget_enabled !== false ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("security");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block truncate max-w-[110px]">
                  {tenantName}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Online</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout from Clinic"
              className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-emerald-500/10 glass-panel px-6 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-base font-bold text-white capitalize">
              {activeTab === "appointments" && "Appointments Feed"}
              {activeTab === "doctors" && "Physician Roster & Schedules"}
              {activeTab === "slots" && "Consultation Slot Management"}
              {activeTab === "whatsapp" && "WhatsApp Automation & QR Setup"}
              {activeTab === "widget" && "AI Receptionist Web Widget"}
              {activeTab === "security" && "Clinic Account Security"}
            </h1>
            <p className="text-[11px] text-slate-400">
              Manage patient bookings, physician roster, and embed settings
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {clinicProfile && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  clinicProfile.is_widget_enabled !== false
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    clinicProfile.is_widget_enabled !== false ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                {clinicProfile.is_widget_enabled !== false ? "AI Receptionist Active" : "Widget Disabled"}
              </span>
            )}
            <ThemeToggle />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="m-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 max-w-7xl w-full">

      {/* Tab 1: Appointments Feed */}
      {activeTab === "appointments" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Live Patient Bookings</h2>
              <p className="text-xs text-slate-400">Captured in real-time by the bilingual AI receptionist</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={appointmentSearch}
                onChange={(e) => setAppointmentSearch(e.target.value)}
                placeholder="Search patient, phone, symptoms..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading appointment records...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No appointments found. When patients book via the AI chat widget, they appear here instantly.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Patient Name</th>
                      <th className="px-5 py-3 font-semibold">Contact Phone</th>
                      <th className="px-5 py-3 font-semibold">Assigned Doctor</th>
                      <th className="px-5 py-3 font-semibold">Scheduled Slot</th>
                      <th className="px-5 py-3 font-semibold">Reported Symptoms</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredAppointments.map((app) => {
                      const linkedSlot = slots.find((s) => s.id === app.slot_id);
                      return (
                        <tr
                          key={app.id}
                          onClick={() => setSelectedAppointmentModal(app)}
                          className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                          title="Click to view full appointment, doctor, and slot details"
                        >
                          <td className="px-5 py-3.5 text-white font-semibold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold group-hover:bg-emerald-500/20 transition-colors">
                              {app.patient_name[0]?.toUpperCase()}
                            </div>
                            <span className="group-hover:text-emerald-300 transition-colors">{app.patient_name}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-300">
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {app.patient_phone}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-cyan-300 font-semibold">{getDoctorName(app.doctor_id)}</td>
                          <td className="px-5 py-3.5">
                            {linkedSlot ? (
                              <div className="flex flex-col text-[11px] font-mono">
                                <span className="text-white font-semibold">{linkedSlot.slot_date}</span>
                                <span className="text-slate-400">
                                  {linkedSlot.start_time.slice(0, 5)} – {linkedSlot.end_time.slice(0, 5)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Slot #{app.slot_id.slice(0, 8)}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate">
                            {app.symptoms_reported ? (
                              <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60">
                                {app.symptoms_reported}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">General Consultation</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Confirmed
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppointmentModal(app);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
                                title="View Appointment Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Doctors Management */}
      {activeTab === "doctors" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Doctor Form */}
          <div className="lg:col-span-5">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Doctor to Clinic</span>
              </h2>
              <p className="text-xs text-slate-400 mb-5">Doctors will be recommended by AI based on treated symptoms.</p>

              {doctorSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{doctorSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateDoctor} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Doctor Full Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Specialty</label>
                  <input
                    type="text"
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, Pediatrics, General Medicine"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Symptoms Treated (Comma-separated)</label>
                  <input
                    type="text"
                    value={docSymptoms}
                    onChange={(e) => setDocSymptoms(e.target.value)}
                    placeholder="e.g. chest pain, hypertension, shortness of breath"
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Consultation Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={docFee}
                    onChange={(e) => setDocFee(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingDoctor}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {creatingDoctor ? "Registering..." : "Add Doctor"}
                </button>
              </form>
            </div>
          </div>

          {/* Doctors List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Active Physicians ({doctors.length})</h2>
              <span className="text-[11px] text-slate-400">Click any card to view details, edit, or set availability</span>
            </div>

            {doctors.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl text-center text-slate-500 text-xs">
                No doctors registered yet. Add your first clinic doctor using the form.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {doctors.map((doc) => {
                  const isAvailable = doc.is_available_today !== false;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenDoctorModal(doc)}
                      className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {doc.name}
                            </h3>
                          </div>
                          <span className="text-xs text-emerald-400 font-medium">{doc.specialty}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-900 text-slate-200 border border-slate-700">
                            ${doc.fee}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                              isAvailable
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {isAvailable ? "Available Today" : "Unavailable Today"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                          Symptoms Treated
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {doc.symptoms_treated && doc.symptoms_treated.length > 0 ? (
                            doc.symptoms_treated.map((sym, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/60"
                              >
                                {sym}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">General practice</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Slot Creator & Schedule */}
      {activeTab === "slots" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Single Slot + Bulk Slot Creators */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Single Time Slot Creator */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Create Single Time Slot</span>
              </h2>
              <p className="text-xs text-slate-400 mb-5">Open an individual slot for a specific date and time.</p>

              {slotSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{slotSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Doctor</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      setBulkDoctorId(e.target.value);
                    }}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {doctors.length === 0 && <option value="">No doctors available</option>}
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Slot Date</label>
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                    <input
                      type="time"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingSlot || doctors.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {creatingSlot ? "Creating Slot..." : "Add Single Slot"}
                </button>
              </form>
            </div>

            {/* 2. Bulk Slot Generator */}
            <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 glow-blue">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">Bulk Slot Generator</h2>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                Generate recurrent schedule windows across date ranges, intervals, and optional lunch breaks.
              </p>

              {bulkSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateBulkSlots} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Doctor</label>
                  <select
                    value={bulkDoctorId}
                    onChange={(e) => setBulkDoctorId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {doctors.length === 0 && <option value="">No doctors available</option>}
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                    <input
                      type="date"
                      value={bulkEndDate}
                      onChange={(e) => setBulkEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Weekday Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Days to Include</label>
                    <button
                      type="button"
                      onClick={() =>
                        setBulkDays(bulkDays.length === 7 ? [] : [1, 2, 3, 4, 5, 6, 0])
                      }
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {bulkDays.length === 7 ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    {DAYS_OF_WEEK.map((day) => {
                      const isChecked = bulkDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleBulkDay(day.value)}
                          className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                            isChecked
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-800/60 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Operating Hours Window */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time (e.g. 09:00)</label>
                    <input
                      type="time"
                      value={bulkStartTime}
                      onChange={(e) => setBulkStartTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">End Time (e.g. 17:00)</label>
                    <input
                      type="time"
                      value={bulkEndTime}
                      onChange={(e) => setBulkEndTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Slot Interval */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Slot Interval (Minutes)</label>
                  <select
                    value={slotInterval}
                    onChange={(e) => setSlotInterval(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value={15}>15 Minutes per Slot</option>
                    <option value={20}>20 Minutes per Slot</option>
                    <option value={30}>30 Minutes per Slot</option>
                    <option value={45}>45 Minutes per Slot</option>
                    <option value={60}>60 Minutes per Slot (1 hour)</option>
                  </select>
                </div>

                {/* Optional Break Window */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={hasBreak}
                      onChange={(e) => setHasBreak(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Exclude Lunch / Break Window (Optional)</span>
                  </label>

                  {hasBreak && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Break Start (e.g. 13:00)</label>
                        <input
                          type="time"
                          value={breakStartTime}
                          onChange={(e) => setBreakStartTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Break End (e.g. 14:00)</label>
                        <input
                          type="time"
                          value={breakEndTime}
                          onChange={(e) => setBreakEndTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={creatingBulkSlots || doctors.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{creatingBulkSlots ? "Generating Slots..." : "Generate & Add Bulk Slots"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Slots Table */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white">Configured Slots ({filteredSlots.length})</h2>
              <div className="w-full sm:w-56">
                <select
                  value={slotDoctorFilter}
                  onChange={(e) => setSlotDoctorFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              {filteredSlots.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No slots found. Create new slots for your doctors using the single or bulk creator on the left.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[700px]">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Doctor</th>
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-5 py-3 font-semibold">Window</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredSlots.map((slot) => {
                        const isDisabled = slot.is_disabled === true;
                        const linkedAppt = appointments.find((a) => a.slot_id === slot.id);
                        return (
                          <tr
                            key={slot.id}
                            className={`transition-colors ${
                              isDisabled
                                ? "bg-slate-950/40 text-slate-500 opacity-70"
                                : "hover:bg-slate-800/40"
                            }`}
                          >
                            <td className="px-5 py-3.5 text-white font-semibold">{getDoctorName(slot.doctor_id)}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-300">{slot.slot_date}</td>
                            <td className="px-5 py-3.5 font-mono text-slate-400">
                              {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                            </td>
                            <td className="px-5 py-3.5">
                              {isDisabled ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  <Ban className="w-3 h-3 text-slate-500" />
                                  Disabled
                                </span>
                              ) : slot.is_booked ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                                    Booked
                                  </span>
                                  {linkedAppt && (
                                    <span
                                      className="text-[11px] text-slate-300 truncate max-w-[150px]"
                                      title={`${linkedAppt.patient_name} (${linkedAppt.patient_phone})`}
                                    >
                                      {linkedAppt.patient_name}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Available
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {slot.is_booked ? (
                                  <button
                                    onClick={() => handleUnbookSlot(slot.id)}
                                    title={
                                      linkedAppt
                                        ? `Unbook Slot (Booked by: ${linkedAppt.patient_name})`
                                        : "Unbook Slot (Cancel Appointment)"
                                    }
                                    className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 transition-all cursor-pointer"
                                  >
                                    <CalendarX className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenBookModal(slot)}
                                    disabled={isDisabled}
                                    title={isDisabled ? "Cannot book disabled slot" : "Manually Book Slot"}
                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    <CalendarCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleSlotDisabled(slot.id)}
                                  title={isDisabled ? "Enable Slot" : "Disable Slot"}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isDisabled
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700"
                                  }`}
                                >
                                  {isDisabled ? <Power className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  title="Delete Slot"
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: WhatsApp Automation (WAHA QR Connect) */}
        {activeTab === "whatsapp" && (
          <div className="max-w-4xl space-y-6">
            <WhatsAppConnectCard />
          </div>
        )}

        {/* Tab 4: AI Receptionist Widget */}
        {activeTab === "widget" && (
          <div className="max-w-3xl space-y-6">
            <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-emerald-500/20 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">AI Voice Receptionist Widget</h2>
                  <p className="text-xs text-slate-400">
                    Embed this zero-dependency widget onto your clinic website or landing page.
                  </p>
                </div>
              </div>

              {/* Status Alert */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  clinicProfile?.is_widget_enabled !== false
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      clinicProfile?.is_widget_enabled !== false ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <span>
                    {clinicProfile?.is_widget_enabled !== false
                      ? "Your AI receptionist widget is LIVE and actively accepting patient chats and voice bookings."
                      : "Your AI widget has been disabled by administrator. Contact your platform admin to re-enable."}
                  </span>
                </div>
              </div>

              {/* Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Clinic Unique Widget Token (x-widget-token)
                </label>
                <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400">
                  <span className="flex-1 truncate">{clinicProfile?.widget_token || "Loading token..."}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (clinicProfile?.widget_token) {
                        navigator.clipboard.writeText(clinicProfile.widget_token);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Script Tag Snippet */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  HTML Embed Code Snippet
                </label>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 break-all flex items-center justify-between gap-3">
                  <span>
                    {clinicProfile?.widget_token
                      ? `<script src="${API_BASE}/static/widget.js" data-token="${clinicProfile.widget_token}" defer></script>`
                      : "Loading snippet..."}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (clinicProfile?.widget_token) {
                        navigator.clipboard.writeText(
                          `<script src="${API_BASE}/static/widget.js" data-token="${clinicProfile.widget_token}" defer></script>`
                        );
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Paste this script tag into the <code>&lt;head&gt;</code> or bottom of the <code>&lt;body&gt;</code> of your website.
                </p>
              </div>

              {/* Test Link Button */}
              <div className="pt-2">
                <a
                  href={`${API_BASE}/static/test_widget.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Live Web Widget</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Account Security / Change Password */}
        {activeTab === "security" && (
          <div className="max-w-md space-y-6">
            <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-emerald-500/20 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Change Account Password</h2>
                  <p className="text-xs text-slate-400">Update your clinic dashboard access password.</p>
                </div>
              </div>

              {changePasswordSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{changePasswordSuccess}</span>
                </div>
              )}

              {changePasswordError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={changePasswordCurrent}
                    onChange={(e) => setChangePasswordCurrent(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={changePasswordNew}
                    onChange={(e) => setChangePasswordNew(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm New Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={changePasswordConfirm}
                    onChange={(e) => setChangePasswordConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {changePasswordLoading ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* ==================== DOCTOR DETAILS MODAL ==================== */}
      {selectedDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl p-6 sm:p-7 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedDoctorModal.name}</h3>
                  <p className="text-xs text-emerald-400 font-medium">{selectedDoctorModal.specialty}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoctorModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Today Availability Quick Control Banner */}
            <div
              className={`p-4 rounded-xl border mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                selectedDoctorModal.is_available_today !== false
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-rose-500/10 border-rose-500/20"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedDoctorModal.is_available_today !== false
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {selectedDoctorModal.is_available_today !== false ? "Active for Today" : "Unavailable Today"}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {selectedDoctorModal.is_available_today !== false
                    ? "Doctor is available for patient consultations and bookings today."
                    : "Doctor is marked unavailable for today. AI receptionist will NOT book today even if slots exist."}
                </p>
              </div>

              <button
                onClick={() => handleToggleAvailabilityToday(selectedDoctorModal.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedDoctorModal.is_available_today !== false
                    ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                }`}
              >
                {selectedDoctorModal.is_available_today !== false ? (
                  <>
                    <CalendarX className="w-4 h-4" />
                    <span>Set Unavailable for Today</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Set Available for Today</span>
                  </>
                )}
              </button>
            </div>

            {/* View or Edit Doctor Details */}
            {isEditingDoctor ? (
              <form onSubmit={handleSaveDoctorEdit} className="space-y-4 mb-6 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Edit Physician Details</h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingDoctor(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Doctor Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Specialty</label>
                    <input
                      type="text"
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Consultation Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFee}
                      onChange={(e) => setEditFee(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Symptoms Treated</label>
                    <input
                      type="text"
                      value={editSymptoms}
                      onChange={(e) => setEditSymptoms(e.target.value)}
                      placeholder="e.g. fever, headache, flu"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={updatingDoctor}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {updatingDoctor ? "Saving..." : "Save Doctor Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Physician Profile</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingDoctor(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Doctor</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase block">Consultation Fee</span>
                    <span className="text-sm font-bold text-white font-mono">${selectedDoctorModal.fee}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase block">Specialty</span>
                    <span className="text-sm font-semibold text-cyan-300">{selectedDoctorModal.specialty}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 uppercase block mb-1.5">Symptoms Treated</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedDoctorModal.symptoms_treated && selectedDoctorModal.symptoms_treated.length > 0 ? (
                      selectedDoctorModal.symptoms_treated.map((sym, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60"
                        >
                          {sym}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">General practice</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Doctor's Slots View */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
              <button
                type="button"
                onClick={() => setIsSlotsCollapsed(!isSlotsCollapsed)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">
                    Configured Slots for Dr. {selectedDoctorModal.name} ({modalDoctorSlots.length})
                  </span>
                </div>
                {isSlotsCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {!isSlotsCollapsed && (
                <div className="p-4 border-t border-slate-800 space-y-2">
                  {modalDoctorSlots.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2 text-center">
                      No slots created for this doctor yet. Use the Slot Management tab to schedule.
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {modalDoctorSlots.map((slot) => {
                        const isDisabled = slot.is_disabled === true;
                        const linkedAppt = appointments.find((a) => a.slot_id === slot.id);
                        return (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                              isDisabled
                                ? "bg-slate-950/60 border-slate-800 text-slate-500 opacity-70"
                                : "bg-slate-900/90 border-slate-800 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-slate-200">{slot.slot_date}</span>
                              <span className="font-mono text-slate-400">
                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                              </span>
                              {linkedAppt && slot.is_booked && (
                                <span
                                  className="text-[11px] text-amber-300 font-medium truncate max-w-[120px]"
                                  title={`${linkedAppt.patient_name} (${linkedAppt.patient_phone})`}
                                >
                                  {linkedAppt.patient_name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isDisabled ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  Disabled
                                </span>
                              ) : slot.is_booked ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Booked
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Available
                                </span>
                              )}

                              {slot.is_booked ? (
                                <button
                                  onClick={() => handleUnbookSlot(slot.id)}
                                  title={
                                    linkedAppt
                                      ? `Unbook Slot (Booked by: ${linkedAppt.patient_name})`
                                      : "Unbook Slot (Cancel Appointment)"
                                  }
                                  className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 cursor-pointer"
                                >
                                  <CalendarX className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenBookModal(slot)}
                                  disabled={isDisabled}
                                  title={isDisabled ? "Cannot book disabled slot" : "Manually Book Slot"}
                                  className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <CalendarCheck className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleSlotDisabled(slot.id)}
                                title={isDisabled ? "Enable Slot" : "Disable Slot"}
                                className={`p-1 rounded-md border cursor-pointer ${
                                  isDisabled
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                }`}
                              >
                                {isDisabled ? <Power className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                title="Delete Slot"
                                className="p-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MANUAL BOOKING MODAL ==================== */}
      {bookingSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md p-6 sm:p-7 rounded-2xl border border-emerald-500/30 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Manual Slot Booking</h3>
                  <p className="text-xs text-slate-400">Book this appointment for a walk-in or phone patient</p>
                </div>
              </div>
              <button
                onClick={() => setBookingSlotModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Slot Information Summary */}
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 mb-5 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Physician:</span>
                <span className="font-semibold text-white">Dr. {getDoctorName(bookingSlotModal.doctor_id)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Date:</span>
                <span className="font-mono text-cyan-300 font-semibold">{bookingSlotModal.slot_date}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Time Window:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {bookingSlotModal.start_time.slice(0, 5)} – {bookingSlotModal.end_time.slice(0, 5)}
                </span>
              </div>
            </div>

            {bookingModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bookingModalError}</span>
              </div>
            )}

            {/* Booking Form */}
            <form onSubmit={handleSubmitManualBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Patient Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={bookPatientName}
                  onChange={(e) => setBookPatientName(e.target.value)}
                  placeholder="e.g. Ahmed Raza"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contact Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  value={bookPatientPhone}
                  onChange={(e) => setBookPatientPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Symptoms / Consultation Notes <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={bookSymptoms}
                  onChange={(e) => setBookSymptoms(e.target.value)}
                  placeholder="e.g. Follow-up consultation, fever and cough"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBookingSlotModal(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  {isSubmittingBooking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Booking</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== APPOINTMENT DETAILS MODAL ==================== */}
      {selectedAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl p-6 sm:p-7 rounded-2xl border border-emerald-500/30 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Appointment Details</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmed
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Ref ID: #{selectedAppointmentModal.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointmentModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Patient Information Card */}
              <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    Patient Information
                  </span>
                  {selectedAppointmentModal.created_at && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Booked on: {new Date(selectedAppointmentModal.created_at).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
                      {selectedAppointmentModal.patient_name[0]?.toUpperCase() || "P"}
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Patient Name</span>
                      <span className="text-sm font-bold text-white">
                        {selectedAppointmentModal.patient_name}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Contact Phone</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${selectedAppointmentModal.patient_phone}`}
                        className="font-mono text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {selectedAppointmentModal.patient_phone}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedAppointmentModal.patient_phone);
                          setCopiedPhone(true);
                          setTimeout(() => setCopiedPhone(false), 2000);
                        }}
                        title="Copy phone number"
                        className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reported Symptoms Card */}
              <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Reported Symptoms / Reason for Visit
                </span>
                {selectedAppointmentModal.symptoms_reported ? (
                  <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 font-medium">
                    {selectedAppointmentModal.symptoms_reported}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 italic">
                    No specific symptoms noted. General medical consultation or checkup.
                  </div>
                )}
              </div>

              {/* Scheduled Appointment Slot Card */}
              <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Appointment Slot Information
                </span>

                {modalAppointmentSlot ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">Appointment Date</span>
                      <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-white">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {modalAppointmentSlot.slot_date}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">Time Window</span>
                      <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-emerald-400">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {modalAppointmentSlot.start_time.slice(0, 5)} – {modalAppointmentSlot.end_time.slice(0, 5)}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">Slot Status</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Booked
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-400">
                    Slot ID: #{selectedAppointmentModal.slot_id}
                  </div>
                )}
              </div>

              {/* Booked Doctor Card */}
              <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                  Assigned Physician Details
                </span>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {modalAppointmentDoctor?.name || getDoctorName(selectedAppointmentModal.doctor_id)}
                    </h4>
                    <p className="text-xs text-cyan-300 font-medium">
                      {modalAppointmentDoctor?.specialty || "Physician"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {modalAppointmentDoctor?.fee !== undefined && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase">Consultation Fee</span>
                        <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700 inline-block">
                          ${modalAppointmentDoctor.fee}
                        </span>
                      </div>
                    )}
                    {modalAppointmentDoctor && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          modalAppointmentDoctor.is_available_today !== false
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {modalAppointmentDoctor.is_available_today !== false ? "Available Today" : "Unavailable Today"}
                      </span>
                    )}
                  </div>
                </div>

                {modalAppointmentDoctor?.symptoms_treated && modalAppointmentDoctor.symptoms_treated.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] text-slate-500 uppercase block mb-1">Doctor Specialty Conditions Treated</span>
                    <div className="flex flex-wrap gap-1">
                      {modalAppointmentDoctor.symptoms_treated.map((sym, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60"
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  const slotId = selectedAppointmentModal.slot_id;
                  setSelectedAppointmentModal(null);
                  await handleUnbookSlot(slotId);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
              >
                <CalendarX className="w-3.5 h-3.5" />
                <span>Cancel / Unbook Appointment</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAppointmentModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
