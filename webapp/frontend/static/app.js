/* ════════════════════════════════════════════════════════════
   IMDb Clone — Frontend Application (Vanilla JS)
   SPA-like routing via hash navigation.
   ════════════════════════════════════════════════════════════ */

const API = "";  // same origin — Flask serves both API and static

// ── Utilities ──────────────────────────────────────────────
function $(sel) { return document.querySelector(sel); }
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

function formatType(t) {
    const map = { movie: "Movie", tvSeries: "TV Series", tvMiniSeries: "Mini-Series",
                  tvMovie: "TV Movie", short: "Short", tvShort: "TV Short",
                  tvEpisode: "Episode", tvSpecial: "TV Special", video: "Video",
                  videoGame: "Video Game" };
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
window.addEventListener("load", route);

function route() {
    const { page, params } = parseHash();
    switch (page) {
        case "home":          loadHome(); break;
        case "title":         loadTitle(params.id); break;
        case "credits":       loadCredits(params.id); break;
        case "series":        loadSeries(params.id, params.season); break;
        case "person":        loadPerson(params.id); break;
        case "search":        loadSearch(params.q, params.type, parseInt(params.page) || 1); break;
        default:              loadHome();
    }
}

// ── Search ─────────────────────────────────────────────────
function doSearch() {
    const q = $("#searchInput").value.trim();
    const type = $("#searchType").value;
    if (q.length >= 2) navigateTo("search", { q, type, page: 1 });
}
$("#searchInput").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

// ── Home Page ──────────────────────────────────────────────
async function loadHome() {
    showLoading();
    try {
        const data = await api("/api/home");
        let html = `
            <h2 class="section-title"><span class="icon">★</span> Top Rated</h2>
            <div class="card-grid">${data.topRated.map(cardHtml).join("")}</div>
            <h2 class="section-title"><span class="icon">🔥</span> Most Voted</h2>
            <div class="card-grid">${data.mostVoted.map(cardHtml).join("")}</div>
        `;
        $("#content").innerHTML = html;
    } catch (e) {
        $("#content").innerHTML = errorHtml("Could not load homepage", e.message);
    }
    hideLoading();
}

function cardHtml(t) {
    return `
        <div class="card" onclick="navigateTo('title',{id:'${t.tconst}'})">
            <div class="card-type">${formatType(t.title_type)}</div>
            <div class="card-title">${esc(t.primary_title)}</div>
            <div class="card-meta">
                ${t.start_year ? `<span>${t.start_year}</span>` : ""}
                ${t.runtime_minutes ? `<span>${t.runtime_minutes} min</span>` : ""}
            </div>
            <div class="card-rating">${ratingSmall(t.average_rating)}</div>
            ${t.genres ? `<div class="card-genres">${esc(t.genres)}</div>` : ""}
        </div>
    `;
}

// ── Title Summary ──────────────────────────────────────────
async function loadTitle(tconst) {
    if (!tconst) return loadHome();
    showLoading();
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
            seriesLink = `<button class="full-credits-link" onclick="navigateTo('series',{id:'${tconst}'})">📺 Episodes & Seasons</button>`;
        }

        $("#content").innerHTML = `
            <button class="back-btn" onclick="history.back()">← Back</button>
            <div class="title-detail">
                <div class="title-header">
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
                        ? `<div style="color:var(--text-muted);font-size:0.85rem;margin-top:8px">Original: ${esc(t.original_title)}</div>` : ""}
                </div>

                ${directorsHtml ? `<div class="crew-section"><h3>Directors</h3><div>${directorsHtml}</div></div>` : ""}
                ${writersHtml ? `<div class="crew-section"><h3>Writers</h3><div>${writersHtml}</div></div>` : ""}

                ${castHtml ? `<div class="cast-section"><h3>Top Cast</h3>${castHtml}</div>` : ""}

                <button class="full-credits-link" onclick="navigateTo('credits',{id:'${tconst}'})">👥 Full Cast & Crew</button>
                ${seriesLink}
            </div>
        `;
    } catch (e) {
        $("#content").innerHTML = errorHtml("Title not found", e.message);
    }
    hideLoading();
}

// ── Full Credits ───────────────────────────────────────────
async function loadCredits(tconst) {
    if (!tconst) return loadHome();
    showLoading();
    try {
        const data = await api(`/api/title/${tconst}/full-credits`);
        let groupsHtml = Object.entries(data.credits).map(([cat, people]) => `
            <div class="credits-group">
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

        let epListHtml = (eData.episodes || []).map(ep => `
            <div class="episode-card" onclick="navigateTo('title',{id:'${ep.tconst}'})">
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
            <div class="filmography-group">
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
                <div class="person-header">
                    <h1>${esc(p.primary_name)}</h1>
                    <div class="person-years">${years}</div>
                </div>
                ${filmoHtml || '<div class="empty-state"><p>No filmography data available.</p></div>'}
            </div>
        `;
    } catch (e) {
        $("#content").innerHTML = errorHtml("Person not found", e.message);
    }
    hideLoading();
}

// ── Search Results ─────────────────────────────────────────
async function loadSearch(q, type, page) {
    if (!q) return loadHome();
    showLoading();
    try {
        const data = await api(`/api/search?q=${encodeURIComponent(q)}&type=${type || "all"}&page=${page}`);
        let resultsHtml = "";

        if (data.results.length === 0) {
            resultsHtml = '<div class="empty-state"><div class="icon">🔍</div><p>No results found.</p></div>';
        } else if (data.results[0].result_type === "person") {
            resultsHtml = data.results.map(p => `
                <div class="person-row" style="padding:12px 0; cursor:pointer"
                     onclick="navigateTo('person',{id:'${p.nconst}'})">
                    <span class="person-name">${esc(p.primary_name)}</span>
                    <span class="person-role">${p.birth_year ? `Born ${p.birth_year}` : ""}</span>
                </div>
            `).join("");
        } else {
            resultsHtml = `<div class="card-grid">${data.results.map(cardHtml).join("")}</div>`;
        }

        let moreBtn = data.hasMore
            ? `<button class="load-more-btn" onclick="navigateTo('search',{q:'${esc(q)}',type:'${type}',page:${page+1}})">Load More →</button>`
            : "";

        $("#content").innerHTML = `
            <div class="search-results-info">
                Results for "<strong>${esc(q)}</strong>" ${type && type !== "all" ? `in ${type}s` : ""} — Page ${page}
            </div>
            ${resultsHtml}
            ${moreBtn}
        `;
    } catch (e) {
        $("#content").innerHTML = errorHtml("Search failed", e.message);
    }
    hideLoading();
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
