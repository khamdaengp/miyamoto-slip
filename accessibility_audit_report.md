# WCAG 2.1 / 2.2 Level A & AA Accessibility Audit Report

**Project**: Miyamoto AC - Salary Viewer (Lao Payroll Desktop & Mobile App)  
**Target Path / UI**: `src/components/`, `src/App.tsx`, `index.html` (React 19, Tailwind CSS v4, Capacitor Android, Electron)  
**Audit Date**: September 4, 2026  
**Auditor**: Antigravity A11y Audit Specialist  
**Standard**: Web Content Accessibility Guidelines (WCAG) 2.1 & 2.2 Level A and Level AA  

---

## 1. Summary & Scorecard

### Compliance Overview
| Category | Total Checked | Passed | Violations (A) | Violations (AA) | Compliance Rating |
|---|:---:|:---:|:---:|:---:|:---:|
| **1. Perceivable** | 7 | 3 | 1 | 3 | 42.8% (Non-compliant) |
| **2. Operable** | 8 | 4 | 2 | 2 | 50.0% (Non-compliant) |
| **3. Understandable** | 4 | 3 | 0 | 1 | 75.0% (Partially compliant) |
| **4. Robust** | 4 | 1 | 2 | 1 | 25.0% (Non-compliant) |
| **Total** | **23** | **11** | **5** | **7** | **47.8% Overall** |

### Severity Distribution
```
[ Critical ] ■■■ (3)   - Complete blocker for keyboard or low-vision users
[ Major    ] ■■■■■ (5)  - Severe contrast failure or lack of accessible labels/roles
[ Minor    ] ■■■■ (4)   - Sub-optimal sizing or missing semantic tags
```

---

## 2. Annotated Issues Table

| Annotation # | Component / File Location | WCAG Criterion | Severity | Flagged Issue & Current Value | Recommended Code Fix |
|---|---|---|---|---|---|
| **[A-01]** | `src/components/AdminDashboard.tsx:354`, `src/App.tsx:115` | **1.4.3 Contrast (Minimum) (AA)** | **Critical** | White text on WhatsApp green background (`#FFFFFF` on `#25D366`) yields a **1.98:1** contrast ratio (Minimum requirement is **4.5:1** for normal text). Severe legibility barrier. | Switch text color to dark `#0f172a` (8.41:1 contrast) or use a darker green background `#128C7E` (4.65:1 against white). |
| **[A-02]** | `src/components/Navbar.tsx:49,61`, `src/components/AdminDashboard.tsx:165,216,319,363`, `src/App.tsx:123` | **1.4.3 Contrast (Minimum) (AA)** | **Major** | White text on primary blue `#0097E0` (`#FFFFFF` on `#0097E0`) yields a **3.23:1** contrast ratio at `text-xs` (12px bold). Normal text requires **4.5:1**. Fails on table header, action buttons, and active tabs. | Replace background `#0097E0` with WCAG AA compliant `#0077b6` (4.52:1 against white) or use dark text `#0f172a` on `#0097E0` (5.53:1). |
| **[A-03]** | `src/components/AdminDashboard.tsx:348` | **1.4.3 Contrast (Minimum) (AA)** | **Major** | Unsent status text `<span className="text-gray-500 text-xs">ຍັງບໍ່ສົ່ງ</span>` (`#6b7280` on dark `#1e1e1e`) yields **3.45:1** contrast (fails 4.5:1 requirement). | Update class to `text-gray-400` (`#9ca3af`, 6.57:1) or `text-amber-400` (`#fbbf24`, 10.2:1) for clear warning visibility. |
| **[A-04]** | `src/components/AdminDashboard.tsx:161,301`, `src/App.tsx:100` | **1.4.11 Non-text Contrast (AA)** | **Major** | Input borders (`border-gray-700` / `#374151` on dark background `#121212`) yield only **1.82:1** contrast ratio. WCAG requires at least **3.0:1** for UI component boundaries. | Update border color to `border-gray-500` (`#6b7280`, 3.45:1) or `border-gray-400` (`#9ca3af`, 6.57:1). |
| **[A-05]** | `src/components/AdminDashboard.tsx:207-221` | **2.1.1 Keyboard (A)** | **Critical** | File input is hidden with `className="hidden"` (`display: none`), completely detaching it from the tab sequence. Keyboard-only users cannot tab to or trigger the Excel upload button. | Replace `hidden` with Tailwind's `sr-only` class on the input, and ensure `<label>` receives keyboard focus via `focus-within:ring-2` or keep the `<label tabIndex={0}>` with Enter/Space handler. |
| **[A-06]** | `src/components/AdminDashboard.tsx:161,301`, `src/App.tsx:99` | **2.4.7 Focus Visible (AA)** | **Major** | Inputs use `focus:outline-none` with only a subtle border tint change; buttons have no focus outline at all (`focus-visible` is missing across the app). | Add global or component-level `focus-visible:ring-2 focus-visible:ring-[#0097E0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] focus:outline-none`. |
| **[A-07]** | `src/components/PayslipModal.tsx:60-109` | **2.4.3 Focus Order (A)** & **4.1.2 Name, Role, Value (A)** | **Critical** | Modal lacks `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Focus is NOT trapped inside the modal (users can tab behind the backdrop), and focus is not restored to the trigger upon closing. | Add `role="dialog" aria-modal="true" aria-labelledby="modal-title"`, implement a focus trap hook, and auto-focus the modal / restore focus to triggering element. |
| **[A-08]** | `src/components/PayslipModal.tsx:82-86` | **1.1.1 Non-text Content (A)** & **4.1.2 Name, Role, Value (A)** | **Major** | Close modal button contains only an icon `<X className="w-4 h-4" />` with a `title` attribute. Lacks an accessible name for screen readers (`aria-label`). | Add `aria-label="ປິດ (Close modal)"` and visually hidden fallback text. |
| **[A-09]** | `src/components/Navbar.tsx:44-69` | **1.3.1 Info and Relationships (A)** & **4.1.2 Name, Role, Value (A)** | **Major** | Tab navigation is rendered as generic `<div>` and `<button>` elements without ARIA tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, and `aria-controls`). | Wrap in `<nav aria-label="Main Navigation">`, add `role="tablist"` to container, and `role="tab" aria-selected={activeTab === '...'}` to buttons. |
| **[A-10]** | `src/components/AdminDashboard.tsx:272-277` | **4.1.2 Name, Role, Value (A)** | **Minor** | WhatsApp dispatch progress bar is a purely visual `div` with `style={{ width: ... }}`. Screen readers do not convey the completion percentage. | Add `role="progressbar" aria-valuenow={stats.sentPercentage} aria-valuemin={0} aria-valuemax={100} aria-label="ອັດຕາການສົ່ງໃບເງິນເດືອນ (Payslip dispatch progress)"`. |
| **[A-11]** | `src/components/AdminDashboard.tsx:224-237` | **4.1.3 Status Messages (AA)** | **Minor** | Excel upload notification and error alerts appear dynamically without `role="status"` or `aria-live="polite"`. Screen reader users receive no feedback when parsing finishes or errors occur. | Add `role="status" aria-live="polite"` to the notification container. |
| **[A-12]** | `src/components/AdminDashboard.tsx:353-370`, `src/components/PayslipModal.tsx:82` | **2.5.8 Target Size (Minimum) (AA)** | **Minor** | Table action buttons (`WhatsApp` & `ເບິ່ງ`) are ~26px high, and modal close button is 28x28px with only 8px gap. On mobile (Capacitor Android), this causes high accidental tap rates. | Increase interactive target bounding area to minimum `h-9` (36px) or provide `p-2` touch target padding for touch devices. |

---

## 3. Actionable Remediation Snippets

### Snippet 1: Fix High-Contrast Buttons & Touch Targets
**Location**: [`src/components/AdminDashboard.tsx`](file:///c:/Users/DELL/Documents/miyamoto-slip/src/components/AdminDashboard.tsx) & [`src/App.tsx`](file:///c:/Users/DELL/Documents/miyamoto-slip/src/App.tsx)

```tsx
// WhatsApp Button Fix: Dark text on green for 8.41:1 contrast, min height for touch
<button
  onClick={() => handleSendWhatsApp(emp)}
  aria-label={`ສົ່ງໃບແຈ້ງເງິນເດືອນຜ່ານ WhatsApp ໃຫ້ ${emp.name}`}
  className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebd5c] text-[#0f172a] px-3 py-2 rounded-md font-bold transition shadow cursor-pointer text-xs whitespace-nowrap min-h-[36px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
  title="Send payslip summary via WhatsApp"
>
  <MessageCircle className="w-4 h-4 text-[#0f172a]" aria-hidden="true" />
  <span>WhatsApp</span>
</button>

// Primary Blue Action Button Fix (4.52:1 WCAG AA compliant blue):
<button
  onClick={() => onViewEmployee(emp)}
  aria-label={`ເບິ່ງໃບແຈ້ງເງິນເດືອນຂອງ ${emp.name}`}
  className="flex items-center gap-1.5 bg-[#0077b6] hover:bg-[#005f92] text-white px-3 py-2 rounded-md font-bold transition shadow cursor-pointer text-xs whitespace-nowrap min-h-[36px] focus-visible:ring-2 focus-visible:ring-[#0097E0] focus-visible:outline-none"
>
  <Eye className="w-4 h-4" aria-hidden="true" />
  <span>ເບິ່ງ</span>
</button>
```

---

### Snippet 2: Accessible File Upload (Keyboard Operable)
**Location**: [`src/components/AdminDashboard.tsx:206-222`](file:///c:/Users/DELL/Documents/miyamoto-slip/src/components/AdminDashboard.tsx#L206-L222)

```tsx
<div className="flex items-center gap-2">
  <input
    ref={fileInputRef}
    type="file"
    accept=".xlsx, .xls"
    onChange={handleFileUpload}
    className="sr-only" // Replaces 'hidden' so input remains in DOM & keyboard sequence
    id="excel-upload-btn"
    aria-describedby="upload-instructions"
  />
  <label
    htmlFor="excel-upload-btn"
    className="flex items-center gap-2 bg-[#0077b6] hover:bg-[#005f92] text-white text-xs font-bold px-4 py-2.5 rounded-md cursor-pointer transition shadow focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-[#121212] focus-within:ring-white"
  >
    <Upload className="w-4 h-4" aria-hidden="true" />
    <span>ອັບໂຫຼດ Excel</span>
  </label>
</div>
```

---

### Snippet 3: Modal Dialog Semantics & Focus Management
**Location**: [`src/components/PayslipModal.tsx:60-90`](file:///c:/Users/DELL/Documents/miyamoto-slip/src/components/PayslipModal.tsx#L60-L90)

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-employee-title"
  className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs no-print-backdrop"
>
  {/* Backdrop click */}
  <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

  {/* Modal Content */}
  <div className="relative z-10 w-full max-w-[490px] max-h-[96vh] flex flex-col items-center">
    <div className="w-full flex justify-between items-center mb-2 px-1 text-white no-print">
      <span
        id="modal-employee-title"
        className="text-xs font-semibold bg-gray-800/80 px-2.5 py-1 rounded border border-gray-700"
      >
        {employee.employeeId} - {employee.name}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrint}
          aria-label="ພິມໃບແຈ້ງເງິນເດືອນ"
          className="flex items-center gap-1.5 bg-[#0077b6] hover:bg-[#005f92] text-white text-xs font-bold px-3 py-2 rounded transition shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
        >
          <Printer className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ພິມ (Print)</span>
        </button>
        <button
          onClick={onClose}
          aria-label="ປິດໜ້າຕ່າງ (Close modal)"
          className="bg-red-700 hover:bg-red-800 text-white p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
    ...
  </div>
</div>
```

---

### Snippet 4: Accessible Navigation Tabs
**Location**: [`src/components/Navbar.tsx:44-70`](file:///c:/Users/DELL/Documents/miyamoto-slip/src/components/Navbar.tsx#L44-L70)

```tsx
<nav aria-label="Main Navigation">
  <div role="tablist" aria-label="Dashboard Views" className="flex bg-[#121212] p-1 rounded-md border border-gray-700">
    <button
      role="tab"
      id="tab-admin"
      aria-selected={activeTab === 'admin'}
      aria-controls="panel-admin"
      onClick={() => onTabChange('admin')}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded transition cursor-pointer min-h-[36px] focus-visible:ring-2 focus-visible:ring-white ${
        activeTab === 'admin'
          ? 'bg-[#0077b6] text-white shadow'
          : 'text-gray-300 hover:text-white'
      }`}
    >
      <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Admin Dashboard</span>
    </button>
    {hasData && (
      <button
        role="tab"
        id="tab-slip"
        aria-selected={activeTab === 'slip'}
        aria-controls="panel-slip"
        onClick={() => onTabChange('slip')}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded transition cursor-pointer min-h-[36px] focus-visible:ring-2 focus-visible:ring-white ${
          activeTab === 'slip'
            ? 'bg-[#0077b6] text-white shadow'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
        <span>ໃບແຈ້ງເງິນເດືອນ (Payslip)</span>
      </button>
    )}
  </div>
</nav>
```

---

### Snippet 5: Accessible Dynamic Progress Bar & Live Status Alert
**Location**: [`src/components/AdminDashboard.tsx:224-279`](file:///c:/Users/DELL/Documents/miyamoto-slip/src/components/AdminDashboard.tsx#L224-L279)

```tsx
{/* Status notification with aria-live */}
{uploadStatus.message && (
  <div
    role="status"
    aria-live="polite"
    className={`mt-3 text-xs p-2.5 rounded border ${
      uploadStatus.type === 'error'
        ? 'bg-red-950/50 border-red-800 text-red-200'
        : uploadStatus.type === 'success'
        ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
        : 'bg-blue-950/50 border-blue-800 text-blue-200'
    }`}
  >
    {uploadStatus.message}
  </div>
)}

{/* Progress bar with ARIA role and attributes */}
<div
  role="progressbar"
  aria-valuenow={stats.sentPercentage}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`ອັດຕາການສົ່ງໃບເງິນເດືອນ: ${stats.sentCount} ຈາກ ${stats.totalCount} ຄົນ`}
  className="w-full bg-gray-700 h-2.5 rounded-full mt-1.5 overflow-hidden"
>
  <div
    className="bg-[#25D366] h-full transition-all duration-300"
    style={{ width: `${stats.sentPercentage}%` }}
  />
</div>
```

---

## 4. Verification & Testing Checklist

- [ ] **Automated CI Accessibility Linting**: Add `eslint-plugin-jsx-a11y` to catch missing alt texts, invalid ARIA attributes, and orphaned form controls on every commit.
- [ ] **Screen Reader Testing**: Test with NVDA (Windows) or TalkBack (Android) to verify tab navigation order, dialog announcement, and status updates.
- [ ] **Keyboard-Only Traversal**: Verify that every action (File upload, Period apply, Search, Backup download, Delete, WhatsApp, and Modal View/Close) can be triggered with Tab, Space, Enter, and Esc without a mouse.
