/* ════════════════════════════════════════════════════════════
   IMDb Clone — Frontend v3.0  (TMDB-Powered)
   Real posters, debounced search, pagination, cast grid,
   watch providers, similar movies, skeleton loaders
   ════════════════════════════════════════════════════════════ */
const API = "";
const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%231a1a2e'/%3E%3Ctext x='150' y='225' text-anchor='middle' fill='%23555' font-size='16' font-family='sans-serif'%3ENo Poster%3C/text%3E%3C/svg%3E";
const PROFILE_PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 185 278'%3E%3Crect width='185' height='278' fill='%231a1a2e'/%3E%3Ctext x='92' y='139' text-anchor='middle' fill='%23555' font-size='48'%3E👤%3C/text%3E%3C/svg%3E";

// ── Utilities ──
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const show = el => el && el.classList.remove("hidden");
const hide = el => el && el.classList.add("hidden");
const showLoading = () => { show($("#loading")); hide($("#content")); };
const hideLoading = () => { hide($("#loading")); show($("#content")); };

async function api(path) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
}

function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function poster(url) { return url || PLACEHOLDER; }
function profile(url) { return url || PROFILE_PH; }
function fmtVotes(n) { return n ? Number(n).toLocaleString() : "0"; }

function fmtType(t) {
    return {
        movie: "Movie", tv: "TV Series", tvSeries: "TV Series", tvMiniSeries: "Mini-Series",
        person: "Person", short: "Short"
    }[t] || t || "";
}

// ── Skeleton Loaders ──
function skeletonCards(n = 10) {
    return `<div class="card-grid">${Array(n).fill(`
        <div class="skeleton-card"><div class="skeleton skeleton-poster"></div>
        <div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>`).join("")}</div>`;
}
function skeletonDetail() {
    return `<div class="title-hero"><div class="skeleton" style="width:260px;aspect-ratio:2/3;border-radius:14px"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:12px"><div class="skeleton" style="height:32px;width:60%"></div>
    <div class="skeleton" style="height:18px;width:40%"></div><div class="skeleton" style="height:14px;width:80%"></div></div></div>`;
}

// ── Scroll Animation Observer ──
const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); } });
}, { threshold: 0.08 });
function observeAnimations() { $$(".animate-in").forEach(el => observer.observe(el)); }

// ── Navigation ──
function navigateTo(page, params = {}) {
    const qs = new URLSearchParams(params).toString();
    window.location.hash = qs ? `${page}?${qs}` : page;
}
function parseHash() {
    const raw = window.location.hash.slice(1) || "home";
    const [page, qs] = raw.split("?");
    return { page, params: Object.fromEntries(new URLSearchParams(qs || "")) };
}
window.addEventListener("hashchange", route);
window.addEventListener("load", () => { loadGenres(); route(); });

function route() {
    const c = $("#content"); c.style.animation = "none"; c.offsetHeight; c.style.animation = "";
    const { page, params } = parseHash();
    switch (page) {
        case "home": loadHome(); break;
        case "title": loadTitle(params.id, params.type); break;
        case "credits": loadCredits(params.id, params.type); break;
        case "series": loadSeries(params.id, params.season); break;
        case "person": loadPerson(params.id); break;
        case "search": loadSearch(params); break;
        case "discover": loadDiscover(params); break;
        default: loadHome();
    }
}

// ── Filters ──
function toggleFilters() {
    const p = $("#filterPanel"); const b = $("#filterToggleBtn");
    p.classList.toggle("expanded"); p.classList.toggle("collapsed"); b.classList.toggle("active");
}
function applyFilters() { navigateTo("discover", getFilterParams()); }
function getFilterParams() {
    return {
        type: $("#filterType").value,
        genre: $("#filterGenre").value,
        year: $("#filterYear").value,
        rating: $("#filterRating").value,
        sort: $("#filterSort").value,
        page: "1",
    };
}
function clearFilters() {
    $("#filterGenre").value = ""; $("#filterYear").value = "";
    $("#filterRating").value = ""; $("#filterSort").value = "popularity";
}

async function loadGenres() {
    try {
        const d = await fetch(`${API}/api/genres`).then(r => r.json());
        const sel = $("#filterGenre");
        (d.genres || []).forEach(g => {
            const o = document.createElement("option");
            o.value = g.id || g.name || g; o.textContent = g.name || g;
            sel.appendChild(o);
        });
    } catch (e) { }
}

// ── Search (debounced 300ms) ──
const _doSearchDebounced = debounce(() => {
    const q = $("#searchInput").value.trim();
    if (q.length >= 2) navigateTo("search", { q, page: "1" });
}, 300);
function doSearch() {
    const q = $("#searchInput").value.trim();
    if (q.length >= 2) navigateTo("search", { q, page: "1" });
}
$("#searchInput").addEventListener("input", _doSearchDebounced);
$("#searchInput").addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

// ══ PAGE RENDERERS ══════════════════════════════════════

// ── Home ──
async function loadHome() {
    $("#content").innerHTML = `
        <h2 class="section-title animate-in"><span class="icon">🔥</span> Trending This Week</h2>${skeletonCards(10)}
        <h2 class="section-title animate-in"><span class="icon">★</span> Top Rated</h2>${skeletonCards(10)}`;
    show($("#content")); hide($("#loading"));
    try {
        const d = await api("/api/home");
        $("#content").innerHTML = `
            <h2 class="section-title animate-in"><span class="icon">🔥</span> Trending This Week</h2>
            <div class="card-grid">${(d.trending || []).map((t, i) => cardHtml(t, i)).join("")}</div>
            <h2 class="section-title animate-in"><span class="icon">★</span> Top Rated</h2>
            <div class="card-grid">${(d.topRated || []).map((t, i) => cardHtml(t, i)).join("")}</div>`;
        observeAnimations();
    } catch (e) { $("#content").innerHTML = errorHtml("Failed to load", e.message); }
}

function cardHtml(t, idx = 0) {
    const delay = Math.min(idx * 40, 400);
    const mt = t.media_type || "movie";
    const id = t.id || t.tconst;
    const title = t.title || t.primary_title || "";
    const yr = t.year || t.start_year || "";
    const rt = t.runtime || t.runtime_minutes || "";
    const rating = t.rating || t.average_rating || "";
    const p = poster(t.poster || t.poster_url);
    const genreStr = Array.isArray(t.genres) ? t.genres.join(", ") : (t.genres || "");
    return `
    <div class="card animate-in" style="transition-delay:${delay}ms"
         onclick="navigateTo('title',{id:'${id}',type:'${mt}'})">
        <div class="card-poster-wrap">
            <img class="card-poster" src="${p}" alt="${esc(title)}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
            ${rating ? `<div class="card-rating-overlay"><span class="star">★</span> ${Number(rating).toFixed(1)}</div>` : ""}
            <div class="card-type-overlay">${fmtType(mt)}</div>
        </div>
        <div class="card-body">
            <div class="card-title">${esc(title)}</div>
            <div class="card-meta">${yr ? `<span>${yr}</span>` : ""}${rt ? `<span>${rt} min</span>` : ""}</div>
            ${genreStr ? `<div class="card-genres">${esc(genreStr)}</div>` : ""}
        </div>
    </div>`;
}

// ── Title Detail ──
async function loadTitle(id, type) {
    if (!id) return loadHome();
    $("#content").innerHTML = skeletonDetail(); show($("#content")); hide($("#loading"));
    try {
        const t = await api(`/api/title/${id}?type=${type || "movie"}`);
        const p = poster(t.poster || t.poster_url);
        const bd = t.backdrop;
        const title = t.title || t.primary_title || "";
        const yr = t.year || t.start_year || "";
        const rating = t.rating || t.average_rating;
        const votes = t.votes || t.num_votes || 0;
        const genres = Array.isArray(t.genres) ? t.genres : (t.genres || "").split(",").map(s => s.trim()).filter(Boolean);

        const backdropHtml = bd ? `<div class="title-backdrop"><img src="${bd}" alt="" loading="lazy"><div class="backdrop-gradient"></div></div>` : "";

        const genresHtml = genres.map(g => `<span class="genre-tag">${esc(g)}</span>`).join("");

        const directorsHtml = (t.directors || []).map(d =>
            `<span class="person-name" onclick="navigateTo('person',{id:'${d.id || d.nconst}'})">${esc(d.name || d.primary_name)}</span>`).join(", ");

        const castHtml = (t.cast || []).map(c => `
            <div class="cast-card animate-in" onclick="navigateTo('person',{id:'${c.id || c.nconst}'})">
                <img class="cast-photo" src="${profile(c.profile)}" alt="${esc(c.name || c.primary_name)}" loading="lazy" onerror="this.src='${PROFILE_PH}'">
                <div class="cast-name">${esc(c.name || c.primary_name)}</div>
                <div class="cast-character">${esc(c.character || c.characters || "")}</div>
            </div>`).join("");

        const providersHtml = (t.providers || []).length ? `
            <div class="providers-section">
                <h3>📡 Where to Watch</h3>
                <div class="providers-list">
                    ${t.providers.map(p => `<div class="provider-badge"><img src="${p.logo}" alt="${esc(p.name)}" title="${esc(p.name)}"></div>`).join("")}
                </div>
            </div>` : "";

        const similarHtml = (t.similar || []).length ? `
            <div class="similar-section animate-in">
                <h2 class="section-title"><span class="icon">🎬</span> Similar Titles</h2>
                <div class="card-grid">${t.similar.map((s, i) => cardHtml(s, i)).join("")}</div>
            </div>` : "";

        const isTV = type === "tv" || t.media_type === "tv" || t.media_type === "tvSeries";
        const seriesBtn = isTV && t.number_of_seasons ? `<button class="action-btn" onclick="navigateTo('series',{id:'${id}'})">📺 ${t.number_of_seasons} Seasons</button>` : "";

        $("#content").innerHTML = `
            ${backdropHtml}
            <button class="back-btn" onclick="history.back()">← Back</button>
            <div class="title-detail animate-in">
                <div class="title-hero">
                    <div class="title-poster-wrap">
                        <img class="title-poster" src="${p}" alt="${esc(title)}" onerror="this.src='${PLACEHOLDER}'">
                    </div>
                    <div class="title-info">
                        <h1>${esc(title)}</h1>
                        ${t.tagline ? `<p class="tagline">${esc(t.tagline)}</p>` : ""}
                        <div class="meta-row">
                            <span class="meta-tag">${fmtType(t.media_type || type)}</span>
                            ${yr ? `<span>${yr}</span>` : ""}
                            ${t.runtime ? `<span>${t.runtime} min</span>` : ""}
                        </div>
                        ${rating ? `<div class="rating-badge"><span class="star">★</span> ${Number(rating).toFixed(1)} <span class="votes">(${fmtVotes(votes)} votes)</span></div>` : ""}
                        <div class="genre-tags">${genresHtml}</div>
                        ${t.overview ? `<p class="overview">${esc(t.overview)}</p>` : ""}
                        ${directorsHtml ? `<div class="crew-line"><strong>Director:</strong> ${directorsHtml}</div>` : ""}
                        ${providersHtml}
                        <div class="title-actions">
                            <button class="action-btn" onclick="navigateTo('credits',{id:'${id}',type:'${type || "movie"}'})">👥 Full Cast & Crew</button>
                            ${seriesBtn}
                        </div>
                    </div>
                </div>
                ${castHtml ? `<div class="cast-section animate-in"><h2 class="section-title"><span class="icon">👥</span> Top Cast</h2><div class="cast-grid">${castHtml}</div></div>` : ""}
                ${similarHtml}
            </div>`;
        observeAnimations();
    } catch (e) { $("#content").innerHTML = errorHtml("Title not found", e.message); }
}

// ── Full Credits ──
async function loadCredits(id, type) {
    if (!id) return loadHome();
    showLoading();
    try {
        const d = await api(`/api/title/${id}/full-credits?type=${type || "movie"}`);
        const title = d.title || d.primary_title || "";
        let html = `<button class="back-btn" onclick="navigateTo('title',{id:'${id}',type:'${type || "movie"}'})">← Back to ${esc(title)}</button>
            <h2 class="section-title">Full Cast & Crew — ${esc(title)}</h2>`;

        if (d.source === "tmdb") {
            if (d.cast && d.cast.length) {
                html += `<div class="credits-group animate-in"><h3>Cast (${d.cast.length})</h3>
                    <div class="cast-grid">${d.cast.map(c => `
                        <div class="cast-card" onclick="navigateTo('person',{id:'${c.id}'})">
                            <img class="cast-photo" src="${profile(c.profile)}" alt="" loading="lazy" onerror="this.src='${PROFILE_PH}'">
                            <div class="cast-name">${esc(c.name)}</div>
                            <div class="cast-character">${esc(c.character)}</div>
                        </div>`).join("")}</div></div>`;
            }
            Object.entries(d.crew || {}).forEach(([dept, members]) => {
                html += `<div class="credits-group animate-in"><h3>${esc(dept)} (${members.length})</h3>
                    ${members.map(m => `<div class="person-row"><span class="person-name" onclick="navigateTo('person',{id:'${m.id}'})">${esc(m.name)}</span><span class="person-role">${esc(m.job)}</span></div>`).join("")}</div>`;
            });
        } else {
            Object.entries(d.credits || {}).forEach(([cat, people]) => {
                html += `<div class="credits-group animate-in"><h3>${esc(cat)} (${people.length})</h3>
                    ${people.map(p => `<div class="person-row"><span class="person-name" onclick="navigateTo('person',{id:'${p.id || p.nconst}'})">${esc(p.name || p.primary_name)}</span><span class="person-role">${esc(p.character || p.characters || p.job || "")}</span></div>`).join("")}</div>`;
            });
        }
        $("#content").innerHTML = html; observeAnimations();
    } catch (e) { $("#content").innerHTML = errorHtml("Credits not found", e.message); }
    hideLoading();
}

// ── Series/Episodes ──
async function loadSeries(id, season) {
    if (!id) return loadHome();
    showLoading();
    try {
        const sData = await api(`/api/series/${id}/seasons`);
        season = season ? parseInt(season) : (sData.seasons[0] || 1);
        const eData = await api(`/api/series/${id}/episodes?season=${season}`);
        const title = sData.primary_title || "Series";
        const seasonBtns = sData.seasons.map(s =>
            `<button class="season-btn ${s === season ? "active" : ""}" onclick="navigateTo('series',{id:'${id}',season:${s}})">${s}</button>`).join("");
        const epHtml = (eData.episodes || []).map((ep, i) => `
            <div class="episode-card animate-in" style="transition-delay:${i * 50}ms" onclick="navigateTo('title',{id:'${ep.tconst || ep.id}'})">
                <div class="episode-num">${ep.episode_number || "?"}</div>
                <div class="episode-info"><div class="ep-title">${esc(ep.primary_title || ep.name || "")}</div>
                <div class="ep-meta">${ep.start_year || ep.air_date || ""} ${ep.runtime_minutes || ep.runtime ? "· " + (ep.runtime_minutes || ep.runtime) + " min" : ""}</div></div>
                <div class="episode-rating">${ep.average_rating || ep.vote_average ? `<span class="star">★</span> ${ep.average_rating || ep.vote_average}` : "—"}</div>
            </div>`).join("") || '<div class="empty-state"><p>No episodes found.</p></div>';
        $("#content").innerHTML = `
            <button class="back-btn" onclick="navigateTo('title',{id:'${id}',type:'tv'})">← Back to ${esc(title)}</button>
            <h2 class="section-title">${esc(title)} — Episodes</h2>
            <div class="season-selector"><strong style="padding:6px 0;color:var(--text-secondary)">Season:</strong>${seasonBtns}</div>
            <div class="episode-list">${epHtml}</div>`;
        observeAnimations();
    } catch (e) { $("#content").innerHTML = errorHtml("Episodes not found", e.message); }
    hideLoading();
}

// ── Person ──
async function loadPerson(id) {
    if (!id) return loadHome();
    showLoading();
    try {
        const p = await api(`/api/person/${id}`);
        const name = p.name || p.primary_name || "";
        const profileImg = p.profile ? `<img class="person-profile-img" src="${p.profile}" alt="${esc(name)}">` : "";

        let bioHtml = "";
        if (p.biography) bioHtml = `<p class="person-bio">${esc(p.biography).substring(0, 600)}${p.biography.length > 600 ? "…" : ""}</p>`;
        let metaHtml = "";
        if (p.birthday) metaHtml += `<span>Born: ${p.birthday}</span>`;
        if (p.deathday) metaHtml += `<span>Died: ${p.deathday}</span>`;
        if (p.place_of_birth) metaHtml += `<span>${esc(p.place_of_birth)}</span>`;
        if (p.birth_year) metaHtml += `<span>Born: ${p.birth_year}</span>`;
        if (p.death_year) metaHtml += `<span>Died: ${p.death_year}</span>`;

        let filmoHtml = "";
        if (p.source === "tmdb" && Array.isArray(p.filmography)) {
            filmoHtml = `<div class="card-grid">${p.filmography.slice(0, 20).map((f, i) => `
                <div class="card animate-in" style="transition-delay:${i * 30}ms" onclick="navigateTo('title',{id:'${f.id}',type:'${f.media_type || "movie"}'})">
                    <div class="card-poster-wrap"><img class="card-poster" src="${poster(f.poster)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
                    ${f.rating ? `<div class="card-rating-overlay"><span class="star">★</span> ${Number(f.rating).toFixed(1)}</div>` : ""}</div>
                    <div class="card-body"><div class="card-title">${esc(f.title)}</div>
                    <div class="card-meta">${f.year ? `<span>${f.year}</span>` : ""}</div>
                    <div class="card-genres">${esc(f.character)}</div></div></div>`).join("")}</div>`;
        } else if (p.filmography && typeof p.filmography === "object") {
            filmoHtml = Object.entries(p.filmography).map(([cat, titles]) => `
                <div class="filmography-group animate-in"><h3>${esc(cat)} (${titles.length})</h3>
                ${titles.map(t => `<div class="filmography-item">
                    <span class="filmography-year">${t.year || t.start_year || ""}</span>
                    <span class="filmography-title" onclick="navigateTo('title',{id:'${t.id || t.tconst}'})">${esc(t.title || t.primary_title)}</span>
                    <span class="filmography-rating">${t.rating || t.average_rating ? `★ ${t.rating || t.average_rating}` : ""}</span>
                </div>`).join("")}</div>`).join("");
        }

        $("#content").innerHTML = `
            <button class="back-btn" onclick="history.back()">← Back</button>
            <div class="person-detail">
                <div class="person-header animate-in">
                    <div class="person-header-inner">
                        ${profileImg}
                        <div>
                            <h1>${esc(name)}</h1>
                            ${p.known_for_department ? `<span class="meta-tag">${esc(p.known_for_department)}</span>` : ""}
                            <div class="person-meta">${metaHtml}</div>
                            ${bioHtml}
                        </div>
                    </div>
                </div>
                <h2 class="section-title animate-in"><span class="icon">🎬</span> Filmography</h2>
                ${filmoHtml || '<div class="empty-state"><p>No filmography data.</p></div>'}
            </div>`;
        observeAnimations();
    } catch (e) { $("#content").innerHTML = errorHtml("Person not found", e.message); }
    hideLoading();
}

// ── Search Results (with pagination) ──
async function loadSearch(params) {
    const q = params.q; const page = parseInt(params.page) || 1;
    if (!q) return loadHome();
    $("#content").innerHTML = `<div class="search-results-info">Searching for "<strong>${esc(q)}</strong>"...</div>${skeletonCards(8)}`;
    show($("#content")); hide($("#loading"));
    try {
        const d = await api(`/api/search?q=${encodeURIComponent(q)}&page=${page}`);
        let resultsHtml = "";
        if (!d.results.length) {
            resultsHtml = '<div class="empty-state"><div class="icon">🔍</div><p>No results found.</p></div>';
        } else {
            const movies = d.results.filter(r => r.media_type !== "person");
            const people = d.results.filter(r => r.media_type === "person");
            if (movies.length) resultsHtml += `<div class="card-grid">${movies.map((t, i) => cardHtml(t, i)).join("")}</div>`;
            if (people.length) resultsHtml += `<h3 class="section-title animate-in" style="margin-top:32px"><span class="icon">👤</span> People</h3>` +
                people.map(p => `<div class="person-row animate-in" style="padding:12px 0;cursor:pointer" onclick="navigateTo('person',{id:'${p.id}'})">
                    <img src="${profile(p.profile)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="this.src='${PROFILE_PH}'">
                    <span class="person-name">${esc(p.name)}</span>
                    <span class="person-role">${esc(p.known_for_department || "")}</span></div>`).join("");
        }
        $("#content").innerHTML = `
            <div class="search-results-info">Results for "<strong>${esc(q)}</strong>" — ${d.totalResults || d.results.length} found</div>
            ${resultsHtml}
            ${paginationHtml(page, d.totalPages || 1, p => navigateTo('search', { q, page: p }))}`;
        observeAnimations();
    } catch (e) { $("#content").innerHTML = errorHtml("Search failed", e.message); }
}

// ── Discover (filtered browse) ──
async function loadDiscover(params) {
    const page = parseInt(params.page) || 1;
    $("#content").innerHTML = `<h2 class="section-title">Discover</h2>${skeletonCards(10)}`;
    show($("#content")); hide($("#loading"));
    try {
        const qs = new URLSearchParams(params).toString();
        const d = await api(`/api/discover?${qs}`);
        const resultsHtml = d.results.length
            ? `<div class="card-grid">${d.results.map((t, i) => cardHtml(t, i)).join("")}</div>`
            : '<div class="empty-state"><div class="icon">🎬</div><p>No titles match your filters.</p></div>';
        $("#content").innerHTML = `
            <h2 class="section-title animate-in"><span class="icon">🎯</span> Discover</h2>
            ${resultsHtml}
            ${paginationHtml(page, d.totalPages || 1, p => { params.page = p; navigateTo('discover', params); })}`;
        observeAnimations();
    } catch (e) { $("#content").innerHTML = errorHtml("Discover failed", e.message); }
}

// ── Pagination ──
function paginationHtml(current, total, onPage) {
    if (total <= 1) return "";
    window._paginate = onPage;
    let html = `<div class="pagination">`;
    if (current > 1) html += `<button class="page-btn" onclick="window._paginate(${current - 1})">← Prev</button>`;
    html += `<span class="page-info">Page ${current} of ${total}</span>`;
    if (current < total) html += `<button class="page-btn" onclick="window._paginate(${current + 1})">Next →</button>`;
    return html + `</div>`;
}

// ── Error display ──
function errorHtml(title, detail) {
    return `<div class="empty-state"><div class="icon">⚠️</div><p><strong>${title}</strong></p><p style="font-size:0.85rem">${detail || ""}</p></div>`;
}
