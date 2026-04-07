import { useState } from "react";

import useChatStore from "../store/chatStore";

const DEPARTMENTS = [
  "CSE",
  "ACSE",
  "IT",
  "ECE",
  "EEE",
  "Mech",
  "Civil",
  "Chemical",
  "BioTech",
  "Pharmacy",
  "BME",
  "MBA",
  "Law",
  "Agriculture",
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "PG"];

export default function StudentProfileSetup({ open, onClose }) {
  const studentProfile = useChatStore((state) => state.studentProfile);
  const setStudentProfile = useChatStore((state) => state.setStudentProfile);

  const [name, setName] = useState(studentProfile.name || "");
  const [department, setDepartment] = useState(studentProfile.department || "");
  const [year, setYear] = useState(studentProfile.year || "");
  const [rollNumber, setRollNumber] = useState(studentProfile.rollNumber || "");

  if (!open) {
    return null;
  }

  const handleSave = () => {
    setStudentProfile({
      name: name.trim() || "Student",
      department,
      year,
      rollNumber,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Student Profile Setup
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          This helps CampusAI personalize answers like: As a 3rd year CSE
          student...
        </p>

        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Select Year</option>
            {YEARS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={rollNumber}
            onChange={(event) => setRollNumber(event.target.value)}
            placeholder="Roll Number (optional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Start Chatting
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 underline dark:text-slate-300"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
