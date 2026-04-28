"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  hourlyRate: number;
  overtimeRate: number;
}
interface Project {
  id: string;
  name: string;
}
interface TimeLog {
  id: string;
  date: string;
  hours: number;
  overtimeHours: number;
  totalCost: number;
  notes: string | null;
  createdAt: string;
  employee: { id: string; name: string };
  project: { id: string; name: string };
}

const blankEntry = {
  employeeId: "",
  projectId: "",
  date: new Date().toISOString().split("T")[0],
  hours: "",
  overtimeHours: "",
  notes: "",
};

export default function TimesheetsPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState(blankEntry);
  const [costPreview, setCostPreview] = useState(0);

  const [filters, setFilters] = useState({
    employeeId: "",
    projectId: "",
    startDate: "",
    endDate: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TimeLog | null>(null);
  const [editForm, setEditForm] = useState(blankEntry);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const res = await fetch(`/api/timelogs?${params}`);
    setLogs(await res.json());
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/projects?active=true").then((r) => r.json()),
    ]).then(([emps, projs]) => {
      setEmployees(emps);
      setProjects(projs);
    });
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Live cost preview
  useEffect(() => {
    const emp = employees.find((e) => e.id === form.employeeId);
    if (!emp) {
      setCostPreview(0);
      return;
    }
    setCostPreview(
      (Number(form.hours) || 0) * emp.hourlyRate +
        (Number(form.overtimeHours) || 0) * emp.overtimeRate,
    );
  }, [form.employeeId, form.hours, form.overtimeHours, employees]);

  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!form.employeeId || !form.projectId) {
      setSubmitError("Please select an employee and a project.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/timelogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId,
        projectId: form.projectId,
        date: form.date,
        hours: Number(form.hours),
        overtimeHours: Number(form.overtimeHours) || 0,
        notes: form.notes || null,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error || "Failed to save.");
      return;
    }

    setForm({ ...blankEntry, date: form.date });
    fetchLogs();
  }

  function handleFilterChange(
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) {
    setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function clearFilters() {
    setFilters({ employeeId: "", projectId: "", startDate: "", endDate: "" });
  }

  function openEdit(log: TimeLog) {
    setEditTarget(log);
    setEditForm({
      employeeId: log.employee.id,
      projectId: log.project.id,
      date: log.date.split("T")[0],
      hours: String(log.hours),
      overtimeHours: String(log.overtimeHours),
      notes: log.notes ?? "",
    });
    setEditError("");
  }

  function handleEditChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError("");
    setEditSaving(true);

    const res = await fetch(`/api/timelogs/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: editForm.employeeId,
        projectId: editForm.projectId,
        date: editForm.date,
        hours: Number(editForm.hours),
        overtimeHours: Number(editForm.overtimeHours) || 0,
        notes: editForm.notes || null,
      }),
    });

    const data = await res.json();
    setEditSaving(false);

    if (!res.ok) {
      setEditError(data.error || "Failed to update.");
      return;
    }

    setEditTarget(null);
    fetchLogs();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/timelogs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteId(null);
      fetchLogs();
    }
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const totalHours = logs.reduce((s, l) => s + l.hours, 0);
  const totalOT = logs.reduce((s, l) => s + l.overtimeHours, 0);
  const totalCost = logs.reduce((s, l) => s + l.totalCost, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Log and manage employee work hours
        </p>
      </div>

      {/* ── Add Entry Form ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <h2 className="font-semibold text-gray-900">Add Time Entry</h2>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showForm ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showForm && (
          <div className="px-5 pb-5">
            {submitError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="xl:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Employee
                  </label>
                  <select
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">Select…</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Project
                  </label>
                  <select
                    name="projectId"
                    value={form.projectId}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">Select…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleFormChange}
                    required
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    name="hours"
                    value={form.hours}
                    onChange={handleFormChange}
                    required
                    min="0.5"
                    max="24"
                    step="0.5"
                    placeholder="8"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    OT Hours
                  </label>
                  <input
                    type="number"
                    name="overtimeHours"
                    value={form.overtimeHours}
                    onChange={handleFormChange}
                    min="0"
                    max="24"
                    step="0.5"
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {costPreview > 0
                      ? `Cost: ${formatCurrency(costPreview)}`
                      : "Notes"}
                  </label>
                  <input
                    type="text"
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Optional notes…"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {submitting ? "Saving…" : "Confirm Entry"}
                </button>
                {employees.length === 0 && (
                  <span className="text-sm text-amber-600">
                    Add employees first before logging time.
                  </span>
                )}
                {employees.length > 0 && projects.length === 0 && (
                  <span className="text-sm text-amber-600">
                    Create a project before logging time.
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
          >
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            name="projectId"
            value={filters.projectId}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Summary ── */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalHours.toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">Total OT Hrs</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalOT.toFixed(1)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>
      )}

      {/* ── Data Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Log History
          </span>
          {!loading && (
            <span className="text-xs text-gray-400">
              {logs.length} entr{logs.length === 1 ? "y" : "ies"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            {hasFilters
              ? "No entries match the current filters."
              : "No time entries yet. Add the first one above."}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                    <th className="px-5 py-3 text-left font-medium">Name</th>
                    <th className="px-5 py-3 text-left font-medium">Project</th>
                    <th className="px-5 py-3 text-right font-medium">Hours</th>
                    <th className="px-5 py-3 text-right font-medium">OT</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Total Cost
                    </th>
                    <th className="px-5 py-3 text-left font-medium">
                      Insert At
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap font-medium">
                        {formatDate(log.date)}
                      </td>
                      <td className="px-5 py-3 text-gray-900 font-medium whitespace-nowrap">
                        {log.employee.name}
                      </td>
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {log.project.name}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {log.hours}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {log.overtimeHours}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(log.totalCost)}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(log)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteId(log.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {log.employee.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {log.project.name} · {formatDate(log.date)}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900 shrink-0">
                      {formatCurrency(log.totalCost)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span>{log.hours}h regular</span>
                    {log.overtimeHours > 0 && (
                      <span>{log.overtimeHours}h OT</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(log)}
                      className="flex-1 text-sm py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(log.id)}
                      className="flex-1 text-sm py-2 border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Time Entry"
      >
        <form onSubmit={handleEditSave} className="space-y-4">
          {editError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              name="employeeId"
              value={editForm.employeeId}
              onChange={handleEditChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              name="projectId"
              value={editForm.projectId}
              onChange={handleEditChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={editForm.date}
              onChange={handleEditChange}
              required
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours
              </label>
              <input
                type="number"
                name="hours"
                value={editForm.hours}
                onChange={handleEditChange}
                required
                min="0.5"
                max="24"
                step="0.5"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OT Hours
              </label>
              <input
                type="number"
                name="overtimeHours"
                value={editForm.overtimeHours}
                onChange={handleEditChange}
                min="0"
                max="24"
                step="0.5"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              name="notes"
              value={editForm.notes}
              onChange={handleEditChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold"
            >
              {editSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Entry"
        size="sm"
      >
        <p className="text-gray-600 text-sm mb-5">
          Delete this time entry? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => deleteId && handleDelete(deleteId)}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
