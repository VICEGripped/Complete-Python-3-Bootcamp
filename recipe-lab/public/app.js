// Recipe Lab front end. Plain JavaScript, no build step.
// Everything you save lives in this browser's localStorage.

(() => {
  "use strict";

  // ---------- Storage helpers ----------
  const KEYS = {
    recipes: "recipeLab.recipes",
    draft: "recipeLab.draft",
    selected: "recipeLab.selected",
    grocery: "recipeLab.grocery",
    theme: "recipeLab.theme",
  };
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function store(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      toast("Couldn't save — your browser storage may be full or blocked.");
      return false;
    }
  }

  let recipes = load(KEYS.recipes, []); // [{id, savedAt, idea, rating, notes, recipe}]
  let selected = new Set(load(KEYS.selected, []));
  let draft = load(KEYS.draft, null); // {idea, recipe, savedId}
  let grocery = load(KEYS.grocery, null); // {recipeIds, items, checked, hideStaples, createdAt}

  const saveRecipes = () => store(KEYS.recipes, recipes);
  const saveSelected = () => store(KEYS.selected, [...selected]);

  // ---------- DOM helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
  }

  // ---------- Theme ----------
  function setThemeIcon() {
    $("#themeToggle").textContent = document.documentElement.dataset.theme === "light" ? "🌙" : "☀️";
  }
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEYS.theme, next); } catch {}
    setThemeIcon();
  });
  setThemeIcon();

  // ---------- Navigation ----------
  let currentView = "create";
  function show(view) {
    currentView = view;
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
    const tabView = view === "detail" ? "recipes" : view;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === tabView));
    if (view === "recipes") renderList();
    if (view === "grocery") renderGrocery();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => show(t.dataset.view)));
  $("#backBtn").addEventListener("click", () => show("recipes"));

  // ---------- Create ----------
  const ideaInput = $("#ideaInput");
  $("#ideaChips").addEventListener("click", (e) => {
    if (e.target.classList.contains("chip")) {
      ideaInput.value = e.target.textContent;
      ideaInput.focus();
    }
  });

  const LOADING_LINES = [
    "Firing up the lab…",
    "Raiding the spice rack…",
    "Swapping grease for flavor…",
    "Mixing up the sauce from scratch…",
    "Checking the chicken is 165°F…",
    "Pricing it out at Aldi and WinCo…",
    "Writing steps a beginner can nail…",
    "Packing it for gig day…",
    "Plating it up…",
  ];
  let loadingTimer;

  $("#ideaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const idea = ideaInput.value.trim();
    if (!idea) {
      showError("Type a food idea or craving first — anything works, like “crunchy chicken tacos.”");
      return;
    }
    const btn = $("#generateBtn");
    btn.disabled = true;
    btn.textContent = "Cooking…";
    $("#errorBox").classList.add("hidden");
    $("#result").innerHTML = "";
    const loading = $("#loading");
    loading.classList.remove("hidden");
    let i = 0;
    $("#loadingText").textContent = LOADING_LINES[0];
    loadingTimer = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length;
      $("#loadingText").textContent = LOADING_LINES[i];
    }, 4000);

    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok || !data.recipe) {
        throw new Error(data.error || `Something went wrong (error ${res.status}). Please try again.`);
      }
      draft = { idea, recipe: data.recipe, savedId: null };
      store(KEYS.draft, draft);
      renderDraft();
    } catch (err) {
      const msg =
        err instanceof TypeError
          ? "Couldn't reach the Recipe Lab server. Is it still running in your terminal? (Run  npm start  again.)"
          : err.message;
      showError(msg);
    } finally {
      clearInterval(loadingTimer);
      loading.classList.add("hidden");
      btn.disabled = false;
      btn.textContent = "🔥 Cook it up";
    }
  });

  function showError(msg) {
    const box = $("#errorBox");
    box.innerHTML = `<strong>Uh oh.</strong> ${esc(msg)}`;
    box.classList.remove("hidden");
  }

  function renderDraft() {
    const out = $("#result");
    if (!draft) {
      out.innerHTML = "";
      return;
    }
    const saved = draft.savedId && recipes.some((r) => r.id === draft.savedId);
    out.innerHTML = `
      ${renderRecipe(draft.recipe)}
      <div class="card btn-row">
        <button class="btn btn-primary" id="saveDraftBtn" ${saved ? "disabled" : ""}>${saved ? "✅ Saved" : "💾 Save to My Recipes"}</button>
        <button class="btn" id="clearDraftBtn">🧹 Clear</button>
      </div>`;
    $("#saveDraftBtn").addEventListener("click", () => {
      const entry = { id: uid(), savedAt: Date.now(), idea: draft.idea, rating: 0, notes: "", recipe: draft.recipe };
      recipes.unshift(entry);
      if (saveRecipes()) {
        draft.savedId = entry.id;
        store(KEYS.draft, draft);
        toast("Saved to My Recipes!");
        renderDraft();
      } else {
        recipes.shift();
      }
    });
    $("#clearDraftBtn").addEventListener("click", () => {
      draft = null;
      try { localStorage.removeItem(KEYS.draft); } catch {}
      renderDraft();
      ideaInput.value = "";
      ideaInput.focus();
    });
  }

  // ---------- Recipe rendering ----------
  function renderRecipe(r) {
    const tags = (r.style_tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const gigTag = r.gig_day_friendly ? `<span class="tag gig">🎒 Gig day friendly</span>` : "";

    const ingredients = (r.ingredient_sections || [])
      .map(
        (sec) => `
        <div class="ing-section">
          <h4>${esc(sec.name)}</h4>
          <ul class="ing-list">
            ${(sec.ingredients || [])
              .map((ing) => `<li>${esc(ing.display)}${ing.note ? `<span class="ing-note">💡 ${esc(ing.note)}</span>` : ""}</li>`)
              .join("")}
          </ul>
        </div>`
      )
      .join("");

    let lastSection = null;
    let n = 0;
    const steps = (r.steps || [])
      .map((s) => {
        n++;
        const header = s.section && s.section !== lastSection ? `<li class="step-section">${esc(s.section)}</li>` : "";
        lastSection = s.section;
        return `${header}
          <li class="step">
            <div class="step-num">${n}</div>
            <div class="step-body">
              <p>${esc(s.instruction)}</p>
              ${s.done_when ? `<div class="cue done">✅ <strong>Done when:</strong> ${esc(s.done_when)}</div>` : ""}
              ${s.avoid ? `<div class="cue avoid">⚠️ <strong>Avoid:</strong> ${esc(s.avoid)}</div>` : ""}
            </div>
          </li>`;
      })
      .join("");

    const mp = r.meal_prep || {};
    const airFryer =
      r.air_fryer && r.air_fryer.applicable && r.air_fryer.instructions
        ? `<section class="card"><h3>💨 Air fryer option</h3><p>${esc(r.air_fryer.instructions)}</p></section>`
        : "";
    const equipment = (r.equipment || []).length
      ? `<p class="muted small" style="margin:12px 0 0">🍳 <strong>You'll need:</strong> ${esc(r.equipment.join(", "))}</p>`
      : "";

    return `
      <article class="recipe">
        <section class="card recipe-hero">
          <h2>${esc(r.title)}</h2>
          <div class="tags">${gigTag}${tags}</div>
          <p class="desc">${esc(r.description)}</p>
          <div class="stats">
            <div class="stat"><span class="k">Total time</span><span class="v">${esc(r.total_time)}</span></div>
            <div class="stat"><span class="k">Active time</span><span class="v">${esc(r.active_time)}</span></div>
            <div class="stat"><span class="k">Difficulty</span><span class="v">${esc(r.difficulty)}</span></div>
            <div class="stat"><span class="k">Cost / serving</span><span class="v">${esc(r.cost_per_serving)}</span></div>
            <div class="stat"><span class="k">Servings</span><span class="v">${esc(r.servings)}</span></div>
          </div>
          ${r.gig_day_note ? `<div class="gig-note">${r.gig_day_friendly ? "🎒" : "🏠"} ${esc(r.gig_day_note)}</div>` : ""}
          ${equipment}
        </section>

        <section class="card"><h3>🛒 Ingredients</h3>${ingredients}</section>

        <section class="card"><h3>👨‍🍳 Step by step</h3><ol class="steps">${steps}</ol></section>

        ${airFryer}

        <section class="card">
          <h3>📦 Meal prep</h3>
          <dl class="kv">
            <dt>Yield</dt><dd>${esc(mp.yield)}</dd>
            <dt>Storage</dt><dd>${esc(mp.storage)}</dd>
            <dt>Fridge</dt><dd>${esc(mp.fridge)}</dd>
            <dt>Freezer</dt><dd>${esc(mp.freezer)}</dd>
            <dt>Reheat</dt><dd>${esc(mp.reheat)}</dd>
          </dl>
        </section>

        <section class="card">
          <h3>🚀 Flavor upgrades</h3>
          <ul class="upgrades">${(r.flavor_upgrades || []).map((u) => `<li>${esc(u)}</li>`).join("")}</ul>
        </section>
      </article>`;
  }

  // ---------- My Recipes list ----------
  const costNum = (s) => {
    const m = String(s || "").match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : Infinity;
  };
  const miniStars = (n) => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "Not rated");

  function refreshTagFilter() {
    const sel = $("#filterTag");
    const current = sel.value;
    const tags = [...new Set(recipes.flatMap((r) => (r.recipe.style_tags || []).map((t) => t.toLowerCase())))].sort();
    sel.innerHTML = `<option value="">All styles</option>` + tags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
    sel.value = tags.includes(current) ? current : "";
  }

  function renderList() {
    refreshTagFilter();
    // drop selections for deleted recipes
    selected = new Set([...selected].filter((id) => recipes.some((r) => r.id === id)));
    saveSelected();

    const q = $("#searchInput").value.trim().toLowerCase();
    const tag = $("#filterTag").value;
    const minRating = Number($("#filterRating").value);
    const gigOnly = $("#filterGig").checked;
    const sort = $("#sortBy").value;

    let list = recipes.filter((e) => {
      const r = e.recipe;
      if (gigOnly && !r.gig_day_friendly) return false;
      if (minRating && (e.rating || 0) < minRating) return false;
      if (tag && !(r.style_tags || []).some((t) => t.toLowerCase() === tag)) return false;
      if (q) {
        const hay = [
          r.title, r.description, e.notes, e.idea, ...(r.style_tags || []),
          ...(r.ingredient_sections || []).flatMap((s) => [s.name, ...(s.ingredients || []).map((i) => i.display)]),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0) || b.savedAt - a.savedAt;
      if (sort === "cost") return costNum(a.recipe.cost_per_serving) - costNum(b.recipe.cost_per_serving);
      if (sort === "name") return a.recipe.title.localeCompare(b.recipe.title);
      return b.savedAt - a.savedAt;
    });

    const out = $("#recipeList");
    if (!recipes.length) {
      out.innerHTML = `<div class="card empty"><p style="font-size:2rem;margin:0">📖</p><p>No saved recipes yet.<br>Make one on the <strong>Create</strong> tab and tap <strong>Save</strong>.</p></div>`;
    } else if (!list.length) {
      out.innerHTML = `<div class="card empty">No recipes match those filters.</div>`;
    } else {
      out.innerHTML =
        `<p class="muted small" style="margin:0 0 8px">Tick the boxes to pick recipes for your grocery list.</p>` +
        list
          .map(
            (e) => `
          <div class="card r-card">
            <label class="select-box" aria-label="Add ${esc(e.recipe.title)} to grocery list">
              <input type="checkbox" data-select="${e.id}" ${selected.has(e.id) ? "checked" : ""} />
            </label>
            <button class="open" data-open="${e.id}">
              <h3>${esc(e.recipe.title)}</h3>
              <div class="r-meta">
                <span class="mini-stars">${miniStars(e.rating)}</span>
                · ${esc(e.recipe.total_time)} · ${esc(e.recipe.cost_per_serving)}/serving
                ${e.recipe.gig_day_friendly ? " · 🎒 Gig day" : ""}
              </div>
              ${e.notes ? `<div class="r-meta">📝 ${esc(e.notes.length > 80 ? e.notes.slice(0, 80) + "…" : e.notes)}</div>` : ""}
            </button>
          </div>`
          )
          .join("");
    }
    updateGroceryBar();
  }

  function updateGroceryBar() {
    const bar = $("#groceryBar");
    bar.classList.toggle("hidden", recipes.length === 0);
    const btn = $("#buildGroceryBtn");
    btn.disabled = selected.size === 0;
    btn.textContent = selected.size
      ? `🛒 Make grocery list (${selected.size} recipe${selected.size > 1 ? "s" : ""})`
      : "🛒 Tick recipes to make a grocery list";
  }

  $("#recipeList").addEventListener("change", (e) => {
    const id = e.target.dataset.select;
    if (!id) return;
    e.target.checked ? selected.add(id) : selected.delete(id);
    saveSelected();
    updateGroceryBar();
  });
  $("#recipeList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (btn) openDetail(btn.dataset.open);
  });
  ["#searchInput", "#filterTag", "#filterRating", "#sortBy", "#filterGig"].forEach((sel) =>
    $(sel).addEventListener(sel === "#searchInput" ? "input" : "change", renderList)
  );

  // ---------- Saved recipe detail ----------
  function openDetail(id) {
    const entry = recipes.find((r) => r.id === id);
    if (!entry) return;
    const starBtns = [1, 2, 3, 4, 5]
      .map((n) => `<button class="star-btn ${n <= entry.rating ? "on" : ""}" data-star="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`)
      .join("");
    $("#detail").innerHTML = `
      <section class="card notes-box">
        <h3>⭐ Your rating & notes</h3>
        <div class="stars" role="group" aria-label="Rating">${starBtns}</div>
        <textarea id="notesInput" rows="3" placeholder="e.g. needed more garlic, double the sauce next time">${esc(entry.notes)}</textarea>
        <p class="muted small" id="notesStatus" style="margin:6px 0 0">Notes save automatically.</p>
      </section>
      ${renderRecipe(entry.recipe)}
      <div class="card btn-row">
        <button class="btn" id="addToListBtn">${selected.has(id) ? "✅ On grocery picks" : "🛒 Add to grocery picks"}</button>
        <button class="btn btn-danger" id="deleteBtn">🗑️ Delete recipe</button>
      </div>
      ${entry.idea ? `<p class="muted small">Original idea: “${esc(entry.idea)}” · Saved ${new Date(entry.savedAt).toLocaleDateString()}</p>` : ""}`;

    $("#detail .stars").addEventListener("click", (e) => {
      const n = Number(e.target.dataset.star);
      if (!n) return;
      entry.rating = entry.rating === n ? 0 : n; // tap the same star again to clear
      saveRecipes();
      document.querySelectorAll("#detail .star-btn").forEach((b) => b.classList.toggle("on", Number(b.dataset.star) <= entry.rating));
    });
    let notesTimer;
    $("#notesInput").addEventListener("input", (e) => {
      clearTimeout(notesTimer);
      $("#notesStatus").textContent = "Saving…";
      notesTimer = setTimeout(() => {
        entry.notes = e.target.value;
        saveRecipes();
        $("#notesStatus").textContent = "✓ Saved";
      }, 400);
    });
    $("#addToListBtn").addEventListener("click", (e) => {
      selected.has(id) ? selected.delete(id) : selected.add(id);
      saveSelected();
      e.target.textContent = selected.has(id) ? "✅ On grocery picks" : "🛒 Add to grocery picks";
    });
    $("#deleteBtn").addEventListener("click", () => {
      if (!confirm(`Delete “${entry.recipe.title}”? This can't be undone.`)) return;
      recipes = recipes.filter((r) => r.id !== id);
      selected.delete(id);
      saveRecipes();
      saveSelected();
      toast("Recipe deleted");
      show("recipes");
    });
    show("detail");
  }

  // ---------- Grocery list ----------
  const SECTIONS = [
    ["produce", "🥬 Produce"],
    ["meat", "🥩 Meat & Eggs"],
    ["dairy", "🧀 Dairy"],
    ["bakery", "🍞 Bread & Tortillas"],
    ["frozen", "🧊 Frozen"],
    ["pantry", "🥫 Pantry & Spices"],
    ["other", "🛍️ Other"],
  ];
  const UNIT_ALIASES = {
    lbs: "lb", pound: "lb", pounds: "lb", ounce: "oz", ounces: "oz", cups: "cup", c: "cup",
    tablespoon: "tbsp", tablespoons: "tbsp", tbs: "tbsp", teaspoon: "tsp", teaspoons: "tsp",
    cans: "can", cloves: "clove", each: "", whole: "", large: "", medium: "", small: "",
  };
  const normUnit = (u) => {
    const x = String(u || "").trim().toLowerCase().replace(/\.$/, "");
    return x in UNIT_ALIASES ? UNIT_ALIASES[x] : x;
  };
  const fmtNum = (n) => {
    const r = Math.round(n * 100) / 100;
    const whole = Math.floor(r);
    const frac = r - whole;
    const fracs = [[0.25, "¼"], [0.33, "⅓"], [0.5, "½"], [0.67, "⅔"], [0.75, "¾"]];
    const f = fracs.find(([v]) => Math.abs(frac - v) < 0.02);
    if (f) return (whole ? whole : "") + f[1];
    return String(r);
  };

  function buildGrocery(ids) {
    const map = new Map();
    for (const id of ids) {
      const entry = recipes.find((r) => r.id === id);
      if (!entry) continue;
      for (const sec of entry.recipe.ingredient_sections || []) {
        for (const ing of sec.ingredients || []) {
          const name = String(ing.grocery_name || ing.display || "").trim().toLowerCase();
          if (!name) continue;
          const section = SECTIONS.some(([k]) => k === ing.store_section) ? ing.store_section : "other";
          const key = `${section}|${name}`;
          if (!map.has(key)) map.set(key, { key, name, section, staple: !!ing.pantry_staple, amounts: {}, other: 0, recipes: new Set() });
          const item = map.get(key);
          item.staple = item.staple && !!ing.pantry_staple;
          item.recipes.add(entry.recipe.title);
          const amt = Number(ing.amount);
          if (amt > 0) {
            const u = normUnit(ing.unit);
            item.amounts[u] = (item.amounts[u] || 0) + amt;
          } else {
            item.other++;
          }
        }
      }
    }
    const items = [...map.values()].map((it) => {
      const parts = Object.entries(it.amounts).map(([u, n]) => `${fmtNum(n)}${u ? " " + u : ""}`);
      if (!parts.length && it.other) parts.push("as needed");
      return { key: it.key, name: it.name, section: it.section, staple: it.staple, qty: parts.join(" + "), recipes: [...it.recipes] };
    });
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }

  $("#buildGroceryBtn").addEventListener("click", () => {
    if (!selected.size) return;
    const ids = [...selected];
    const prevChecked = grocery && grocery.checked ? grocery.checked : {};
    const items = buildGrocery(ids);
    // keep checkmarks for items still on the list
    const checked = {};
    items.forEach((it) => { if (prevChecked[it.key]) checked[it.key] = true; });
    grocery = { recipeIds: ids, items, checked, hideStaples: grocery ? !!grocery.hideStaples : false, createdAt: Date.now() };
    store(KEYS.grocery, grocery);
    show("grocery");
  });

  function renderGrocery() {
    const out = $("#grocery");
    if (!grocery || !grocery.items.length) {
      out.innerHTML = `<div class="card empty"><p style="font-size:2rem;margin:0">🛒</p>
        <p>No grocery list yet.<br>Go to <strong>My Recipes</strong>, tick the recipes you're making, and tap <strong>Make grocery list</strong>.</p></div>`;
      return;
    }
    const titles = grocery.recipeIds.map((id) => recipes.find((r) => r.id === id)?.recipe.title).filter(Boolean);
    const visible = grocery.items.filter((it) => !(grocery.hideStaples && it.staple));
    const left = visible.filter((it) => !grocery.checked[it.key]).length;

    const sections = SECTIONS.map(([key, label]) => {
      const its = visible.filter((it) => it.section === key);
      if (!its.length) return "";
      return `<section class="card g-section">
        <h3>${label}</h3>
        ${its
          .map(
            (it) => `
          <label class="g-item ${grocery.checked[it.key] ? "checked" : ""}">
            <input type="checkbox" data-item="${esc(it.key)}" ${grocery.checked[it.key] ? "checked" : ""} />
            <span>
              <span class="g-name">${esc(it.name)}</span>${it.staple ? `<span class="staple-badge">staple – check pantry</span>` : ""}
              <span class="g-qty" style="display:block">${esc(it.qty)}${titles.length > 1 ? ` · ${esc(it.recipes.join(", "))}` : ""}</span>
            </span>
          </label>`
          )
          .join("")}
      </section>`;
    }).join("");

    out.innerHTML = `
      <section class="card">
        <div class="g-head">
          <h2 style="font-size:1.4rem">🛒 Grocery list</h2>
          <span class="muted">${left} item${left === 1 ? "" : "s"} left</span>
        </div>
        <p class="muted small" style="margin:6px 0 0">For: ${esc(titles.join(" · ") || "deleted recipes")}</p>
        <label class="toggle"><input type="checkbox" id="hideStaples" ${grocery.hideStaples ? "checked" : ""} /> Hide pantry staples (salt, spices, oil…)</label>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn" id="uncheckAll">↩️ Uncheck all</button>
          <button class="btn" id="copyList">📋 Copy list</button>
        </div>
      </section>
      ${sections}`;

    $("#hideStaples").addEventListener("change", (e) => {
      grocery.hideStaples = e.target.checked;
      store(KEYS.grocery, grocery);
      renderGrocery();
    });
    $("#uncheckAll").addEventListener("click", () => {
      grocery.checked = {};
      store(KEYS.grocery, grocery);
      renderGrocery();
    });
    $("#copyList").addEventListener("click", async () => {
      const text = SECTIONS.map(([key, label]) => {
        const its = visible.filter((it) => it.section === key && !grocery.checked[it.key]);
        return its.length ? `${label.replace(/^\S+\s/, "")}\n` + its.map((it) => `- ${it.name} (${it.qty})`).join("\n") : "";
      }).filter(Boolean).join("\n\n");
      try {
        await navigator.clipboard.writeText(text);
        toast("Copied! Paste it into your notes app.");
      } catch {
        toast("Couldn't copy on this device.");
      }
    });
  }

  $("#grocery").addEventListener("change", (e) => {
    const key = e.target.dataset.item;
    if (!key) return;
    if (e.target.checked) grocery.checked[key] = true;
    else delete grocery.checked[key];
    store(KEYS.grocery, grocery);
    renderGrocery();
  });

  // ---------- Start ----------
  if (draft) {
    ideaInput.value = draft.idea || "";
    renderDraft();
  }
  show("create");
})();
