/* ════════════════════════════════════════════════════════════
   CineVault — Cinematic Movie Discovery Platform
   Frontend Application v4.0
   Hero Banner · 3D TiltCards · Mood Discovery · TMDB Powered
   ════════════════════════════════════════════════════════════ */

const API = "";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><rect fill="#10101c" width="300" height="450"/><text x="150" y="225" text-anchor="middle" fill="#4a4a6a" font-family="sans-serif" font-size="16">No Poster</text></svg>')}`;

/* ── DOM helpers ── */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
};

/* ── API helper ── */
async function api(path) {
    const r = await fetch(`${API}${path}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

/* ── Poster URL helper ── */
function poster(path, size = "w500") {
    if (!path) return PLACEHOLDER;
    if (path.startsWith("http")) return path;
    return `${TMDB_IMG}/${size}${path}`;
}

function backdrop(path) {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${TMDB_IMG}/w1280${path}`;
}

/* ── Router ── */
const content = () => $("#content");

function navigateTo(page, params = {}) {
    const q = new URLSearchParams(params).toString();
    location.hash = q ? `${page}?${q}` : page;
}

function parseHash() {
    const h = location.hash.slice(1) || "home";
    const [page, qs] = h.split("?");
    const params = Object.fromEntries(new URLSearchParams(qs || ""));
    return { page, params };
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
    initSearch();
    initFilters();
    route();
});

function route() {
    clearHeroInterval();
    const { page, params } = parseHash();
    const c = content();
    c.innerHTML = loadingHtml();
    c.classList.remove("pageIn");
    void c.offsetWidth;

    switch (page) {
        case "home": loadHome(); break;
        case "title": loadTitle(params); break;
        case "person": loadPerson(params); break;
        case "search": loadSearch(params); break;
        case "discover": loadDiscover(params); break;
        case "series": loadSeries(params); break;
        case "credits": loadCredits(params); break;
        default: loadHome();
    }
}

/* ══════════════════════════════════════════════════════════
   HOME PAGE — Hero Banner + Mood Discovery + Trending + Top Rated
   ══════════════════════════════════════════════════════════ */
async function loadHome() {
    try {
        const data = await api("/api/home");
        const trending = data.trending || [];
        const topRated = data.topRated || [];
        const heroMovies = trending.slice(0, 5).filter(m => m.backdrop || m.poster);

        let html = "";

        /* Hero Banner */
        if (heroMovies.length) {
            html += `<div class="hero">
                ${heroMovies.map((m, i) => `
                    <div class="hero-slide ${i === 0 ? 'active' : ''}"
                         style="background-image:url('${backdrop(m.backdrop) || poster(m.poster)}')">
                        <div class="hero-gradient"></div>
                        <div class="hero-content">
                            <div class="hero-tag">🔥 TRENDING NOW</div>
                            <h1 class="hero-title">${esc(m.title)}</h1>
                            <p class="hero-overview">${esc((m.overview || '').substring(0, 160))}</p>
                            <div class="hero-meta">
                                ${m.rating ? `<span class="hero-rating">★ ${Number(m.rating).toFixed(1)}</span>` : ''}
                                ${m.year ? `<span>${m.year}</span>` : ''}
                                ${m.genres?.length ? `<span>${m.genres.join(', ')}</span>` : ''}
                            </div>
                            <button class="hero-cta" onclick="navigateTo('title',{id:'${m.id}',type:'${m.media_type || 'movie'}'})">
                                Explore <span class="arrow">→</span>
                            </button>
                        </div>
                    </div>
                `).join('')}
                <div class="hero-dots">
                    ${heroMovies.map((_, i) => `<span class="hero-dot ${i === 0 ? 'active' : ''}" onclick="setHeroSlide(${i})"></span>`).join('')}
                </div>
            </div>`;
        }

        /* Mood Discovery */
        html += moodSectionHtml();

        /* Trending Section */
        if (trending.length) {
            html += `<div class="section-title animate-in"><span class="icon">🔥</span> Trending This Week</div>`;
            html += `<div class="card-grid animate-in">${trending.map(cardHtml).join('')}</div>`;
        }

        /* Top Rated Section */
        if (topRated.length) {
            html += `<div class="section-title animate-in"><span class="icon">⭐</span> Top Rated</div>`;
            html += `<div class="card-grid animate-in">${topRated.map(cardHtml).join('')}</div>`;
        }

        content().innerHTML = html;
        startHeroRotation();
        observeAnimations();
        initTilt();
    } catch (e) {
        content().innerHTML = errorHtml(e.message);
    }
}

/* ── Hero Auto-Rotate ── */
let heroInterval = null;
function clearHeroInterval() { if (heroInterval) { clearInterval(heroInterval); heroInterval = null; } }

function startHeroRotation() {
    const slides = $$('.hero-slide');
    const dots = $$('.hero-dot');
    if (slides.length < 2) return;
    let current = 0;
    clearHeroInterval();
    heroInterval = setInterval(() => {
        slides[current]?.classList.remove('active');
        dots[current]?.classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current]?.classList.add('active');
        dots[current]?.classList.add('active');
    }, 7000);
}

window.setHeroSlide = function (i) {
    const slides = $$('.hero-slide');
    const dots = $$('.hero-dot');
    slides.forEach((s, idx) => { s.classList.toggle('active', idx === i); });
    dots.forEach((d, idx) => { d.classList.toggle('active', idx === i); });
    clearHeroInterval();
    startHeroRotation();
};

/* ── Mood Discovery Section ── */
function moodSectionHtml() {
    const moods = [
        { id: 28, emoji: '💥', label: 'Action', color: '#ff4444' },
        { id: 35, emoji: '😂', label: 'Comedy', color: '#ffaa00' },
        { id: 18, emoji: '🎭', label: 'Drama', color: '#a855f7' },
        { id: 27, emoji: '👻', label: 'Horror', color: '#00ff88' },
        { id: 10749, emoji: '❤️', label: 'Romance', color: '#f472b6' },
        { id: 878, emoji: '🚀', label: 'Sci-Fi', color: '#00d4ff' },
        { id: 53, emoji: '🔪', label: 'Thriller', color: '#ff6600' },
        { id: 16, emoji: '✨', label: 'Animation', color: '#88ff44' },
        { id: 14, emoji: '🧙', label: 'Fantasy', color: '#cc44ff' },
        { id: 12, emoji: '🗺️', label: 'Adventure', color: '#44ccff' },
    ];
    return `
        <div class="mood-section animate-in">
            <div class="section-title"><span class="icon">🎭</span> What's Your Mood?</div>
            <div class="mood-grid">
                ${moods.map(m => `
                    <div class="mood-bubble" style="--glow:${m.color}"
                         onclick="navigateTo('discover',{type:'movie',genre:'${m.id}',sort:'popularity',page:'1'})">
                        <span class="mood-emoji">${m.emoji}</span>
                        <span class="mood-label">${m.label}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

/* ══════════════════════════════════════════════════════════
   MOVIE CARD
   ══════════════════════════════════════════════════════════ */
function cardHtml(m) {
    const imgSrc = poster(m.poster || m.poster_path);
    const type = m.media_type || 'movie';
    const title = m.title || m.name || 'Untitled';
    const rating = m.rating || m.vote_average;
    const yr = m.year || (m.release_date || m.first_air_date || '').substring(0, 4);

    return `<div class="card" onclick="navigateTo('title',{id:'${m.id}',type:'${type}'})">
        <div class="card-poster-wrap">
            <img class="card-poster" src="${imgSrc}" alt="${esc(title)}" loading="lazy"
                 onerror="this.src='${PLACEHOLDER}'">
            ${rating ? `<div class="card-rating-overlay"><span class="star">★</span> ${Number(rating).toFixed(1)}</div>` : ''}
            ${type !== 'movie' ? `<div class="card-type-overlay">${esc(type)}</div>` : ''}
        </div>
        <div class="card-body">
            <div class="card-title">${esc(title)}</div>
            <div class="card-meta">
                ${yr ? `<span>${yr}</span>` : ''}
            </div>
        </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   SEARCH
   ══════════════════════════════════════════════════════════ */
let searchTimer = null;
function initSearch() {
    const input = $("#searchInput");
    if (!input) return;
    input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        const q = input.value.trim();
        if (q.length < 2) return;
        searchTimer = setTimeout(() => {
            navigateTo("search", { q, page: 1 });
        }, 350);
    });
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            clearTimeout(searchTimer);
            const q = input.value.trim();
            if (q) navigateTo("search", { q, page: 1 });
        }
    });
}

async function loadSearch(p) {
    try {
        const q = p.q || "";
        const page = parseInt(p.page) || 1;
        const data = await api(`/api/search?q=${encodeURIComponent(q)}&page=${page}`);
        const results = data.results || [];

        let html = `<div class="search-results-info">
            Results for <strong>"${esc(q)}"</strong>
            ${data.totalResults ? `— ${data.totalResults} found` : ''}
        </div>`;

        if (!results.length) {
            html += emptyHtml("🔍", "No results found. Try another query.");
        } else {
            html += `<div class="card-grid animate-in">${results.map(r => {
                if (r.media_type === 'person') return personCardHtml(r);
                return cardHtml(r);
            }).join('')}</div>`;
            html += paginationHtml(page, data.totalPages || 1, (pg) =>
                `navigateTo('search',{q:'${esc(q)}',page:'${pg}'})`
            );
        }
        content().innerHTML = html;
        observeAnimations();
        initTilt();
    } catch (e) { content().innerHTML = errorHtml(e.message); }
}

function personCardHtml(p) {
    const imgSrc = poster(p.profile || p.profile_path, "w185");
    return `<div class="card" onclick="navigateTo('person',{id:'${p.id}'})">
        <div class="card-poster-wrap">
            <img class="card-poster" src="${imgSrc}" alt="${esc(p.name)}" loading="lazy"
                 onerror="this.src='${PLACEHOLDER}'">
            <div class="card-type-overlay">person</div>
        </div>
        <div class="card-body">
            <div class="card-title">${esc(p.name)}</div>
            <div class="card-meta"><span>${esc(p.known_for_department || '')}</span></div>
        </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   FILTERS + DISCOVER
   ══════════════════════════════════════════════════════════ */
function initFilters() {
    const toggle = $("#filterToggle");
    const panel = $("#filterPanel");
    const applyBtn = $("#filterApply");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
        panel.classList.toggle("expanded");
        toggle.classList.toggle("active");
    });

    if (applyBtn) {
        applyBtn.addEventListener("click", () => {
            const type = $("#filterType")?.value || "movie";
            const genre = $("#filterGenre")?.value || "";
            const year = $("#filterYear")?.value || "";
            const rating = $("#filterRating")?.value || "";
            const sort = $("#filterSort")?.value || "popularity";
            navigateTo("discover", { type, genre, year, rating, sort, page: 1 });
        });
    }

    /* Load genres into select */
    api("/api/genres").then(data => {
        const sel = $("#filterGenre");
        if (!sel) return;
        (data.genres || []).forEach(g => {
            const o = document.createElement("option");
            o.value = g.id || g.name;
            o.textContent = g.name;
            sel.appendChild(o);
        });
    }).catch(() => { });
}

async function loadDiscover(p) {
    try {
        const page = parseInt(p.page) || 1;
        const qs = new URLSearchParams({
            type: p.type || 'movie', genre: p.genre || '',
            year: p.year || '', rating: p.rating || '', sort: p.sort || 'popularity', page
        });
        const data = await api(`/api/discover?${qs}`);
        const results = data.results || [];

        let html = `<div class="search-results-info">
            Discovering <strong>${esc(p.type || 'movies')}</strong>
            ${data.totalResults ? `— ${data.totalResults} results` : ''}
        </div>`;

        if (!results.length) {
            html += emptyHtml("🎬", "No movies found with these filters.");
        } else {
            html += `<div class="card-grid animate-in">${results.map(cardHtml).join('')}</div>`;
            html += paginationHtml(page, data.totalPages || 1, (pg) => {
                const np = { ...p, page: pg };
                return `navigateTo('discover',${JSON.stringify(np)})`;
            });
        }
        content().innerHTML = html;
        observeAnimations();
        initTilt();
    } catch (e) { content().innerHTML = errorHtml(e.message); }
}

/* ══════════════════════════════════════════════════════════
   TITLE DETAIL PAGE
   ══════════════════════════════════════════════════════════ */
async function loadTitle(p) {
    try {
        const qs = p.type ? `?type=${p.type}` : '';
        const data = await api(`/api/title/${p.id}${qs}`);
        const d = data;

        let html = '';

        /* Backdrop */
        if (d.backdrop) {
            html += `<div class="title-backdrop">
                <img src="${backdrop(d.backdrop)}" alt="" loading="lazy">
                <div class="backdrop-gradient"></div>
            </div>`;
        }

        html += `<div class="title-detail">`;

        /* Back button */
        html += `<button class="back-btn" onclick="history.back()">← Back</button>`;

        /* Hero row: Poster + Info */
        html += `<div class="title-hero">
            <div class="title-poster-wrap">
                <img class="title-poster" src="${poster(d.poster || d.poster_url)}" alt="${esc(d.title)}"
                     loading="lazy" onerror="this.src='${PLACEHOLDER}'">
            </div>
            <div class="title-info">
                <h1>${esc(d.title || d.primary_title)}</h1>
                ${d.tagline ? `<div class="tagline">"${esc(d.tagline)}"</div>` : ''}
                <div class="meta-row">
                    ${d.media_type ? `<span class="meta-tag">${esc(d.media_type)}</span>` : ''}
                    ${d.year || d.start_year ? `<span>${d.year || d.start_year}</span>` : ''}
                    ${d.runtime ? `<span>${d.runtime} min</span>` : ''}
                </div>
                ${d.rating ? `<div class="rating-badge">
                    <span class="star">★</span> ${Number(d.rating).toFixed(1)}
                    ${d.votes ? `<span class="votes">(${Number(d.votes).toLocaleString()} votes)</span>` : ''}
                </div>` : ''}
                <div class="genre-tags">
                    ${(d.genres || []).map(g => `<span class="genre-tag">${esc(typeof g === 'string' ? g : g.name)}</span>`).join('')}
                </div>
                ${d.overview ? `<p class="overview">${esc(d.overview)}</p>` : ''}
                ${d.director ? `<div class="crew-line"><strong>Director:</strong> ${esc(d.director)}</div>` : ''}
                ${d.writers ? `<div class="crew-line"><strong>Writer:</strong> ${esc(d.writers)}</div>` : ''}
                <div class="title-actions">
                    ${d.media_type === 'tv' || d.title_type === 'tvSeries' ?
                `<button class="action-btn" onclick="navigateTo('series',{id:'${d.id}',type:'tv'})">📺 Episodes</button>` : ''}
                    <button class="action-btn" onclick="navigateTo('credits',{id:'${d.id}',type:'${d.media_type || 'movie'}'})">👥 Full Cast</button>
                </div>
            </div>
        </div>`;

        /* Watch Providers — per-provider deep links */
        if (d.providers?.length) {
            const movieTitle = encodeURIComponent(d.title || d.primary_title || '');
            const providerUrls = {
                'netflix': `https://www.netflix.com/search?q=${movieTitle}`,
                'amazon prime video': `https://www.amazon.com/s?k=${movieTitle}&i=instant-video`,
                'amazon video': `https://www.amazon.com/s?k=${movieTitle}&i=instant-video`,
                'disney plus': `https://www.disneyplus.com/search/${movieTitle}`,
                'apple tv plus': `https://tv.apple.com/search?term=${movieTitle}`,
                'apple tv': `https://tv.apple.com/search?term=${movieTitle}`,
                'apple itunes': `https://tv.apple.com/search?term=${movieTitle}`,
                'google play movies': `https://play.google.com/store/search?q=${movieTitle}&c=movies`,
                'youtube': `https://www.youtube.com/results?search_query=${movieTitle}+full+movie`,
                'hulu': `https://www.hulu.com/search?q=${movieTitle}`,
                'max': `https://play.max.com/search?q=${movieTitle}`,
                'hbo max': `https://play.max.com/search?q=${movieTitle}`,
                'paramount plus': `https://www.paramountplus.com/search/?q=${movieTitle}`,
                'paramount+ amazon channel': `https://www.paramountplus.com/search/?q=${movieTitle}`,
                'peacock': `https://www.peacocktv.com/search?q=${movieTitle}`,
                'peacock premium': `https://www.peacocktv.com/search?q=${movieTitle}`,
                'crunchyroll': `https://www.crunchyroll.com/search?q=${movieTitle}`,
                'vudu': `https://www.vudu.com/content/movies/search?searchString=${movieTitle}`,
                'microsoft store': `https://www.microsoft.com/en-us/search/shop/movies-tv?q=${movieTitle}`,
                'mubi': `https://mubi.com/en/search?query=${movieTitle}`,
                'starz': `https://www.starz.com/search?q=${movieTitle}`,
            };
            function getProviderUrl(name) {
                const key = (name || '').toLowerCase().trim();
                for (const [pattern, url] of Object.entries(providerUrls)) {
                    if (key.includes(pattern) || pattern.includes(key)) return url;
                }
                return `https://www.google.com/search?q=watch+${movieTitle}+on+${encodeURIComponent(name)}`;
            }
            html += `<div class="providers-section">
                <h3>📺 Where to Watch</h3>
                <div class="providers-list">
                    ${d.providers.map(pv => {
                const pvName = pv.name || pv.provider_name || '';
                const pvUrl = getProviderUrl(pvName);
                return `<a href="${esc(pvUrl)}" target="_blank" rel="noopener" class="provider-badge" title="Watch on ${esc(pvName)}">
                            <img src="${pv.logo || poster(pv.logo_path, 'w92')}" alt="${esc(pvName)}" loading="lazy">
                        </a>`;
            }).join('')}
                </div>
            </div>`;
        }

        /* Cast Grid */
        if (d.cast?.length) {
            html += `<div class="cast-section">
                <div class="section-title"><span class="icon">🎭</span> Cast</div>
                <div class="cast-grid">
                    ${d.cast.slice(0, 12).map(c => {
                const cImg = poster(c.profile || c.profile_path, "w185");
                const cId = c.id || c.nconst;
                const char = c.character || (c.characters ? JSON.parse(c.characters)[0] : '');
                return `<div class="cast-card" onclick="navigateTo('person',{id:'${cId}'})">
                            <img class="cast-photo" src="${cImg}" alt="${esc(c.name || c.primary_name)}"
                                 loading="lazy" onerror="this.src='${PLACEHOLDER}'">
                            <div class="cast-name">${esc(c.name || c.primary_name)}</div>
                            <div class="cast-character">${esc(char)}</div>
                        </div>`;
            }).join('')}
                </div>
            </div>`;
        }

        /* Similar Movies */
        if (d.similar?.length) {
            html += `<div class="similar-section">
                <div class="section-title"><span class="icon">🎬</span> Similar</div>
                <div class="card-grid">${d.similar.map(cardHtml).join('')}</div>
            </div>`;
        }

        html += `</div>`;
        content().innerHTML = html;
        observeAnimations();
        initTilt();
    } catch (e) { content().innerHTML = errorHtml(e.message); }
}

/* ══════════════════════════════════════════════════════════
   PERSON PAGE
   ══════════════════════════════════════════════════════════ */
async function loadPerson(p) {
    try {
        const data = await api(`/api/person/${p.id}`);
        const d = data;

        let html = `<div class="person-detail">
            <button class="back-btn" onclick="history.back()">← Back</button>
            <div class="person-header">
                <div class="person-header-inner">
                    ${d.profile ? `<img class="person-profile-img" src="${poster(d.profile, 'w300')}"
                        alt="${esc(d.name)}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">` : ''}
                    <div>
                        <h1>${esc(d.name || d.primary_name)}</h1>
                        <div class="person-meta">
                            ${d.known_for_department ? `<span>🎬 ${esc(d.known_for_department)}</span>` : ''}
                            ${d.birthday ? `<span>🎂 ${esc(d.birthday)}</span>` : ''}
                            ${d.birth_year ? `<span>Born ${d.birth_year}</span>` : ''}
                            ${d.place_of_birth ? `<span>📍 ${esc(d.place_of_birth)}</span>` : ''}
                        </div>
                        ${d.biography ? `<p class="person-bio">${esc(d.biography)}</p>` : ''}
                    </div>
                </div>
            </div>`;

        /* Filmography */
        const filmography = d.filmography || d.credits || [];
        if (filmography.length) {
            /* group by category */
            const groups = {};
            filmography.forEach(f => {
                const cat = f.category || f.department || 'Other';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(f);
            });
            for (const [cat, items] of Object.entries(groups)) {
                html += `<div class="filmography-group animate-in">
                    <h3>${esc(cat)}</h3>
                    ${items.slice(0, 20).map(f => {
                    const yr = f.year || (f.release_date || f.first_air_date || '').substring(0, 4);
                    const fId = f.id || f.tconst;
                    const fTitle = f.title || f.primary_title || f.name || '';
                    return `<div class="filmography-item">
                            <span class="filmography-year">${yr || '—'}</span>
                            <span class="filmography-title" onclick="navigateTo('title',{id:'${fId}',type:'${f.media_type || 'movie'}'})">${esc(fTitle)}</span>
                            ${f.vote_average ? `<span class="filmography-rating">★ ${Number(f.vote_average).toFixed(1)}</span>` : ''}
                        </div>`;
                }).join('')}
                </div>`;
            }
        }

        html += `</div>`;
        content().innerHTML = html;
        observeAnimations();
    } catch (e) { content().innerHTML = errorHtml(e.message); }
}

/* ══════════════════════════════════════════════════════════
   SERIES / EPISODES
   ══════════════════════════════════════════════════════════ */
async function loadSeries(p) {
    try {
        const data = await api(`/api/series/${p.id}/seasons`);
        const seasons = data.seasons || [];

        let html = `<button class="back-btn" onclick="history.back()">← Back</button>`;
        html += `<h1 style="margin-bottom:20px">Episodes</h1>`;

        if (!seasons.length) {
            html += emptyHtml("📺", "No season data available.");
        } else {
            html += `<div class="season-selector">
                ${seasons.map(s => `<button class="season-btn"
                    onclick="loadEpisodes('${p.id}', ${s.season_number || s})">${typeof s === 'object' ? `S${s.season_number}` : `S${s}`}</button>`).join('')}
            </div>`;
            html += `<div id="episodeList"></div>`;
        }
        content().innerHTML = html;
        if (seasons.length) {
            const firstSeason = typeof seasons[0] === 'object' ? seasons[0].season_number : seasons[0];
            loadEpisodes(p.id, firstSeason);
        }
    } catch (e) { content().innerHTML = errorHtml(e.message); }
}

async function loadEpisodes(seriesId, seasonNum) {
    const list = document.getElementById("episodeList");
    if (!list) return;
    list.innerHTML = loadingHtml();

    $$('.season-btn').forEach((b, i) => b.classList.toggle('active', parseInt(b.textContent.replace('S', '')) === seasonNum));

    try {
        const data = await api(`/api/series/${seriesId}/season/${seasonNum}`);
        const eps = data.episodes || [];
        if (!eps.length) { list.innerHTML = emptyHtml("📺", "No episodes found."); return; }

        list.innerHTML = eps.map(ep => `
            <div class="episode-card">
                <div class="episode-num">${ep.episode_number || ep.ep_num || '?'}</div>
                <div class="episode-info">
                    <div class="ep-title">${esc(ep.name || ep.primary_title || `Episode ${ep.episode_number}`)}</div>
                    <div class="ep-meta">${esc(ep.air_date || '')} ${ep.runtime ? `• ${ep.runtime}m` : ''}</div>
                </div>
                ${ep.vote_average ? `<div class="episode-rating">★ ${Number(ep.vote_average).toFixed(1)}</div>` : ''}
            </div>
        `).join('');
    } catch (e) { list.innerHTML = errorHtml(e.message); }
}

/* ══════════════════════════════════════════════════════════
   FULL CREDITS
   ══════════════════════════════════════════════════════════ */
async function loadCredits(p) {
    try {
        const qs = p.type ? `?type=${p.type}` : '';
        const data = await api(`/api/title/${p.id}${qs}`);
        const cast = data.cast || [];

        let html = `<button class="back-btn" onclick="history.back()">← Back</button>`;
        html += `<h1 style="margin-bottom:20px">${esc(data.title || data.primary_title)} — Full Cast</h1>`;

        if (!cast.length) {
            html += emptyHtml("👥", "No cast data available.");
        } else {
            html += `<div class="cast-grid">
                ${cast.map(c => {
                const cImg = poster(c.profile || c.profile_path, "w185");
                const cId = c.id || c.nconst;
                const char = c.character || (c.characters ? JSON.parse(c.characters)[0] : '');
                return `<div class="cast-card" onclick="navigateTo('person',{id:'${cId}'})">
                        <img class="cast-photo" src="${cImg}" alt="${esc(c.name || c.primary_name)}"
                             loading="lazy" onerror="this.src='${PLACEHOLDER}'">
                        <div class="cast-name">${esc(c.name || c.primary_name)}</div>
                        <div class="cast-character">${esc(char)}</div>
                    </div>`;
            }).join('')}
            </div>`;
        }
        content().innerHTML = html;
    } catch (e) { content().innerHTML = errorHtml(e.message); }
}

/* ══════════════════════════════════════════════════════════
   UI COMPONENTS
   ══════════════════════════════════════════════════════════ */
function loadingHtml() {
    return `<div class="loading"><div class="spinner"></div><span>Loading...</span></div>`;
}

function errorHtml(msg) {
    return `<div class="empty-state"><div class="icon">⚠️</div><p>${esc(msg)}</p>
        <button class="back-btn" onclick="navigateTo('home')" style="margin:20px auto">← Home</button></div>`;
}

function emptyHtml(icon, msg) {
    return `<div class="empty-state"><div class="icon">${icon}</div><p>${msg}</p></div>`;
}

function paginationHtml(page, totalPages, navFn) {
    if (totalPages <= 1) return '';
    return `<div class="pagination">
        ${page > 1 ? `<button class="page-btn" onclick="${navFn(page - 1)}">← Prev</button>` : ''}
        <span class="page-info">Page ${page} of ${totalPages}</span>
        ${page < totalPages ? `<button class="page-btn" onclick="${navFn(page + 1)}">Next →</button>` : ''}
    </div>`;
}

function skeletonGridHtml(n = 8) {
    return `<div class="card-grid">${Array(n).fill(`
        <div class="skeleton-card">
            <div class="skeleton skeleton-poster"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
        </div>`).join('')}
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   ANIMATIONS & INTERACTIONS
   ══════════════════════════════════════════════════════════ */

/* Scroll-triggered fade-in */
function observeAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    $$('.animate-in').forEach(el => observer.observe(el));
}

/* 3D Tilt Effect on Cards */
function initTilt() {
    $$('.card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rx = ((y - cy) / cy) * -6;
            const ry = ((x - cx) / cx) * 6;
            card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

/* Ripple effect on buttons */
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.hero-cta, .filter-apply-btn, .page-btn, .action-btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top = (e.clientY - rect.top) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});
