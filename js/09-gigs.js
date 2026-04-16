
// 09-gigs.js (FINAL PRECISION REFACTOR)

window._GW = window._GW || { step: 1, data: {} };

// ===================== SAVE =====================
window._gwSave = function () {
  const d = window._GW.data;

  // Step 1
  const title = document.getElementById('gw-title');
  const cat = document.getElementById('gw-cat');
  const desc = document.getElementById('gw-desc');

  if (title) d.title = title.value;
  if (cat) d.category = cat.value;
  if (desc) d.desc = desc.value;

  // Step 2 (skills as ARRAY)
  const skills = document.getElementById('gw-skills');
  if (skills) {
    if (skills.selectedOptions) {
      d.skills = Array.from(skills.selectedOptions).map(o => o.value);
    } else {
      d.skills = (skills.value || '').split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Step 4 (budget as NUMBER)
  const budget = document.getElementById('gw-budget');
  if (budget) {
    const clean = budget.value.replace(/[₦,]/g, '');
    d.budget = parseFloat(clean) || 0;
  }
};

// ===================== VALIDATE =====================
window._gwValidate = function () {
  const d = window._GW.data;

  // Step 1
  if (window._GW.step === 1) {
    if (!d.title || !d.category) {
      return "Please enter a title and select a category.";
    }
  }

  // Step 4 (wallet guard)
  if (window._GW.step === 4) {
    if (!d.budget || isNaN(d.budget)) {
      return "Enter a valid budget.";
    }

    if (window.ME && window.ME.balance < d.budget) {
      return "Insufficient wallet balance. Please top up to post this gig.";
    }
  }

  return null;
};

// ===================== NEXT (CRITICAL FIX) =====================
window._gwNext = function() {
  if (!window._GW) return;

  // 1. SAVE FIRST
  window._gwSave(); 

  // 2. VALIDATE SECOND
  const error = window._gwValidate();
  if (error) {
    alert(error);
    return;
  }

  // 3. PROGRESS
  if (window._GW.step < 5) {
    window._GW.step++;
    window._gwRender();
  } else {
    window._gwSubmit();
  }
};

// ===================== BACK =====================
window._gwBack = function () {
  if (window._GW.step > 1) {
    window._GW.step--;
    window._gwRender();
  }
};

// ===================== SUBMIT =====================
window._gwSubmit = function () {
  const d = window._GW.data;
  console.log("Submitting Gig:", d);
  alert("Gig posted & escrow locked!");
};

// ===================== RENDER =====================
window._gwRender = function () {
  const d = window._GW.data;
  const el = document.getElementById('gw-container');
  if (!el) return;

  // STEP 1
  if (_GW.step === 1) {
    el.innerHTML = `
      <h3>Step 1: Basic Info</h3>
      <input id="gw-title" placeholder="Title" value="${d.title || ''}">
      <select id="gw-cat">
        ${["Graphics","Tech","Writing"].map(opt => 
          `<option value="${opt}" ${opt === d.category ? "selected" : ""}>${opt}</option>`
        ).join("")}
      </select>
      <textarea id="gw-desc">${d.desc || ''}</textarea>
      <button onclick="_gwNext()">Continue</button>
    `;
  }

  // STEP 2 (SMART SKILLS)
  if (_GW.step === 2) {
    let suggestions = [];

    if (d.category === "Graphics") {
      suggestions = ["Logo Design", "Photoshop"];
    } else if (d.category === "Tech") {
      suggestions = ["React", "Python"];
    } else {
      suggestions = ["Writing", "Editing"];
    }

    el.innerHTML = `
      <h3>Step 2: Skills</h3>
      <select id="gw-skills" multiple>
        ${suggestions.map(s => 
          `<option value="${s}" ${(d.skills || []).includes(s) ? "selected" : ""}>${s}</option>`
        ).join("")}
      </select>
      <button onclick="_gwBack()">Back</button>
      <button onclick="_gwNext()">Continue</button>
    `;
  }

  // STEP 4
  if (_GW.step === 4) {
    el.innerHTML = `
      <h3>Step 4: Budget</h3>
      <input id="gw-budget" value="${d.budget || ''}" placeholder="₦ Amount">
      <button onclick="_gwBack()">Back</button>
      <button onclick="_gwNext()">Continue</button>
    `;
  }

  // STEP 5 (REVIEW)
  if (_GW.step === 5) {
    el.innerHTML = `
      <h3>Review</h3>
      <p><b>Title:</b> ${d.title}</p>
      <p><b>Category:</b> ${d.category}</p>
      <p><b>Skills:</b> ${(d.skills || []).join(", ")}</p>
      <p><b>Budget:</b> ₦${d.budget}</p>
      <button onclick="_gwBack()">Back</button>
      <button onclick="_gwNext()">Post & Lock Escrow</button>
    `;
  }
};
