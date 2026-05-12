/* Movie ticket booking dashboard (vanilla JS).
   - Seat availability is deterministic per showtime and persisted booked seats via localStorage.
   - No payments are processed (demo only). */

const MOVIES = [
  {
    id: "m1",
    title: "Neon Horizon",
    year: 2026,
    genre: "Sci-Fi",
    rating: 8.7,
    runtimeMin: 124,
    description:
      "A lost signal from the future pulls a team of engineers into a neon-tinged maze of choices, consequences, and quantum odds.",
    basePriceStandard: 12,
  },
  {
    id: "m2",
    title: "Cafe of Secrets",
    year: 2025,
    genre: "Mystery",
    rating: 8.4,
    runtimeMin: 108,
    description:
      "Every table has a story. When a new menu item appears, patrons begin trading clues that lead to one unexpected culprit.",
    basePriceStandard: 11,
  },
  {
    id: "m3",
    title: "Skyline Warriors",
    year: 2024,
    genre: "Action",
    rating: 8.2,
    runtimeMin: 132,
    description:
      "Two rival crews protect the last safe rooftop in the city while chasing a stolen data core through collapsing districts.",
    basePriceStandard: 13,
  },
  {
    id: "m4",
    title: "Whispering Tides",
    year: 2023,
    genre: "Drama",
    rating: 8.6,
    runtimeMin: 116,
    description:
      "A coastal town's quiet grief resurfaces as an old letter reaches a family on the edge of change.",
    basePriceStandard: 10,
  },
];

const SHOWTIMES = {
  // showtime ids include movieId to keep uniqueness
  m1: [
    { id: "m1s1", time: "10:30 AM", screen: "Screen 3" },
    { id: "m1s2", time: "1:15 PM", screen: "Screen 3" },
    { id: "m1s3", time: "6:40 PM", screen: "IMAX" },
  ],
  m2: [
    { id: "m2s1", time: "11:00 AM", screen: "Screen 2" },
    { id: "m2s2", time: "4:05 PM", screen: "Screen 2" },
    { id: "m2s3", time: "8:20 PM", screen: "Screen 1" },
  ],
  m3: [
    { id: "m3s1", time: "9:45 AM", screen: "Screen 1" },
    { id: "m3s2", time: "2:35 PM", screen: "Screen 1" },
    { id: "m3s3", time: "7:25 PM", screen: "Screen 2" },
  ],
  m4: [
    { id: "m4s1", time: "12:10 PM", screen: "Screen 2" },
    { id: "m4s2", time: "3:55 PM", screen: "Screen 3" },
    { id: "m4s3", time: "9:05 PM", screen: "IMAX" },
  ],
};

const TICKET_TYPES = {
  standard: { label: "Standard", multiplier: 1.0 },
  premium: { label: "Premium", multiplier: 1.5 },
  student: { label: "Student", multiplier: 0.8 },
};

// Seat map config
const SEAT_ROWS = ["A", "B", "C", "D", "E", "F", "G"];
const SEATS_PER_ROW = 12;
const AISLE_BETWEEN = 6; // gap between 6 and 7
const DEFAULT_MAX_BOOKED_SEATS_PER_SHOW = 8; // just for deterministic "unavailable" distribution

const STORAGE_KEYS = {
  bookings: "cineDash.bookings.v1",
};

const state = {
  selectedMovieId: null,
  selectedShowId: null,
  ticketType: "standard",
  maxSeats: 8,
  selectedSeats: new Set(),
  // seatAvailability: computed on show selection
  // seatAvailability[seatId] = "free" | "blocked"
  seatAvailability: {},
};

// ---------- Utilities ----------
function money(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}

function formatRuntime(mins) {
  if (!mins) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Seeded RNG (deterministic) from a string
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seatId(rowLetter, seatNumber) {
  return `${rowLetter}${seatNumber}`;
}

function parseSeatId(id) {
  // e.g. "C10"
  const m = id.match(/^([A-Z])(\d+)$/);
  if (!m) return null;
  return { row: m[1], num: Number(m[2]) };
}

function seatOrder(a, b) {
  const pa = parseSeatId(a);
  const pb = parseSeatId(b);
  if (!pa || !pb) return 0;
  const ra = SEAT_ROWS.indexOf(pa.row);
  const rb = SEAT_ROWS.indexOf(pb.row);
  if (ra !== rb) return ra - rb;
  return pa.num - pb.num;
}

function getBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.bookings);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setBookings(bookings) {
  localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(bookings));
}

function getBookedSeatsForShow(showId) {
  const bookings = getBookings();
  const booked = new Set();
  for (const b of bookings) {
    if (b.showId !== showId) continue;
    if (Array.isArray(b.seats)) {
      for (const s of b.seats) booked.add(s);
    }
  }
  return booked;
}

function buildSeatAvailability(showId) {
  // Determine "blocked" seats deterministically per showId, then overlay actual booked seats.
  const seed = hashStringToSeed(showId);
  const rnd = mulberry32(seed);

  const baseBlockedCount = Math.floor(
    clamp(
      // more blocks for later showtimes, just for variety
      (seed % 100) / 100,
      0.2,
      0.8
    ) *
      DEFAULT_MAX_BOOKED_SEATS_PER_SHOW
  );

  const deterministicBlocked = new Set();

  // Lock a few random seats plus a couple near the front/back for "realism".
  const allSeatIds = [];
  for (const r of SEAT_ROWS) {
    for (let sn = 1; sn <= SEATS_PER_ROW; sn++) {
      allSeatIds.push(seatId(r, sn));
    }
  }

  // Spread: avoid blocking the aisle gap by definition (we don't have aisle seats).
  for (let i = 0; i < baseBlockedCount; i++) {
    const idx = Math.floor(rnd() * allSeatIds.length);
    deterministicBlocked.add(allSeatIds[idx]);
  }

  // Additional structured blocks (front/center).
  const frontRows = [SEAT_ROWS[0], SEAT_ROWS[1]];
  for (const r of frontRows) {
    const centerSeat = AISLE_BETWEEN; // approximate center seat on left side
    deterministicBlocked.add(seatId(r, clamp(centerSeat, 1, SEATS_PER_ROW)));
    if (rnd() > 0.5) deterministicBlocked.add(seatId(r, clamp(centerSeat + 2, 1, SEATS_PER_ROW)));
  }

  const bookedSeats = getBookedSeatsForShow(showId);

  const availability = {};
  for (const s of allSeatIds) {
    if (deterministicBlocked.has(s) || bookedSeats.has(s)) availability[s] = "blocked";
    else availability[s] = "free";
  }
  return availability;
}

function computePricePerSeat(movie, ticketType) {
  const base = movie.basePriceStandard ?? 10;
  const mult = TICKET_TYPES[ticketType]?.multiplier ?? 1;
  return Math.round(base * mult * 100) / 100;
}

function estimateFees(subtotal) {
  // Simple fees: 8% service fee with a minimum.
  const feeRate = 0.08;
  const fee = subtotal * feeRate;
  return Math.max(1.5, Math.round(fee * 100) / 100);
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

// ---------- DOM ----------
const el = {
  movieSearch: document.getElementById("movieSearch"),
  movieSort: document.getElementById("movieSort"),
  genreTabs: document.getElementById("genreTabs"),
  movieList: document.getElementById("movieList"),
  movieCount: document.getElementById("movieCount"),
  moviePoster: document.getElementById("moviePoster"),
  movieYear: document.getElementById("movieYear"),
  movieGenre: document.getElementById("movieGenre"),
  movieTitle: document.getElementById("movieTitle"),
  movieDesc: document.getElementById("movieDesc"),
  movieRating: document.getElementById("movieRating"),
  movieRuntime: document.getElementById("movieRuntime"),
  showtimeTabs: document.getElementById("showtimeTabs"),
  seatGrid: document.getElementById("seatGrid"),
  seatAvailability: document.getElementById("seatAvailability"),
  ticketType: document.getElementById("ticketType"),
  maxSeats: document.getElementById("maxSeats"),
  clearSeatsBtn: document.getElementById("clearSeatsBtn"),
  selectedCount: document.getElementById("selectedCount"),
  ticketPrice: document.getElementById("ticketPrice"),
  subtotal: document.getElementById("subtotal"),
  fees: document.getElementById("fees"),
  total: document.getElementById("total"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  viewMyBookingsBtn: document.getElementById("viewMyBookingsBtn"),
  selectedSeatsList: document.getElementById("selectedSeatsList"),
  bookingMeta: document.getElementById("bookingMeta"),
  modalRoot: document.getElementById("modalRoot"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  resetDemoBtn: document.getElementById("resetDemoBtn"),
  clockPill: document.getElementById("clockPill"),
};

// ---------- Rendering ----------
function allGenres() {
  const s = new Set();
  for (const m of MOVIES) s.add(m.genre);
  return Array.from(s).sort();
}

function setPosterGradient(movie) {
  // Derive a stable gradient from movie id so different movies look different.
  const seed = hashStringToSeed(movie.id);
  const rnd = mulberry32(seed);
  const a = Math.floor(rnd() * 360);
  const b = (a + 60 + Math.floor(rnd() * 120)) % 360;
  el.moviePoster.style.background =
    `radial-gradient(70px 50px at 30% 20%, rgba(255,255,255,.22), transparent 60%),` +
    `linear-gradient(135deg, hsla(${a}, 90%, 60%, .42), hsla(${b}, 90%, 58%, .18))`;
}

function setSwatchGradient(targetEl, movie) {
  // Same gradient logic as the hero poster, but scoped to the movie list swatch.
  const seed = hashStringToSeed(movie.id);
  const rnd = mulberry32(seed);
  const a = Math.floor(rnd() * 360);
  const b = (a + 60 + Math.floor(rnd() * 120)) % 360;
  targetEl.style.background =
    `linear-gradient(135deg, hsla(${a}, 90%, 60%, .42), hsla(${b}, 90%, 58%, .18))`;
}

function renderGenreTabs(activeGenre) {
  const genres = ["All", ...allGenres()];
  el.genreTabs.innerHTML = "";
  for (const g of genres) {
    const isActive = activeGenre ? g === activeGenre : g === "All";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "segBtn";
    btn.textContent = g;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-pressed", String(isActive));
    btn.addEventListener("click", () => {
      const nextGenre = g === "All" ? null : g;
      if (nextGenre === currentFilters.genre) return;
      currentFilters.genre = nextGenre;
      renderGenreTabs(currentFilters.genre);
      renderMovieList();
    });
    el.genreTabs.appendChild(btn);
  }
}

function movieMatchesFilters(movie) {
  const q = (el.movieSearch.value || "").trim().toLowerCase();
  if (q) {
    const inTitle = movie.title.toLowerCase().includes(q);
    const inGenre = movie.genre.toLowerCase().includes(q);
    if (!inTitle && !inGenre) return false;
  }
  if (currentFilters.genre && movie.genre !== currentFilters.genre) return false;
  return true;
}

const currentFilters = { genre: null };

function renderMovieList() {
  const filtered = MOVIES.filter(movieMatchesFilters);
  const sort = el.movieSort.value;

  filtered.sort((a, b) => {
    if (sort === "ratingDesc") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sort === "titleAsc") return a.title.localeCompare(b.title);
    if (sort === "yearDesc") return (b.year ?? 0) - (a.year ?? 0);
    return 0;
  });

  el.movieCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
  el.movieList.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.padding = "8px 6px";
    empty.textContent = "No movies match your search/filters.";
    el.movieList.appendChild(empty);
    return;
  }

  for (const movie of filtered) {
    const node = document.createElement("div");
    node.className = "movieCard";
    node.setAttribute("role", "option");
    node.setAttribute("aria-selected", String(movie.id === state.selectedMovieId));

    const swatch = document.createElement("div");
    swatch.className = "movieSwatch";
    node.style.borderColor = movie.id === state.selectedMovieId ? "rgba(124,92,255,.85)" : undefined;

    setSwatchGradient(swatch, movie);
    node.addEventListener("click", () => selectMovie(movie.id));

    const main = document.createElement("div");
    main.className = "movieCard__main";

    const t = document.createElement("p");
    t.className = "movieCard__title";
    t.textContent = movie.title;
    main.appendChild(t);

    const meta = document.createElement("div");
    meta.className = "movieCard__meta";
    meta.innerHTML = `<span>${movie.genre}</span><span>${movie.year}</span><span>★ ${movie.rating.toFixed(1)}</span>`;
    main.appendChild(meta);

    node.appendChild(swatch);
    node.appendChild(main);
    el.movieList.appendChild(node);
  }
}

function selectMovie(movieId) {
  state.selectedMovieId = movieId;
  state.selectedShowId = null;
  state.selectedSeats.clear();
  state.seatAvailability = {};

  // Update hero
  const movie = MOVIES.find((m) => m.id === movieId);
  if (!movie) return;
  el.movieYear.textContent = String(movie.year);
  el.movieGenre.textContent = movie.genre;
  el.movieTitle.textContent = movie.title;
  el.movieDesc.textContent = movie.description;
  el.movieRating.textContent = `★ ${movie.rating.toFixed(1)}`;
  el.movieRuntime.textContent = formatRuntime(movie.runtimeMin);
  setPosterGradient(movie);

  // Reset UI sections
  renderMovieList(); // update selection marker
  el.showtimeTabs.innerHTML = "";
  el.seatGrid.innerHTML = "";
  el.seatAvailability.textContent = "Pick a show to see seats";
  el.selectedSeatsList.innerHTML = "";
  el.selectedCount.textContent = "0";
  el.ticketPrice.textContent = "$-";
  el.subtotal.textContent = "$-";
  el.fees.textContent = "$-";
  el.total.textContent = "$-";
  el.bookingMeta.textContent = "No show selected";
  el.checkoutBtn.disabled = true;
  el.clearSeatsBtn.disabled = true;

  renderShowtimes(movieId);
}

function selectShow(showId) {
  state.selectedShowId = showId;
  state.selectedSeats.clear();
  state.seatAvailability = {};

  // Recompute seat availability for this show (deterministic + persisted bookings)
  state.seatAvailability = buildSeatAvailability(showId);

  // Mark show active
  const buttons = el.showtimeTabs.querySelectorAll(".showBtn");
  buttons.forEach((b) => {
    // buttons don't store showId; we can match by inner time/screen but simplest: rerender show tabs with active selection
  });
  const movieId = state.selectedMovieId;
  renderShowtimes(movieId);

  el.bookingMeta.textContent = `Show: ${getShowLabel(showId)}`;
  el.clearSeatsBtn.disabled = false;
  updateSeatAvailabilityText();
  renderSeatGrid();
  updateSummary();
}

function getShowLabel(showId) {
  const movieId = state.selectedMovieId;
  const shows = SHOWTIMES[movieId] ?? [];
  const show = shows.find((s) => s.id === showId);
  if (!show) return showId;
  return `${show.time} · ${show.screen}`;
}

function updateSeatAvailabilityText() {
  const totalSeats = SEAT_ROWS.length * SEATS_PER_ROW;
  const freeCount = Object.values(state.seatAvailability).filter((v) => v === "free").length;
  const blockedCount = totalSeats - freeCount;
  el.seatAvailability.textContent = `${freeCount} available · ${blockedCount} unavailable`;
}

function renderSeatGrid() {
  if (!state.selectedShowId) {
    el.seatGrid.innerHTML = "";
    return;
  }
  const totalColumns = SEATS_PER_ROW + (AISLE_BETWEEN < SEATS_PER_ROW ? 1 : 0);
  // grid-template-columns is easier with inline style
  el.seatGrid.style.gridTemplateColumns = `repeat(${totalColumns}, 32px)`;
  el.seatGrid.innerHTML = "";

  for (const r of SEAT_ROWS) {
    for (let sn = 1; sn <= SEATS_PER_ROW; sn++) {
      // Insert aisle spacer between seat 6 and 7
      if (sn === AISLE_BETWEEN + 1) {
        const aisle = document.createElement("div");
        aisle.className = "seat--aisle";
        aisle.setAttribute("aria-hidden", "true");
        el.seatGrid.appendChild(aisle);
      }

      const id = seatId(r, sn);
      const seat = document.createElement("button");
      seat.type = "button";
      seat.className = "seat";
      seat.textContent = sn; // compact label; row is implied by grid grouping

      const status = state.seatAvailability[id] ?? "blocked";
      const isBlocked = status === "blocked";
      seat.setAttribute("aria-disabled", String(isBlocked));
      seat.setAttribute("aria-selected", String(state.selectedSeats.has(id)));
      seat.title = `${id} (${isBlocked ? "Unavailable" : "Available"})`;
      if (!isBlocked) {
        seat.addEventListener("click", () => toggleSeat(id));
      }
      el.seatGrid.appendChild(seat);
    }
  }
}

function toggleSeat(id) {
  if (!state.seatAvailability[id] || state.seatAvailability[id] !== "free") return;

  if (state.selectedSeats.has(id)) {
    state.selectedSeats.delete(id);
  } else {
    if (state.selectedSeats.size >= state.maxSeats) {
      openModal("Seat limit reached", `You can select up to ${state.maxSeats} seats per booking.`);
      return;
    }
    state.selectedSeats.add(id);
  }

  // Update seat button states without full rerender
  const btns = el.seatGrid.querySelectorAll(".seat[aria-selected]");
  btns.forEach((b) => {
    // We can infer seat id from title (we set it)
    const title = b.title || "";
    const m = title.match(/^([A-Z]\d+)\s/);
    if (!m) return;
    const seatIdStr = m[1];
    if (seatIdStr === id) {
      b.setAttribute("aria-selected", String(state.selectedSeats.has(id)));
    }
  });

  updateSummary();
}

function updateSummary() {
  const movie = MOVIES.find((m) => m.id === state.selectedMovieId);
  if (!movie || !state.selectedShowId) {
    el.selectedCount.textContent = "0";
    el.ticketPrice.textContent = "$-";
    el.subtotal.textContent = "$-";
    el.fees.textContent = "$-";
    el.total.textContent = "$-";
    el.checkoutBtn.disabled = true;
    el.selectedSeatsList.innerHTML = "";
    return;
  }

  const selected = Array.from(state.selectedSeats).sort(seatOrder);
  const count = selected.length;
  el.selectedCount.textContent = String(count);

  const pricePerSeat = computePricePerSeat(movie, state.ticketType);
  el.ticketPrice.textContent = `${money(pricePerSeat)} / seat`;

  const subtotal = Math.round(pricePerSeat * count * 100) / 100;
  const fee = estimateFees(subtotal);
  const total = Math.round((subtotal + fee) * 100) / 100;

  el.subtotal.textContent = money(subtotal);
  el.fees.textContent = money(fee);
  el.total.textContent = money(total);

  el.checkoutBtn.disabled = count === 0;
  el.clearSeatsBtn.disabled = count === 0;

  // Chips list
  el.selectedSeatsList.innerHTML = "";
  for (const s of selected) {
    const chip = document.createElement("div");
    chip.className = "seatChip";
    chip.textContent = s;
    el.selectedSeatsList.appendChild(chip);
  }
}

function openModal(title, bodyHtml) {
  el.modalTitle.textContent = title;
  el.modalBody.innerHTML = bodyHtml;
  el.modalRoot.dataset.open = "true";
  el.modalRoot.setAttribute("aria-hidden", "false");
}

function closeModal() {
  el.modalRoot.dataset.open = "false";
  el.modalRoot.setAttribute("aria-hidden", "true");
}

function renderMyBookings() {
  const bookings = getBookings().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  if (bookings.length === 0) {
    openModal("My bookings", `<div>No bookings yet. Pick seats and click <b>Checkout</b>.</div>`);
    return;
  }

  const rows = [];
  for (const b of bookings) {
    const movie = MOVIES.find((m) => m.id === b.movieId);
    const movieTitle = movie?.title ?? b.movieId;
    const seats = Array.isArray(b.seats) ? b.seats.slice().sort(seatOrder) : [];
    const seatStr = seats.join(", ");
    rows.push(`
      <div class="bookingRow">
        <div class="bookingRow__left">
          <div class="bookingRow__title">${movieTitle}</div>
          <div class="bookingRow__meta">
            <span>${b.timeLabel ?? b.showId}</span>
            <span>Seats: ${seats.length}</span>
          </div>
          <div style="margin-top:8px;color:rgba(234,241,255,.90);font-size:12px;line-height:1.35;">
            ${seatStr}
          </div>
        </div>
        <div class="bookingRow__right">
          ${money(b.total ?? 0)}
        </div>
      </div>
    `);
  }

  openModal("My bookings", `<div class="modalList">${rows.join("")}</div>`);
}

function checkout() {
  if (!state.selectedShowId || !state.selectedMovieId) return;

  const movie = MOVIES.find((m) => m.id === state.selectedMovieId);
  if (!movie) return;
  const selected = Array.from(state.selectedSeats).sort(seatOrder);
  if (selected.length === 0) return;

  // Re-validate availability against persisted bookings:
  const bookedNow = getBookedSeatsForShow(state.selectedShowId);
  for (const s of selected) {
    if (bookedNow.has(s)) {
      openModal("Seat no longer available", `Seat ${s} was just booked. Please pick different seats.`);
      state.selectedSeats.delete(s);
      updateSummary();
      renderSeatGrid();
      return;
    }
  }

  // Create booking
  const pricePerSeat = computePricePerSeat(movie, state.ticketType);
  const subtotal = Math.round(pricePerSeat * selected.length * 100) / 100;
  const fee = estimateFees(subtotal);
  const total = Math.round((subtotal + fee) * 100) / 100;

  const booking = {
    id: "b-" + uid(),
    createdAt: Date.now(),
    movieId: state.selectedMovieId,
    showId: state.selectedShowId,
    timeLabel: getShowLabel(state.selectedShowId),
    ticketType: state.ticketType,
    seats: selected,
    subtotal,
    fees: fee,
    total,
  };

  const bookings = getBookings();
  bookings.push(booking);
  setBookings(bookings);

  // Lock seats by moving them to "selected show bookings"
  state.selectedSeats.clear();
  state.seatAvailability = buildSeatAvailability(state.selectedShowId);
  renderSeatGrid();
  updateSeatAvailabilityText();
  updateSummary();
  el.bookingMeta.textContent = `Booked: ${booking.timeLabel}`;

  openModal(
    "Booking confirmed",
    `<div style="color:var(--text);font-weight:900;margin-bottom:8px;">${movie.title}</div>
     <div style="margin-bottom:12px;">Seats: <b>${selected.join(", ")}</b></div>
     <div style="display:flex;gap:14px;flex-wrap:wrap;">
       <div>Subtotal: <b>${money(subtotal)}</b></div>
       <div>Fees: <b>${money(fee)}</b></div>
       <div>Total: <b>${money(total)}</b></div>
     </div>`
  );
}

// ---------- Event wiring ----------
function wireEvents() {
  el.movieSearch.addEventListener("input", () => renderMovieList());
  el.movieSort.addEventListener("change", () => renderMovieList());

  el.ticketType.addEventListener("change", () => {
    state.ticketType = el.ticketType.value;
    updateSummary();
  });
  el.maxSeats.addEventListener("change", () => {
    state.maxSeats = Number(el.maxSeats.value) || 8;
    // If user currently selected more than maxSeats, trim
    if (state.selectedSeats.size > state.maxSeats) {
      const sorted = Array.from(state.selectedSeats).sort(seatOrder);
      state.selectedSeats = new Set(sorted.slice(0, state.maxSeats));
      renderSeatGrid();
      updateSummary();
    } else {
      updateSummary();
    }
  });
  el.clearSeatsBtn.addEventListener("click", () => {
    state.selectedSeats.clear();
    renderSeatGrid();
    updateSummary();
  });
  el.checkoutBtn.addEventListener("click", () => checkout());

  el.viewMyBookingsBtn.addEventListener("click", () => renderMyBookings());

  el.resetDemoBtn.addEventListener("click", () => {
    setBookings([]);
    if (state.selectedShowId) {
      state.seatAvailability = buildSeatAvailability(state.selectedShowId);
      renderSeatGrid();
      updateSeatAvailabilityText();
      updateSummary();
    }
    openModal("Demo reset", "All saved bookings were cleared from localStorage.");
  });

  // Modal close
  el.modalRoot.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const closeAttr = target.getAttribute("data-close");
    if (closeAttr === "true") closeModal();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeModal();
  });

  // Prevent seat clicks from focusing buttons in some browsers when toggling fast
  el.seatGrid.addEventListener("mousedown", (ev) => {
    const target = ev.target;
    if (target instanceof HTMLElement && target.classList.contains("seat")) {
      ev.preventDefault();
    }
  });
}

function startClock() {
  function tick() {
    const now = new Date();
    const hh = now.getHours();
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 || 12;
    el.clockPill.textContent = `${h12}:${mm} ${ampm}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ---------- Init ----------
function init() {
  // Default selection markers
  state.ticketType = el.ticketType.value;
  state.maxSeats = Number(el.maxSeats.value) || 8;

  renderGenreTabs(currentFilters.genre);
  renderMovieList();
  renderShowtimes(null);

  el.seatAvailability.textContent = "Pick a show to see seats";

  wireEvents();
  startClock();

  // If you want an initial selection, uncomment:
  // selectMovie(MOVIES[0].id);
}

// renderShowtimes(null) guard
function renderShowtimes(movieId) {
  el.showtimeTabs.innerHTML = "";
  document.getElementById("showtimeHint").textContent = "Pick a show to book";
  if (!movieId) return;
  const shows = SHOWTIMES[movieId] ?? [];
  if (shows.length === 0) return;
  for (const show of shows) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "showBtn";
    btn.setAttribute("aria-pressed", String(show.id === state.selectedShowId));
    btn.innerHTML = `<div class="showBtn__time">${show.time}</div><div class="showBtn__screen">${show.screen}</div>`;
    btn.addEventListener("click", () => selectShow(show.id));
    el.showtimeTabs.appendChild(btn);
  }
}

init();

