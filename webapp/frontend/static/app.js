/* ════════════════════════════════════════════════════════════
   IMDb Clone — Frontend v2.0
   Poster-based cards, streaming links, advanced filters,
   skeleton loaders, scroll-triggered animations
   ════════════════════════════════════════════════════════════ */

const API = "";
const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%231a1a2e'/%3E%3Cstop offset='1' stop-color='%2316213e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='450' fill='url(%23g)'/%3E%3Ctext x='150' y='200' text-anchor='middle' font-size='64' fill='%23333'%3E%F0%9F%8E%AC%3C/text%3E%3Ctext x='150' y='260' text-anchor='middle' font-size='16' fill='%23555' font-family='sans-serif'%3ENo Poster%3C/text%3E%3C/svg%3E";

// ── Utilities ──────────────────────────────────────────────
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function show(el) { el && el.classList.remove("hidden"); }
function hide(el) { el && el.classList.add("hidden"); }

function showLoading() { show($("#loading")); hide($("#content")); }
function hideLoading() { hide($("#loading")); show($("#content")); }

async function api(path) {
    const adult = $("#adultToggle").checked;
    const sep = path.includes("?") ? "&" : "?";
    const url = `${API}${path}${sep}includeAdult=${adult}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

function posterUrl(url) {
    return url || PLACEHOLDER;
}

function formatType(t) {
    const map = {
        movie: "Movie", tvSeries: "TV Series", tvMiniSeries: "Mini-Series",
        tvMovie: "TV Movie", short: "Short", tvShort: "TV Short",
        tvEpisode: "Episode", tvSpecial: "TV Special", video: "Video",
        videoGame: "Video Game"
    };
    return map[t] || t || "";
}

function ratingHtml(avg, votes) {
    if (!avg) return "";
    const v = votes ? ` <span class="votes">(${Number(votes).toLocaleString()})</span>` : "";
    return `<span class="rating-badge"><span class="star">★</span> ${avg}${v}</span>`;
}

function ratingSmall(avg) {
    if (!avg) return '<span style="color:var(--text-muted)">—</span>';
    return `<span class="star">★</span> ${avg}`;
}

// ── Skeleton Loaders ───────────────────────────────────────
function skeletonCards(n = 10) {
    return `<div class="card-grid">${Array(n).fill(`
        <div class="skeleton-card">
            <div class="skeleton skeleton-poster"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
        </div>
    `).join("")}</div>`;
}

function skeletonDetail() {
    return `<div class="title-hero">
        <div class="skeleton" style="width:260px;aspect-ratio:2/3;border-radius:14px"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:12px">
            <div class="skeleton" style="height:32px;width:60%"></div>
            <div class="skeleton" style="height:18px;width:40%"></div>
            <div class="skeleton" style="height:44px;width:30%"></div>
            <div class="skeleton" style="height:14px;width:80%"></div>
            <div class="skeleton" style="height:14px;width:70%"></div>
        </div>
    </div>`;
}

// ── Scroll Animation Observer ──────────────────────────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

function observeAnimations() {
    $$(".animate-in").forEach(el => observer.observe(el));
}

// ── Navigation ─────────────────────────────────────────────
function navigateTo(page, params = {}) {
    const qs = new URLSearchParams(params).toString();
    window.location.hash = qs ? `${page}?${qs}` : page;
}

function parseHash() {
    const raw = window.location.hash.slice(1) || "home";
    const [page, qs] = raw.split("?");
    const params = Object.fromEntries(new URLSearchParams(qs || ""));
    return { page, params };
}

window.addEventListener("hashchange", route);
window.addEventListener("load", () => { loadGenres(); route(); });

function route() {
    // Trigger content fade animation
    const content = $("#content");
    content.style.animation = "none";
    content.offsetHeight; // reflow
    content.style.animation = "";

    const { page, params } = parseHash();
    switch (page) {
        case "home": loadHome(); break;
        case "title": loadTitle(params.id); break;
        case "credits": loadCredits(params.id); break;
        case "series": loadSeries(params.id, params.season); break;
        case "person": loadPerson(params.id); break;
        case "search": loadSearch(params); break;
        default: loadHome();
    }
}

// ── Filters ────────────────────────────────────────────────
function toggleFilters() {
    const panel = $("#filterPanel");
    const btn = $("#filterToggleBtn");
    panel.classList.toggle("expanded");
    panel.classList.toggle("collapsed");
    btn.classList.toggle("active");
}

function getFilters() {
    return {
        yearFrom: $("#filterYearFrom").value || "",
        yearTo: $("#filterYearTo").value || "",
        genre: $("#filterGenre").value || "",
        minRating: $("#filterMinRating").value || "",
        sortBy: $("#filterSortBy").value || "",
    };
}

function clearFilters() {
    $("#filterYearFrom").value = "";
    $("#filterYearTo").value = "";
    $("#filterGenre").value = "";
    $("#filterMinRating").value = "";
    $("#filterSortBy").value = "";
    updateFilterBadges();
}

function updateFilterBadges() {
    const f = getFilters();
    const badges = [];
    if (f.yearFrom) badges.push(`From: ${f.yearFrom}`);
    if (f.yearTo) badges.push(`To: ${f.yearTo}`);
    if (f.genre) badges.push(`Genre: ${f.genre}`);
    if (f.minRating) badges.push(`Rating ≥ ${f.minRating}`);
    if (f.sortBy) badges.push(`Sort: ${f.sortBy}`);
    $("#activeFilters").innerHTML = badges.map(b =>
        `<span class="filter-badge">${b}</span>`
    ).join("");
}

// Listen for filter changes
["filterYearFrom", "filterYearTo", "filterGenre", "filterMinRating", "filterSortBy"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", updateFilterBadges);
});

async function loadGenres() {
    try {
        const data = await fetch(`${API}/api/genres`).then(r => r.json());
        const sel = $("#filterGenre");
        (data.genres || []).forEach(g => {
            const opt = document.createElement("option");
            opt.value = g; opt.textContent = g;
            sel.appendChild(opt);
        });
    } catch (e) { /* ignore */ }
}

// ── Search ─────────────────────────────────────────────────
function doSearch() {
    const q = $("#searchInput").value.trim();
    const type = $("#searchType").value;
    const f = getFilters();
    if (q.length >= 2) {
        navigateTo("search", { q, type, page: 1, ...f });
    }
}
$("#searchInput").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

// ══════════════════════════════════════════════════════════
// PAGE RENDERERS
// ══════════════════════════════════════════════════════════

// ── Home Page ──────────────────────────────────────────────
async function loadHome() {
    $("#content").innerHTML = `
        <h2 class="section-title"><span class="icon">★</span> Top Rated</h2>
        ${skeletonCards(10)}
        <h2 class="section-title"><span class="icon">🔥</span> Most Voted</h2>
        ${skeletonCards(10)}
    `;
    hide($("#loading")); show($("#content"));

    try {
        const data = await api("/api/home");
        $("#content").innerHTML = `
            <h2 class="section-title animate-in"><span class="icon">★</span> Top Rated</h2>
            <div class="card-grid">${data.topRated.map((t, i) => cardHtml(t, i)).join("")}</div>
            <h2 class="section-title animate-in"><span class="icon">🔥</span> Most Voted</h2>
            <div class="card-grid">${data.mostVoted.map((t, i) => cardHtml(t, i)).join("")}</div>
        `;
        observeAnimations();
    } catch (e) {
        $("#content").innerHTML = errorHtml("Could not load homepage", e.message);
    }
}

function cardHtml(t, idx = 0) {
    const delay = Math.min(idx * 50, 500);
    return `
        <div class="card animate-in" style="transition-delay:${delay}ms"
             onclick="navigateTo('title',{id:'${t.tconst}'})">
            <div class="card-poster-wrap">
                <img class="card-poster" src="${posterUrl(t.poster_url)}"
                     alt="${esc(t.primary_title)}" loading="lazy"
                     onerror="this.src='${PLACEHOLDER}'">
                ${t.average_rating ? `<div class="card-rating-overlay"><span class="star">★</span> ${t.average_rating}</div>` : ""}
                <div class="card-type-overlay">${formatType(t.title_type)}</div>
            </div>
            <div class="card-body">
                <div class="card-title">${esc(t.primary_title)}</div>
                <div class="card-meta">
                    ${t.start_year ? `<span>${t.start_year}</span>` : ""}
                    ${t.runtime_minutes ? `<span>${t.runtime_minutes} min</span>` : ""}
                </div>
                ${t.genres ? `<div class="card-genres">${esc(t.genres)}</div>` : ""}
            </div>
        </div>
    `;
}

// ── Title Summary ──────────────────────────────────────────
async function loadTitle(tconst) {
    if (!tconst) return loadHome();
    $("#content").innerHTML = skeletonDetail();
    hide($("#loading")); show($("#content"));

    try {
        const t = await api(`/api/title/${tconst}`);

        let genresHtml = (t.genres || []).map(g => `<span class="genre-tag">${esc(g)}</span>`).join("");

        let directorsHtml = (t.directors || []).map(d =>
            `<span class="person-name" onclick="navigateTo('person',{id:'${d.nconst}'})">${esc(d.primary_name)}</span>`
        ).join(", ");

        let writersHtml = (t.writers || []).map(w =>
            `<span class="person-name" onclick="navigateTo('person',{id:'${w.nconst}'})">${esc(w.primary_name)}</span>`
        ).join(", ");

        let castHtml = (t.cast || []).map(c => `
            <div class="person-row">
                <span class="person-name" onclick="navigateTo('person',{id:'${c.nconst}'})">${esc(c.primary_name)}</span>
                <span class="person-role">${c.characters ? esc(c.characters) : ""}</span>
            </div>
        `).join("");

        let seriesLink = "";
        if (t.title_type === "tvSeries" || t.title_type === "tvMiniSeries") {
            seriesLink = `<button class="action-btn" onclick="navigateTo('series',{id:'${tconst}'})">📺 Episodes & Seasons</button>`;
        }

        // Streaming section (loaded async)
        const streamingPlaceholder = `<div id="streaming-${tconst}" class="streaming-section"></div>`;

        $("#content").innerHTML = `
            <button class="back-btn" onclick="history.back()">← Back</button>
            <div class="title-detail animate-in">
                <div class="title-hero">
                    <div class="title-poster-wrap">
                        <img class="title-poster" src="${posterUrl(t.poster_url)}"
                             alt="${esc(t.primary_title)}"
                             onerror="this.src='${PLACEHOLDER}'">
                    </div>
                    <div class="title-info">
                        <h1>${esc(t.primary_title)}</h1>
                        <div class="meta-row">
                            <span class="meta-tag">${formatType(t.title_type)}</span>
                            ${t.start_year ? `<span>${t.start_year}${t.end_year ? "–" + t.end_year : ""}</span>` : ""}
                            ${t.runtime_minutes ? `<span>${t.runtime_minutes} min</span>` : ""}
                            ${t.is_adult ? '<span class="meta-tag" style="color:var(--red)">Adult</span>' : ""}
                        </div>
                        ${ratingHtml(t.average_rating, t.num_votes)}
                        <div class="genre-tags">${genresHtml}</div>
                        ${t.original_title && t.original_title !== t.primary_title
                ? `<div style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">Original: ${esc(t.original_title)}</div>` : ""}

                        ${streamingPlaceholder}

                        <div class="title-actions">
                            <button class="action-btn" onclick="navigateTo('credits',{id:'${tconst}'})">👥 Full Cast & Crew</button>
                            ${seriesLink}
                        </div>
                    </div>
                </div>

                ${directorsHtml ? `<div class="crew-section animate-in"><h3>Directors</h3><div>${directorsHtml}</div></div>` : ""}
                ${writersHtml ? `<div class="crew-section animate-in"><h3>Writers</h3><div>${writersHtml}</div></div>` : ""}
                ${castHtml ? `<div class="cast-section animate-in"><h3>Top Cast (${t.cast.length})</h3>${castHtml}</div>` : ""}
            </div>
        `;
        observeAnimations();

        // Load streaming links async (non-blocking)
        loadStreaming(tconst);

    } catch (e) {
        $("#content").innerHTML = errorHtml("Title not found", e.message);
    }
}

async function loadStreaming(tconst) {
    try {
        const data = await api(`/api/title/${tconst}/streaming`);
        const el = document.getElementById(`streaming-${tconst}`);
        if (!el || !data.links || data.links.length === 0) return;

        el.innerHTML = `
            <h3>📡 Where to Watch</h3>
            <div class="streaming-links">
                ${data.links.map(l => `
                    <a class="streaming-btn" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"
                       style="border-color:${l.color}22">
                        <span class="platform-icon">${l.icon}</span>
                        ${esc(l.platform)}
                    </a>
                `).join("")}
            </div>
        `;
    } catch (e) { /* streaming is optional, fail silently */ }
}

// ── Full Credits ───────────────────────────────────────────
async function loadCredits(tconst) {
    if (!tconst) return loadHome();
    showLoading();
    try {
        const data = await api(`/api/title/${tconst}/full-credits`);
        let groupsHtml = Object.entries(data.credits).map(([cat, people]) => `
            <div class="credits-group animate-in">
                <h3>${esc(cat)} (${people.length})</h3>
                ${people.map(p => `
                    <div class="person-row">
                        <span class="person-name" onclick="navigateTo('person',{id:'${p.nconst}'})">${esc(p.primary_name)}</span>
                        <span class="person-role">${p.characters ? esc(p.characters) : (p.job ? esc(p.job) : "")}</span>
                    </div>
                `).join("")}
            </div>
        `).join("");

        $("#content").innerHTML = `
            <button class="back-btn" onclick="navigateTo('title',{id:'${tconst}'})">← Back to ${esc(data.primary_title)}</button>
            <h2 class="section-title">Full Cast & Crew — ${esc(data.primary_title)}</h2>
            ${groupsHtml}
        `;
        observeAnimations();
    } catch (e) {
        $("#content").innerHTML = errorHtml("Credits not found", e.message);
    }
    hideLoading();
}

// ── Series / Episodes ──────────────────────────────────────
async function loadSeries(tconst, season) {
    if (!tconst) return loadHome();
    showLoading();
    try {
        const sData = await api(`/api/series/${tconst}/seasons`);
        season = season ? parseInt(season) : (sData.seasons[0] || 1);

        const eData = await api(`/api/series/${tconst}/episodes?season=${season}`);

        let seasonBtns = sData.seasons.map(s =>
            `<button class="season-btn ${s === season ? "active" : ""}"
                     onclick="navigateTo('series',{id:'${tconst}',season:${s}})">${s}</button>`
        ).join("");

        let epListHtml = (eData.episodes || []).map((ep, i) => `
            <div class="episode-card animate-in" style="transition-delay:${i * 60}ms"
                 onclick="navigateTo('title',{id:'${ep.tconst}'})">
                <div class="episode-num">${ep.episode_number || "?"}</div>
                <div class="episode-info">
                    <div class="ep-title">${esc(ep.primary_title)}</div>
                    <div class="ep-meta">
                        ${ep.start_year ? ep.start_year : ""}
                        ${ep.runtime_minutes ? ` · ${ep.runtime_minutes} min` : ""}
                    </div>
                </div>
                <div class="episode-rating">${ratingSmall(ep.average_rating)}</div>
            </div>
        `).join("");

        if (!epListHtml) epListHtml = '<div class="empty-state"><div class="icon">📺</div><p>No episodes found for this season.</p></div>';

        $("#content").innerHTML = `
            <button class="back-btn" onclick="navigateTo('title',{id:'${tconst}'})">← Back to ${esc(sData.primary_title)}</button>
            <h2 class="section-title">${esc(sData.primary_title)} — Episodes</h2>
            <div class="season-selector"><strong style="padding:6px 0;color:var(--text-secondary)">Season:</strong>${seasonBtns}</div>
            <div class="episode-list">${epListHtml}</div>
        `;
        observeAnimations();
    } catch (e) {
        $("#content").innerHTML = errorHtml("Episodes not found", e.message);
    }
    hideLoading();
}

// ── Person ─────────────────────────────────────────────────
async function loadPerson(nconst) {
    if (!nconst) return loadHome();
    showLoading();
    try {
        const p = await api(`/api/person/${nconst}`);
        let years = "";
        if (p.birth_year) years = `Born ${p.birth_year}`;
        if (p.death_year) years += ` — Died ${p.death_year}`;

        let filmoHtml = Object.entries(p.filmography || {}).map(([cat, titles]) => `
            <div class="filmography-group animate-in">
                <h3>${esc(cat)} (${titles.length})</h3>
                ${titles.map(t => `
                    <div class="filmography-item">
                        <span class="filmography-year">${t.start_year || ""}</span>
                        <span class="filmography-title" onclick="navigateTo('title',{id:'${t.tconst}'})">${esc(t.primary_title)}</span>
                        ${t.characters ? `<span class="filmography-chars">${esc(t.characters)}</span>` : ""}
                        <span class="filmography-rating">${ratingSmall(t.average_rating)}</span>
                    </div>
                `).join("")}
            </div>
        `).join("");

        $("#content").innerHTML = `
            <button class="back-btn" onclick="history.back()">← Back</button>
            <div class="person-detail">
                <div class="person-header animate-in">
                    <h1>${esc(p.primary_name)}</h1>
                    <div class="person-years">${years}</div>
                </div>
                ${filmoHtml || '<div class="empty-state"><p>No filmography data available.</p></div>'}
            </div>
        `;
        observeAnimations();
    } catch (e) {
        $("#content").innerHTML = errorHtml("Person not found", e.message);
    }
    hideLoading();
}

// ── Search Results ─────────────────────────────────────────
async function loadSearch(params) {
    const q = params.q;
    const type = params.type || "all";
    const page = parseInt(params.page) || 1;
    if (!q) return loadHome();

    // Show skeleton
    $("#content").innerHTML = `
        <div class="search-results-info">Searching for "<strong>${esc(q)}</strong>"...</div>
        ${skeletonCards(8)}
    `;
    hide($("#loading")); show($("#content"));

    try {
        // Build filter query string
        let filterQs = `q=${encodeURIComponent(q)}&type=${type}&page=${page}`;
        if (params.yearFrom) filterQs += `&yearFrom=${params.yearFrom}`;
        if (params.yearTo) filterQs += `&yearTo=${params.yearTo}`;
        if (params.genre) filterQs += `&genre=${encodeURIComponent(params.genre)}`;
        if (params.minRating) filterQs += `&minRating=${params.minRating}`;
        if (params.sortBy) filterQs += `&sortBy=${params.sortBy}`;

        const data = await api(`/api/search?${filterQs}`);
        let resultsHtml = "";

        if (data.results.length === 0) {
            resultsHtml = '<div class="empty-state"><div class="icon">🔍</div><p>No results found.</p></div>';
        } else if (data.results[0].result_type === "person") {
            resultsHtml = data.results.map(p => `
                <div class="person-row animate-in" style="padding:12px 0; cursor:pointer"
                     onclick="navigateTo('person',{id:'${p.nconst}'})">
                    <span class="person-name">${esc(p.primary_name)}</span>
                    <span class="person-role">${p.birth_year ? `Born ${p.birth_year}` : ""}</span>
                </div>
            `).join("");
        } else {
            resultsHtml = `<div class="card-grid">${data.results.map((t, i) => cardHtml(t, i)).join("")}</div>`;
        }

        // Build active filter display
        const activeFilters = [];
        if (params.yearFrom) activeFilters.push(`From: ${params.yearFrom}`);
        if (params.yearTo) activeFilters.push(`To: ${params.yearTo}`);
        if (params.genre) activeFilters.push(`Genre: ${params.genre}`);
        if (params.minRating) activeFilters.push(`Rating ≥ ${params.minRating}`);
        if (params.sortBy) activeFilters.push(`Sort: ${params.sortBy}`);

        const filterDisplay = activeFilters.length
            ? `<div style="margin-bottom:12px">${activeFilters.map(f => `<span class="filter-badge">${f}</span>`).join(" ")}</div>`
            : "";

        let moreBtn = data.hasMore
            ? `<button class="load-more-btn" onclick="navigateTo('search',{q:'${esc(q)}',type:'${type}',page:${page + 1},yearFrom:'${params.yearFrom || ""}',yearTo:'${params.yearTo || ""}',genre:'${params.genre || ""}',minRating:'${params.minRating || ""}',sortBy:'${params.sortBy || ""}'})">Load More →</button>`
            : "";

        $("#content").innerHTML = `
            <div class="search-results-info">
                Results for "<strong>${esc(q)}</strong>" ${type && type !== "all" ? `in ${type}s` : ""} — Page ${page}
            </div>
            ${filterDisplay}
            ${resultsHtml}
            ${moreBtn}
        `;
        observeAnimations();
    } catch (e) {
        $("#content").innerHTML = errorHtml("Search failed", e.message);
    }
}

// ── Helpers ────────────────────────────────────────────────
function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
}

function errorHtml(title, detail) {
    return `<div class="empty-state"><div class="icon">⚠️</div><p><strong>${title}</strong></p><p style="font-size:0.85rem">${detail || ""}</p></div>`;
}
