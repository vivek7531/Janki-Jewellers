// src/App.js
import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

// Use a local proxy path during development. Vite will forward /gs to the Apps Script URL.
const SHEET_API_URL = '/gs';

function formatDateISO(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const CORRECT_PASSWORD = "janki123"; // Change this to your desired password
  
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === CORRECT_PASSWORD) {
      setIsLoggedIn(true);
      setPasswordInput("");
      setPasswordError("");
      localStorage.setItem("isLoggedIn", "true");
    } else {
      setPasswordError("Invalid password. Please try again.");
      setPasswordInput("");
    }
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("isLoggedIn");
  };
  
  // Check if user was previously logged in
  React.useEffect(() => {
    if (localStorage.getItem("isLoggedIn") === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  const [tab, setTab] = useState("new");
  const [mortgages, setMortgages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [closed, setClosed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const emptyForm = {
    id: "",
    customerName: "",
    phone: "",
    productDescription: "",
    goldWeight: "",
    loanAmount: "",
    interestRate: "",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  };

  const [form, setForm] = useState(() => ({ ...emptyForm }));
  const [paymentForm, setPaymentForm] = useState({ mortgageId: "", amount: "", note: "", date: new Date().toISOString().slice(0, 10) });
  const [closeId, setCloseId] = useState("");
  const [closeDate, setCloseDate] = useState(new Date().toISOString().slice(0, 10));
  const [closeAmount, setCloseAmount] = useState("");
  const [closeCardStatus, setCloseCardStatus] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [search, setSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [closeSearch, setCloseSearch] = useState("");

  // edit modal
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [viewingLoan, setViewingLoan] = useState(null);
  const [viewingClosed, setViewingClosed] = useState(null);

  useEffect(() => {
    // prefill id when switching to new
    if (tab === "new") {
      setForm(() => ({ ...emptyForm, id: "JJ" + Date.now().toString().slice(-6) }));
    }
  }, [tab]);

  // Cache to avoid redundant loads within 2 seconds
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const loadDataTimeoutRef = React.useRef(null);
  const closeAmountRef = React.useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(forceRefresh = false) {
    const now = Date.now();
    
    // Skip if we loaded in the last 2 seconds (unless forced)
    if (!forceRefresh && now - lastLoadTime < 2000) {
      console.log("Skipping load, cache still fresh");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${SHEET_API_URL}?action=getData`);
      const data = await res.json();
      
      // Handle response: Apps Script returns { mortgages: [...], payments: [...], closed: [...] }
      const mortgagesData = Array.isArray(data.mortgages) ? data.mortgages : [];
      const paymentsData = Array.isArray(data.payments) ? data.payments : [];
      const closedData = Array.isArray(data.closed) ? data.closed : [];
      
      setMortgages(mortgagesData);
      setPayments(paymentsData);
      setClosed(closedData);
      setLastLoadTime(now);
      
      // set default selects
      if (mortgagesData.length > 0) {
        setPaymentForm(p => ({ ...p, mortgageId: p.mortgageId || mortgagesData[0].id }));
        setCloseId(prev => prev || mortgagesData[0].id);
      } else {
        setPaymentForm(p => ({ ...p, mortgageId: "" }));
        setCloseId("");
      }
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }

  // Debounced background reload - only refreshes if not called again within 1 second
  function scheduleBackgroundLoadData() {
    if (loadDataTimeoutRef.current) {
      clearTimeout(loadDataTimeoutRef.current);
    }
    loadDataTimeoutRef.current = setTimeout(() => {
      loadData(true); // force refresh after debounce period
    }, 1000);
  }

  const loanNum = parseFloat(form.loanAmount) || 0;
  const rateMonthly = parseFloat(form.interestRate) || 0;
  const monthlyInterest = Number(((loanNum * rateMonthly) / 100).toFixed(2));

  function showSuccess(msg) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  }
  
  function printDetails(item) {
    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Mortgage - ${item.id}</title>
        <style id="pagedef">@page { size: 50mm auto; margin: 0; }</style>
        <style>
          /* Outer body sized to label width, keep padding small to maximize font size */
          html,body{margin:0;padding:0}
          body{
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            color: #111;
            -webkit-print-color-adjust: exact;
            background: #fff;
          }
          .label{
            box-sizing: border-box;
            width:50mm;
            padding:2mm;
          }
          .brand{color:#b6862b;font-weight:700;font-size:12px;margin-bottom:4px}
          h3{margin:4px 0 6px 0;font-weight:700;font-size:12px}
          table{width:100%;border-collapse:collapse;margin:0;padding:0}
          th{display:block;font-size:9px;color:#222;padding:0;margin:0 0 2px 0}
          td{display:block;font-size:12px;font-weight:700;padding:0;margin:0 0 6px 0;word-break:break-word}
          th, td{border:0}
          .group{page-break-inside: avoid; break-inside: avoid;}
        </style>
        <script>
          // After DOM renders, measure content height and update @page size then print
          function mmPerPx() {
            const el = document.createElement('div');
            el.style.width = '100mm';
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            document.body.appendChild(el);
            const px = el.getBoundingClientRect().width;
            document.body.removeChild(el);
            return px / 100; // px per mm
          }

          function readyPrint() {
            const pxPerMm = mmPerPx();
            const label = document.getElementById('label');
            const rect = label.getBoundingClientRect();
            const heightPx = Math.ceil(rect.height);
            const heightMm = Math.ceil(heightPx / pxPerMm) + 1; // add 1mm safety
            const pageStyle = document.getElementById('pagedef');
            if (pageStyle) pageStyle.textContent = '@page { size: 50mm ' + heightMm + 'mm; margin: 0; }';
            // give browser a moment to reflow with new page size
            setTimeout(() => { window.print(); }, 200);
          }
          window.addEventListener('DOMContentLoaded', readyPrint);
        </script>
      </head>
      <body>
        <div id="label" class="label">
          <div class="brand">Janki Jewellers</div>
          <h3>Mortgage</h3>
          <div class="group">
            <table>
              <tr><th>ID</th><td><strong>${item.id}</strong></td></tr>
              <tr><th>Customer</th><td><strong>${item.customerName}</strong></td></tr>
              <tr><th>Phone</th><td><strong>${item.phone || "-"}</strong></td></tr>
              <tr><th>Product</th><td><strong>${item.productDescription || "-"}</strong></td></tr>
              <tr><th>Gold (g)</th><td><strong>${item.goldWeight || "-"}</strong></td></tr>
              <tr><th>Loan (₹)</th><td><strong>₹${Number(item.loanAmount).toFixed(2)}</strong></td></tr>
              <tr><th>Rate (%)</th><td><strong>${item.interestRate || 0}%</strong></td></tr>
              <tr><th>Monthly (₹)</th><td><strong>₹${Number(item.monthlyInterest || monthlyInterest).toFixed(2)}</strong></td></tr>
              <tr><th>Start</th><td><strong>${formatDateISO(item.startDate)}</strong></td></tr>
              <tr><th>Notes</th><td><strong>${item.notes || "-"}</strong></td></tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  // Add mortgage -> POST action addMortgage, then reload (fire-and-forget, instant feedback)
  function handleSave(e) {
    e && e.preventDefault();
    if (!form.customerName || !form.loanAmount) {
      alert("Please enter customer name and loan amount.");
      return;
    }
    const item = {
      ...form,
      loanAmount: Number(form.loanAmount),
      interestRate: Number(form.interestRate || 0),
      monthlyInterest,
      createdAt: new Date().toISOString(),
      action: "addMortgage",
      id: form.id || "JJ" + Date.now().toString().slice(-6),
    };

    // Show success immediately (fire-and-forget)
    showSuccess("Details saved to Google Sheet!");
    
    // Print the mortgage details
    printDetails(item);
    
    setForm({ ...emptyForm, id: "JJ" + Date.now().toString().slice(-6) });

    // Send in background without awaiting
    fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }).catch(err => console.error("Save failed", err));

    // Reload data quietly in background
    scheduleBackgroundLoadData();
  }

  // Add payment (fire-and-forget, instant feedback)
  function addPayment(e) {
    e && e.preventDefault();
    if (!paymentForm.mortgageId || !paymentForm.amount) {
      alert("Please select a mortgage and enter an amount.");
      return;
    }
    const mortgageExists = mortgages.find(m => m.id === paymentForm.mortgageId);
    if (!mortgageExists) {
      alert("Selected mortgage not found.");
      return;
    }

    const p = {
      mortgageId: paymentForm.mortgageId,
      amount: Number(paymentForm.amount),
      note: paymentForm.note || "",
      date: paymentForm.date,
      name: mortgageExists.customerName,
      createdAt: new Date().toISOString(),
      action: "addPayment",
    };

    // Show success immediately
    showSuccess("Interest payment recorded.");
    setPaymentForm(pf => ({ ...pf, amount: "", note: "" }));
    
    // Send in background
    fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    }).catch(err => console.error("Add payment failed", err));
    
    scheduleBackgroundLoadData();
  }

  // Delete payment (fire-and-forget)
  function deletePayment(createdAt) {
    if (!window.confirm("Delete this payment?")) return;
    
    showSuccess("Payment deleted.");
    
    // Send in background
    fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deletePayment", createdAt }),
    }).catch(err => console.error("Delete payment failed", err));
    
    scheduleBackgroundLoadData();
  }

  // Close loan (fire-and-forget)
  function doCloseMortgage(e) {
    e && e.preventDefault();
    if (!closeId) {
      alert("Please select a mortgage to close.");
      return;
    }
    if (!window.confirm("Are you sure you want to close this mortgage?")) return;

    const payload = {
      action: "closeMortgage",
      id: closeId,
      closedDate: closeDate,
      closedAmount: Number(closeAmount) || 0,
      cardStatus: closeCardStatus,
      closeNotes: closeNotes,
    };

    showSuccess("Mortgage closed. Removing related interest payments…");
    setCloseId("");
    setCloseAmount("");
    setCloseCardStatus("");
    setCloseNotes("");
    
    // Send in background
    fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(err => console.error("Close failed", err));

    // Also delete all interest payments associated with this mortgage (fire-and-forget)
    try {
      const relatedPayments = (Array.isArray(payments) ? payments : []).filter(p => p.mortgageId === payload.id);
      // Optimistically remove from UI
      if (relatedPayments.length) {
        setPayments(prev => prev.filter(p => p.mortgageId !== payload.id));
        relatedPayments.forEach(p => {
          if (!p.createdAt) return;
          fetch(SHEET_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "deletePayment", createdAt: p.createdAt }),
          }).catch(err => console.error("Delete payment failed", err));
        });
      }
    } catch (e) {
      console.error("Failed to queue payment deletions", e);
    }
    
    scheduleBackgroundLoadData();
  }

  // Restore a closed mortgage (fire-and-forget)
  function restoreMortgage(id) {
    if (!window.confirm("Restore this mortgage to active list?")) return;
    
    showSuccess("Mortgage restored.");
    
    // Send in background
    fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restoreMortgage", id }),
    }).catch(err => console.error("Restore failed", err));
    
    scheduleBackgroundLoadData();
  }

  // Delete mortgage entirely (fire-and-forget)
  function deleteMortgage(id) {
    if (!window.confirm("Delete this mortgage permanently?")) return;
    
    showSuccess("Mortgage deleted.");
    
    // Send in background
    fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteMortgage", id }),
    }).catch(err => console.error("Delete failed", err));
    
    scheduleBackgroundLoadData();
  }

  // Edit/save: calls updateMortgage action (fire-and-forget)
  function saveEdit() {
    if (!editForm) return;
    const payload = { ...editForm, action: "updateMortgage" };
    
    showSuccess("Changes saved.");
    setEditing(null);
    setEditForm(null);
    
    // Send in background
    fetch(SHEET_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(err => console.error("Update failed", err));
    
    scheduleBackgroundLoadData();
  }

  // Open/close loan details modal and compute interest
  function closeViewingLoan() {
    setViewingLoan(null);
  }

  function payNow(m) {
    if (!m) return;
    // Close modal, switch to Close tab and preselect the mortgage
    setViewingLoan(null);
    setTab('close');
    setCloseId(m.id);
    // close amount will be auto-filled by the useEffect watching closeId
  }

  function computeInterestToDate(m) {
    if (!m) return { fullMonths: 0, leftoverDays: 0, chargedMonths: 0, monthly: 0, totalInterest: 0 };
    const start = m.startDate ? new Date(m.startDate) : new Date();
    const today = new Date();
    if (today < start) return { fullMonths: 0, leftoverDays: 0, chargedMonths: 0, monthly: 0, totalInterest: 0 };

    // Calculate full months difference (year/month) first
    let fullMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    if (fullMonths < 0) fullMonths = 0;

    // Compute date after adding those full months to start
    const afterFullMonths = new Date(start.getTime());
    afterFullMonths.setMonth(afterFullMonths.getMonth() + fullMonths);

    // If afterFullMonths is in the future (start day > today's day), step back one month
    if (afterFullMonths > today) {
      fullMonths = Math.max(0, fullMonths - 1);
      afterFullMonths.setMonth(afterFullMonths.getMonth() - 1);
    }

    // leftover days after the full months
    const diffMs = today - afterFullMonths;
    const leftoverDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Special case: if mortgage starts today, charge first month immediately
    let chargedMonths;
    if (start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth() && start.getDate() === today.getDate()) {
      chargedMonths = 1;
    } else {
      // Rounding rule: if leftoverDays > 2, count as one more month
      chargedMonths = fullMonths + (leftoverDays > 2 ? 1 : 0);
    }

    const monthly = Number(m.monthlyInterest) || Number(((Number(m.loanAmount) || 0) * (Number(m.interestRate) || 0) / 100).toFixed(2));
    const totalInterest = Number((chargedMonths * monthly).toFixed(2));

    // Sum payments applied to this mortgage (payments array from component state)
    const paymentsApplied = (Array.isArray(payments) ? payments : [])
      .filter(p => (p.mortgageId || p.mortgageID || p.id) === (m.id || m.mortgageId))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const remainingInterest = Number((totalInterest - paymentsApplied).toFixed(2));

    // Principal and totals
    const principal = Number(m.loanAmount) || 0;
    const totalPayable = Number((principal + totalInterest).toFixed(2));
    const remainingTotal = Number((totalPayable - paymentsApplied).toFixed(2));

    return { fullMonths, leftoverDays, chargedMonths, monthly, totalInterest, paymentsApplied, remainingInterest, principal, totalPayable, remainingTotal };
  }

  // Compute interest using a specific cutoff date (e.g., closedDate)
  function computeInterestToDateAt(m, atDateStr) {
    if (!m) return { fullMonths: 0, leftoverDays: 0, chargedMonths: 0, monthly: 0, totalInterest: 0 };
    const start = m.startDate ? new Date(m.startDate) : new Date();
    const cutoff = atDateStr ? new Date(atDateStr) : new Date();
    if (cutoff < start) return { fullMonths: 0, leftoverDays: 0, chargedMonths: 0, monthly: 0, totalInterest: 0 };

    let fullMonths = (cutoff.getFullYear() - start.getFullYear()) * 12 + (cutoff.getMonth() - start.getMonth());
    if (fullMonths < 0) fullMonths = 0;
    const afterFullMonths = new Date(start.getTime());
    afterFullMonths.setMonth(afterFullMonths.getMonth() + fullMonths);
    if (afterFullMonths > cutoff) {
      fullMonths = Math.max(0, fullMonths - 1);
      afterFullMonths.setMonth(afterFullMonths.getMonth() - 1);
    }
    const diffMs = cutoff - afterFullMonths;
    const leftoverDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let chargedMonths;
    if (start.getFullYear() === cutoff.getFullYear() && start.getMonth() === cutoff.getMonth() && start.getDate() === cutoff.getDate()) {
      chargedMonths = 1; // immediate first month on same day start
    } else {
      chargedMonths = fullMonths + (leftoverDays > 2 ? 1 : 0);
    }
    const monthly = Number(m.monthlyInterest) || Number(((Number(m.loanAmount) || 0) * (Number(m.interestRate) || 0) / 100).toFixed(2));
    const totalInterest = Number((chargedMonths * monthly).toFixed(2));
    return { fullMonths, leftoverDays, chargedMonths, monthly, totalInterest };
  }

  // Auto-fill Close Amount when a mortgage is selected for closing.
  useEffect(() => {
    if (!closeId) return;
    const m = mortgages.find(x => x.id === closeId);
    if (!m) return;
    const calc = computeInterestToDate(m);
    // Prefer remainingTotal (outstanding after payments), fallback to totalPayable
    const suggested = (typeof calc.remainingTotal === 'number' && calc.remainingTotal >= 0) ? calc.remainingTotal : calc.totalPayable || 0;
    // set as fixed 2-decimal string so the input shows monetary format
    setCloseAmount(Number(suggested).toFixed(2));
    // auto-focus close amount for quick payment
    setTimeout(() => {
      try {
        if (closeAmountRef.current) {
          closeAmountRef.current.focus();
        }
      } catch {
        /* ignore focus error */
      }
    }, 120);
  }, [closeId, mortgages, payments]);

  const filteredMortgages = mortgages
    .filter(m =>
      (m.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.id || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // Sort by start date (newest first)

  const filteredForPayment = mortgages.filter(m =>
    (m.customerName || "").toLowerCase().includes(paymentSearch.toLowerCase()) ||
    (m.id || "").toLowerCase().includes(paymentSearch.toLowerCase())
  );

  return (
    <div className="bg-light min-vh-100">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&family=Playfair+Display:wght@600;700&display=swap');
        :root{--gold-500:#d4af37;--gold-600:#c89f2b;--ivory:#fffaf0}
        body{font-family:'Poppins',system-ui,Arial,sans-serif;background:linear-gradient(180deg,#fbfaf8 0%, #fff 100%)}
        .brand-title{font-family:'Playfair Display',serif;color:var(--gold-600);font-weight:700}
        .gold-btn{background:linear-gradient(90deg,var(--gold-500),var(--gold-600));border:none;color:#111}
        .gold-btn:hover{filter:brightness(1.05);box-shadow:0 6px 18px rgba(200,160,60,0.18)}
        .card-gold{border:1px solid rgba(212,175,55,0.15);box-shadow:0 6px 18px rgba(0,0,0,0.04)}
        .nav-tabs .nav-link.active{background:linear-gradient(90deg,var(--gold-500),var(--gold-600));color:#111;border:none}
        table.table-striped>tbody>tr:nth-of-type(odd){background:linear-gradient(90deg,rgba(245,238,210,0.3),transparent)}
        .modal-backdrop{opacity:0.5 !important}
        .login-container{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f5e6a7 0%,#d4af37 100%)}
        .login-card{background:white;border-radius:12px;padding:40px;box-shadow:0 10px 40px rgba(0,0,0,0.1);width:100%;max-width:400px}
        .login-card h2{color:#b8860b;margin-bottom:30px;text-align:center;font-family:'Playfair Display',serif}
        .login-card input{margin-bottom:15px;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:16px}
        .login-card button{width:100%;padding:12px;background:linear-gradient(90deg,#d4af37,#c89f2b);border:none;border-radius:6px;color:#111;font-weight:600;cursor:pointer;font-size:16px}
        .login-card button:hover{filter:brightness(1.05)}
        .login-error{color:#dc3545;margin-bottom:15px;text-align:center;font-size:14px}

      `}</style>

      {!isLoggedIn ? (
        <div className="login-container">
          <div className="login-card">
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10, marginBottom: 10}}>
              <img src="/jj-logo.png" alt="Janki Jewellers logo" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover' }} />
              <h2 style={{marginBottom:0}}>Janki Jewellers</h2>
            </div>
            <p style={{textAlign: 'center', color: '#666', marginBottom: '25px'}}>Gold Mortgage Management</p>
            <form onSubmit={handleLogin}>
              {passwordError && <div className="login-error">{passwordError}</div>}
              <input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="gold-btn">Login</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&family=Playfair+Display:wght@600;700&display=swap');
        :root{--gold-500:#d4af37;--gold-600:#c89f2b;--ivory:#fffaf0}
        body{font-family:'Poppins',system-ui,Arial,sans-serif;background:linear-gradient(180deg,#fbfaf8 0%, #fff 100%)}
        .brand-title{font-family:'Playfair Display',serif;color:var(--gold-600);font-weight:700}
        .gold-btn{background:linear-gradient(90deg,var(--gold-500),var(--gold-600));border:none;color:#111}
        .gold-btn:hover{filter:brightness(1.05);box-shadow:0 6px 18px rgba(200,160,60,0.18)}
        .card-gold{border:1px solid rgba(212,175,55,0.15);box-shadow:0 6px 18px rgba(0,0,0,0.04)}
        .nav-tabs .nav-link.active{background:linear-gradient(90deg,var(--gold-500),var(--gold-600));color:#111;border:none}
        table.table-striped>tbody>tr:nth-of-type(odd){background:linear-gradient(90deg,rgba(245,238,210,0.3),transparent)}
        .modal-backdrop{opacity:0.5 !important}
      `}</style>

      <header className="py-3" style={{ background: 'linear-gradient(90deg,#f5e6a7,#d4af37)' }}>
        <div className="container d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
              <img src="/jj-logo.png" alt="Janki Jewellers logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
            </div>
            <div>
              <div className="brand-title h4 mb-0">Janki Jewellers</div>
              <small className="text-dark">Gold Mortgage Management System</small>
            </div>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <small className="text-muted">{new Date().toLocaleDateString()}</small>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container py-4">
        {successMessage && (
          <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMessage}
            <button type="button" className="btn-close" onClick={() => setSuccessMessage("")}></button>
          </div>
        )}

        {loading && (
          <div className="alert alert-warning">Processing…</div>
        )}

        <div className="card card-gold mb-4">
          <div className="card-body">
            <ul className="nav nav-tabs">
              <li className="nav-item"><button className={`nav-link ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}><i className="bi bi-plus-circle-fill me-1"></i> New Mortgage</button></li>
              <li className="nav-item"><button className={`nav-link ${tab === 'interest' ? 'active' : ''}`} onClick={() => setTab('interest')}><i className="bi bi-currency-exchange me-1"></i> Interest Payment</button></li>
              <li className="nav-item"><button className={`nav-link ${tab === 'close' ? 'active' : ''}`} onClick={() => setTab('close')}><i className="bi bi-lock-fill me-1"></i> Close Mortgage</button></li>
              <li className="nav-item"><button className={`nav-link ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}><i className="bi bi-collection-fill me-1"></i> All Loans</button></li>
            </ul>

            <div className="mt-4">
              {tab === 'new' && (
                <div className="row">
                  <div className="col-lg-8">
                    <div className="card shadow-sm">
                      <div className="card-body">
                        <h5 className="card-title">New / Edit Mortgage</h5>
                        <form onSubmit={handleSave}>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label">Customer Name *</label>
                              <input className="form-control" value={form.customerName} onChange={e => setForm(s => ({ ...s, customerName: e.target.value }))} />
                            </div>

                            <div className="col-md-6">
                              <label className="form-label">Phone</label>
                              <input className="form-control" value={form.phone} onChange={e => setForm(s => ({ ...s, phone: e.target.value }))} />
                            </div>

                            <div className="col-12">
                              <label className="form-label">Product Description</label>
                              <textarea className="form-control" rows={3} value={form.productDescription} onChange={e => setForm(s => ({ ...s, productDescription: e.target.value }))} />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Gold Weight (g)</label>
                              <input type="number" className="form-control" value={form.goldWeight} onChange={e => setForm(s => ({ ...s, goldWeight: e.target.value }))} />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Loan Amount (₹) *</label>
                              <input type="number" className="form-control" value={form.loanAmount} onChange={e => setForm(s => ({ ...s, loanAmount: e.target.value }))} />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Rate of Interest (Monthly %)</label>
                              <input type="number" className="form-control" value={form.interestRate} onChange={e => setForm(s => ({ ...s, interestRate: e.target.value }))} />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Monthly Interest (₹)</label>
                              <input readOnly className="form-control" value={`₹${monthlyInterest.toFixed(2)}`} />
                            </div>

                            <div className="col-md-4">
                              <label className="form-label">Start Date</label>
                              <input type="date" className="form-control" value={form.startDate} onChange={e => setForm(s => ({ ...s, startDate: e.target.value }))} />
                            </div>

                            <div className="col-12">
                              <label className="form-label">Notes</label>
                              <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(s => ({ ...s, notes: e.target.value }))} />
                            </div>

                            <div className="col-12 text-end">
                              <button type="submit" className="btn gold-btn px-4 py-2"><i className="bi bi-save2-fill me-2"></i> Save</button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="card shadow-sm">
                      <div className="card-body">
                        <h6 className="card-subtitle mb-2 text-muted">Quick Info</h6>
                        <p className="card-text">After saving, the mortgage will be stored in All Loans.</p>
                        <hr />
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <small className="text-muted">Active count</small>
                            <div className="fs-4 fw-bold">{mortgages.length}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'interest' && (
                <div>
                  <div className="row mb-3">
                    <div className="col-md-8">
                      <input placeholder="Search mortgage by name or ID..." className="form-control" value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)} />
                    </div>
                    <div className="col-md-4 text-end">
                      <button className="btn btn-outline-secondary" onClick={() => setPaymentSearch('')}>Clear</button>
                    </div>
                  </div>

                  <div className="card mb-3 p-3 shadow-sm">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-4">
                        <label className="form-label">Select Mortgage</label>
                        <select className="form-select" value={paymentForm.mortgageId} onChange={e => setPaymentForm(p => ({ ...p, mortgageId: e.target.value }))}>
                          <option value="">-- Select mortgage --</option>
                          {filteredForPayment.map(m => <option key={m.id} value={m.id}>{m.customerName} — {m.id}</option>)}
                        </select>
                      </div>

                      <div className="col-md-3">
                        <label className="form-label">Amount (₹)</label>
                        <input type="number" className="form-control" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} />
                      </div>

                      <div className="col-md-3">
                        <label className="form-label">Date</label>
                        <input type="date" className="form-control" value={paymentForm.date} onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))} />
                      </div>

                      <div className="col-md-2 text-end">
                        <button className="btn btn-primary" onClick={addPayment}><i className="bi bi-plus-lg me-1"></i>Add</button>
                      </div>

                      <div className="col-12">
                        <label className="form-label">Note (optional)</label>
                        <input className="form-control" value={paymentForm.note} onChange={e => setPaymentForm(p => ({ ...p, note: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  <div className="card shadow-sm">
                    <div className="card-body">
                      <h6>All Payments</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-striped align-middle">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Mortgage ID</th>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Note</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map(p => (
                              <tr key={p.createdAt}>
                                <td>{p.name}</td>
                                <td>{p.mortgageId}</td>
                                <td>{formatDateISO(p.date)}</td>
                                <td>₹{Number(p.amount).toFixed(2)}</td>
                                <td>{p.note}</td>
                                <td><button className="btn btn-sm btn-outline-danger" onClick={() => deletePayment(p.createdAt)}><i className="bi bi-trash-fill"></i></button></td>
                              </tr>
                            ))}
                            {payments.length === 0 && <tr><td colSpan={6} className="text-center py-3 text-muted">No payments recorded</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'close' && (
                <div>
                  <div className="row mb-3">
                    <div className="col-md-8">
                      <input placeholder="Search mortgage by name or ID..." className="form-control" value={closeSearch} onChange={e => setCloseSearch(e.target.value)} />
                    </div>
                    <div className="col-md-4 text-end">
                      <button className="btn btn-outline-secondary" onClick={() => setCloseSearch('')}>Clear</button>
                    </div>
                  </div>

                  <form className="row g-3 align-items-end" onSubmit={doCloseMortgage}>
                    <div className="col-md-6">
                      <label className="form-label">Select mortgage to close</label>
                      <select className="form-select" value={closeId} onChange={e => setCloseId(e.target.value)}>
                        <option value="">-- Select --</option>
                        {mortgages
                          .filter(m =>
                            (m.customerName || "").toLowerCase().includes(closeSearch.toLowerCase()) ||
                            (m.id || "").toLowerCase().includes(closeSearch.toLowerCase())
                          )
                          .map(m => <option key={m.id} value={m.id}>{m.customerName} — {m.id}</option>)}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Close Date</label>
                      <input type="date" className="form-control" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Close Amount (₹)</label>
                      <input ref={closeAmountRef} type="number" className="form-control" value={closeAmount} onChange={e => setCloseAmount(e.target.value)} />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Card Status</label>
                      <select className="form-select" value={closeCardStatus} onChange={e => setCloseCardStatus(e.target.value)}>
                        <option value="">-- Select --</option>
                        <option value="Card Given">Card Given</option>
                        <option value="Card Not Given">Card Not Given</option>
                      </select>
                    </div>

                    <div className="col-md-8">
                      <label className="form-label">Notes</label>
                      <input className="form-control" value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Enter notes (optional)" />
                    </div>

                    <div className="col-12 text-end">
                      <button className="btn btn-danger">Close Mortgage</button>
                    </div>
                  </form>

                  <div className="mt-4 card shadow-sm">
                    <div className="card-body">
                      <h6>Closed Mortgages</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-striped align-middle">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Customer</th>
                              <th>Loan</th>
                              <th>Closed Date</th>
                              <th>Closed Amount</th>
                              <th>Card Status</th>
                              <th>Notes</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                                  {closed.map(c => (
                                    <tr key={c.id}>
                                      <td><a href="#" onClick={e => { e.preventDefault(); setViewingClosed(c); }}>{c.id}</a></td>
                                      <td>{c.customerName}</td>
                                      <td>₹{Number(c.loanAmount).toFixed(2)}</td>
                                      <td>{formatDateISO(c.closedDate)}</td>
                                      <td>₹{Number(c.closedAmount || 0).toFixed(2)}</td>
                                      <td>{c.cardStatus || "-"}</td>
                                      <td>{c.closeNotes || "-"}</td>
                                      <td><button className="btn btn-sm btn-outline-primary" onClick={() => restoreMortgage(c.id)}><i className="bi bi-arrow-counterclockwise"></i></button></td>
                                    </tr>
                                  ))}
                            {closed.length === 0 && <tr><td colSpan={8} className="text-center py-3 text-muted">No closed mortgages</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'active' && (
                <div>
                  <div className="mb-3 row">
                    <div className="col-md-8"><input placeholder="Search by ID or name..." className="form-control" value={search} onChange={e => setSearch(e.target.value)} /></div>
                    <div className="col-md-4 text-end"><button className="btn btn-outline-secondary" onClick={() => setSearch('')}>Clear</button></div>
                  </div>

                  <div className="card shadow-sm">
                    <div className="card-body">
                      <div className="table-responsive">
                        <table className="table table-sm table-striped align-middle">
                          <thead><tr><th>ID</th><th>Customer</th><th>Phone</th><th>Product</th><th>Gold</th><th>Loan</th><th>Rate</th><th>Monthly</th><th>Start</th><th>Notes</th><th>Action</th></tr></thead>
                          <tbody>
                            {filteredMortgages.map(m => (
                              <tr key={m.id}>
                                <td><a href="#" onClick={(e) => { e.preventDefault(); setViewingLoan(m); }}>{m.id}</a></td>
                                <td>{m.customerName}</td>
                                <td>{m.phone}</td>
                                <td>{m.productDescription}</td>
                                <td>{m.goldWeight}g</td>
                                <td>₹{Number(m.loanAmount).toFixed(2)}</td>
                                <td>{m.interestRate}%</td>
                                <td>₹{Number(m.monthlyInterest || 0).toFixed(2)}</td>
                                <td>{formatDateISO(m.startDate)}</td>
                                <td>{m.notes}</td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditing(m.id); setEditForm({ ...m }); }}><i className="bi bi-pencil-fill"></i></button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteMortgage(m.id)}><i className="bi bi-trash-fill"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredMortgages.length === 0 && <tr><td colSpan={11} className="text-center py-3 text-muted">No active mortgages</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <footer className="text-center text-muted mt-4">© 2025 Janki Jewellers – Gold Mortgage Manager</footer>
      </div>

      {/* Edit Modal */}
      {editing && editForm && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Mortgage {editForm.id}</h5>
                <button type="button" className="btn-close" onClick={() => setEditing(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label">Customer Name</label><input className="form-control" value={editForm.customerName} onChange={e => setEditForm(s => ({ ...s, customerName: e.target.value }))} /></div>
                  <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={editForm.phone} onChange={e => setEditForm(s => ({ ...s, phone: e.target.value }))} /></div>
                  <div className="col-12"><label className="form-label">Product Description</label><textarea className="form-control" rows={2} value={editForm.productDescription} onChange={e => setEditForm(s => ({ ...s, productDescription: e.target.value }))} /></div>
                  <div className="col-md-4"><label className="form-label">Gold Weight</label><input className="form-control" value={editForm.goldWeight} onChange={e => setEditForm(s => ({ ...s, goldWeight: e.target.value }))} /></div>
                  <div className="col-md-4"><label className="form-label">Loan Amount</label><input type="number" className="form-control" value={editForm.loanAmount} onChange={e => setEditForm(s => ({ ...s, loanAmount: e.target.value }))} /></div>
                  <div className="col-md-4"><label className="form-label">Interest Rate (%)</label><input type="number" className="form-control" value={editForm.interestRate} onChange={e => setEditForm(s => ({ ...s, interestRate: e.target.value }))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="button" className="btn gold-btn" onClick={saveEdit}><i className="bi bi-save2-fill me-1"></i> Save changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Loan Details Modal */}
      {viewingLoan && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Loan Details — {viewingLoan.id}</h5>
                <button type="button" className="btn-close" onClick={closeViewingLoan}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><strong>Customer</strong><div>{viewingLoan.customerName}</div></div>
                  <div className="col-md-6"><strong>Phone</strong><div>{viewingLoan.phone || '-'}</div></div>
                  <div className="col-md-6"><strong>Product</strong><div>{viewingLoan.productDescription || '-'}</div></div>
                  <div className="col-md-6"><strong>Gold Weight</strong><div>{viewingLoan.goldWeight || '-' } g</div></div>
                  <div className="col-md-4"><strong>Loan Amount</strong><div>₹{Number(viewingLoan.loanAmount).toFixed(2)}</div></div>
                  <div className="col-md-4"><strong>Interest Rate (monthly %)</strong><div>{viewingLoan.interestRate || 0}%</div></div>
                  <div className="col-md-4"><strong>Monthly Interest</strong><div>₹{Number(viewingLoan.monthlyInterest || ((Number(viewingLoan.loanAmount)||0)*(Number(viewingLoan.interestRate)||0)/100)).toFixed(2)}</div></div>
                  <div className="col-md-4"><strong>Start Date</strong><div>{formatDateISO(viewingLoan.startDate)}</div></div>
                  <div className="col-12"><strong>Notes</strong><div>{viewingLoan.notes || '-'}</div></div>
                </div>

                <hr />
                <h6>Interest Summary</h6>
                {(() => {
                  const calc = computeInterestToDate(viewingLoan);
                  return (
                    <div>
                      <table className="table table-sm table-borderless">
                        <tbody>
                          <tr>
                            <th style={{width: '55%'}}>Duration</th>
                            <td className="text-end">{calc.fullMonths} mo {calc.leftoverDays} d</td>
                          </tr>
                          <tr>
                            <th>Months charged</th>
                            <td className="text-end">{calc.chargedMonths}</td>
                          </tr>
                          <tr>
                            <th>Monthly interest</th>
                            <td className="text-end">₹{Number(calc.monthly).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Total interest</th>
                            <td className="text-end">₹{Number(calc.totalInterest).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Principal</th>
                            <td className="text-end">₹{Number(calc.principal).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Total payable</th>
                            <td className="text-end">₹{Number(calc.totalPayable).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Payments applied</th>
                            <td className="text-end">-₹{Number(calc.paymentsApplied || 0).toFixed(2)}</td>
                          </tr>
                          <tr className="bg-light">
                            <th className="fw-bold">Remaining payable</th>
                            <td className="text-end fw-bold" style={{color: calc.remainingTotal < 0 ? '#198754' : '#d9534f'}}>
                              ₹{Number(calc.remainingTotal >= 0 ? calc.remainingTotal : 0).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <h6 className="mt-3">Payments</h6>
                      {(() => {
                        const pList = (Array.isArray(payments) ? payments : []).filter(p => (p.mortgageId || p.mortgageID || p.mortgageId) === (viewingLoan.id || viewingLoan.mortgageId));
                        if (pList.length === 0) return <div className="text-muted">No payments recorded for this mortgage.</div>;
                        // sort by date desc if available
                        pList.sort((a,b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
                        return (
                          <div className="table-responsive">
                            <table className="table table-sm table-striped mt-2">
                              <thead>
                                <tr><th>Date</th><th className="text-end">Amount</th><th>Note</th></tr>
                              </thead>
                              <tbody>
                                {pList.map((p, idx) => (
                                  <tr key={idx}>
                                    <td>{formatDateISO(p.date || p.createdAt)}</td>
                                    <td className="text-end">₹{Number(p.amount || 0).toFixed(2)}</td>
                                    <td>{p.note || p.noteText || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeViewingLoan}>Close</button>
                <button type="button" className="btn gold-btn" onClick={() => payNow(viewingLoan)}><i className="bi bi-currency-exchange me-1"></i> Pay Now</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Closed Loan Details Modal */}
      {viewingClosed && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Closed Mortgage — {viewingClosed.id}</h5>
                <button type="button" className="btn-close" onClick={() => setViewingClosed(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><strong>Customer</strong><div>{viewingClosed.customerName}</div></div>
                  <div className="col-md-6"><strong>Phone</strong><div>{viewingClosed.phone || '-'}</div></div>
                  <div className="col-md-6"><strong>Product</strong><div>{viewingClosed.productDescription || '-'}</div></div>
                  <div className="col-md-6"><strong>Gold Weight</strong><div>{viewingClosed.goldWeight || '-'} g</div></div>
                  <div className="col-md-4"><strong>Loan Amount</strong><div>₹{Number(viewingClosed.loanAmount).toFixed(2)}</div></div>
                  <div className="col-md-4"><strong>Interest Rate (monthly %)</strong><div>{viewingClosed.interestRate || 0}%</div></div>
                  <div className="col-md-4"><strong>Monthly interest</strong><div>₹{Number(viewingClosed.monthlyInterest || ((Number(viewingClosed.loanAmount)||0)*(Number(viewingClosed.interestRate)||0)/100)).toFixed(2)}</div></div>
                  <div className="col-md-4"><strong>Start Date</strong><div>{formatDateISO(viewingClosed.startDate)}</div></div>
                  <div className="col-md-4"><strong>Closed Date</strong><div>{formatDateISO(viewingClosed.closedDate)}</div></div>
                  <div className="col-md-4"><strong>Closed Amount</strong><div>₹{Number(viewingClosed.closedAmount || 0).toFixed(2)}</div></div>
                  <div className="col-12 mt-2">
                    {(() => {
                      const calcClosed = computeInterestToDateAt(viewingClosed, viewingClosed.closedDate);
                      // payments before closure
                      const paymentsBeforeClose = (Array.isArray(payments) ? payments : [])
                        .filter(p => (p.mortgageId || p.mortgageID || p.id) === viewingClosed.id)
                        .filter(p => !viewingClosed.closedDate || new Date(p.date || p.createdAt) <= new Date(viewingClosed.closedDate));
                      const paymentsSum = paymentsBeforeClose.reduce((s,p) => s + (Number(p.amount)||0), 0);
                      const principal = Number(viewingClosed.loanAmount) || 0;
                      const interestAccrued = calcClosed.totalInterest;
                      const closedPayment = Number(viewingClosed.closedAmount || 0);
                      // As requested: Total paid overall = Principal + Interest accrued
                      const totalPaidOverall = principal + interestAccrued;
                      // With this definition, the paid components equal their accruals
                      const interestPaid = interestAccrued;
                      const principalPaid = principal;
                      return (
                        <div className="table-responsive">
                          <table className="table table-sm table-striped">
                            <tbody>
                              <tr><th>Duration</th><td>{calcClosed.fullMonths} months {calcClosed.leftoverDays} days</td></tr>
                              <tr><th>Principal</th><td>₹{principal.toFixed(2)}</td></tr>
                              <tr><th>Interest accrued</th><td>₹{interestAccrued.toFixed(2)}</td></tr>
                              <tr><th>Payments before close</th><td>₹{paymentsSum.toFixed(2)}</td></tr>
                              <tr><th>Final closing payment</th><td>₹{closedPayment.toFixed(2)}</td></tr>
                              <tr style={{background:'#fff8e1', fontWeight:700, borderTop:'2px solid var(--gold-500)', borderBottom:'2px solid var(--gold-500)'}}>
                                <th style={{fontWeight:700}}>Total paid overall</th>
                                <td style={{textAlign:'right', fontWeight:700}}>₹{totalPaidOverall.toFixed(2)}</td>
                              </tr>
                              <tr><th>Interest paid</th><td>₹{interestPaid.toFixed(2)}</td></tr>
                              <tr><th>Principal paid</th><td>₹{principalPaid.toFixed(2)}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="col-12"><strong>Notes</strong><div>{viewingClosed.closeNotes || viewingClosed.notes || '-'}</div></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setViewingClosed(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
