const state = {
  cars: [],
  bookings: [],
  inquiries: [],
  selectedCar: null,
  filters: {
    search: "",
    category: "all",
    location: "all",
    status: "all"
  }
};

const page = document.body.dataset.page || "home";
const params = new URLSearchParams(window.location.search);
const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let revealObserver;

const els = {
  siteHeader: document.querySelector(".site-header"),
  menuToggle: document.querySelector(".menu-toggle"),
  toast: document.querySelector("#toast"),
  totalCars: document.querySelector("#totalCars"),
  availableCars: document.querySelector("#availableCars"),
  activeBookings: document.querySelector("#activeBookings"),
  revenue: document.querySelector("#revenue"),
  publicTotalCars: document.querySelector("#publicTotalCars"),
  publicAvailableCars: document.querySelector("#publicAvailableCars"),
  resultCount: document.querySelector("#resultCount"),
  leadCount: document.querySelector("#leadCount"),
  carGrid: document.querySelector("#carGrid"),
  featuredCarGrid: document.querySelector("#featuredCarGrid"),
  adminCarList: document.querySelector("#adminCarList"),
  bookingList: document.querySelector("#bookingList"),
  leadList: document.querySelector("#leadList"),
  selectedCarBox: document.querySelector("#selectedCarBox"),
  selectedCarId: document.querySelector("#selectedCarId"),
  bookingCarSelect: document.querySelector("#bookingCarSelect"),
  pickupLocation: document.querySelector("#pickupLocation"),
  filterForm: document.querySelector("#filterForm"),
  heroSearchForm: document.querySelector("#heroSearchForm"),
  bookingForm: document.querySelector("#bookingForm"),
  contactForm: document.querySelector("#contactForm"),
  carForm: document.querySelector("#carForm"),
  carLocation: document.querySelector("#carLocation"),
  pickupDate: document.querySelector("#pickupDate"),
  returnDate: document.querySelector("#returnDate"),
  heroPickupDate: document.querySelector("#heroPickupDate"),
  heroReturnDate: document.querySelector("#heroReturnDate"),
  categoryFilter: document.querySelector("#categoryFilter"),
  locationFilter: document.querySelector("#locationFilter"),
  heroCategory: document.querySelector("#heroCategory"),
  heroLocation: document.querySelector("#heroLocation"),
  statusFilter: document.querySelector("#statusFilter"),
  searchInput: document.querySelector("#searchInput"),
  resetFilters: document.querySelector("#resetFilters"),
  refreshBookings: document.querySelector("#refreshBookings"),
  refreshCars: document.querySelector("#refreshCars"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  userLoginForm: document.querySelector("#userLoginForm"),
  passwordToggleButtons: document.querySelectorAll(".password-toggle"),
  userSignupForm: document.querySelector("#userSignupForm"),
  logoutButton: document.querySelector("#logoutButton"),
  footerLogoutButton: document.querySelector("#footerLogoutButton"),
  userLogoutButton: document.querySelector("#userLogoutButton"),
  accountName: document.querySelector("#accountName"),
  accountFullName: document.querySelector("#accountFullName"),
  accountEmail: document.querySelector("#accountEmail"),
  accountPhone: document.querySelector("#accountPhone"),
  accountBookingList: document.querySelector("#accountBookingList"),
  bookingTotalBox: document.querySelector("#bookingTotalBox"),
  bookingTotal: document.querySelector("#bookingTotal"),
  bookingTotalDetails: document.querySelector("#bookingTotalDetails"),
  editCarDialog: document.querySelector("#editCarDialog"),
  editCarForm: document.querySelector("#editCarForm"),
  editCarId: document.querySelector("#editCarId"),
  closeEditCar: document.querySelector("#closeEditCar"),
  cancelEditCar: document.querySelector("#cancelEditCar"),
  editCarLocation: document.querySelector("#editCarLocation")
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("en-US")} EUR`;
}

const MONTHS = {
  sq: ["jan", "shk", "mar", "pri", "maj", "qer", "korr", "gush", "sht", "tet", "nën", "dhj"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
};
const uiLang = () => (document.documentElement.lang === "en" ? "en" : "sq");
const t = (text) => (window.RentigoI18n ? window.RentigoI18n.t(text) : text);

// Month names by hand: not every browser ships Albanian date data.
function formatDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day} ${MONTHS[uiLang()][Number(month) - 1]} ${year}`;
}

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setValue(element, value) {
  if (element) {
    element.value = value;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && page === "admin") {
      window.location.href = `/login?admin=1&next=${encodeURIComponent(window.location.pathname)}`;
      return Promise.reject(new Error("Duhet te identifikohesh si admin."));
    }
    if (response.status === 401 && page === "account") {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return Promise.reject(new Error("Duhet te hysh ne llogarine tende."));
    }
    throw new Error(data.error || "Kerkesa deshtoi.");
  }
  return data;
}

function notify(message, type = "success") {
  if (!els.toast) return;

  els.toast.textContent = message;
  els.toast.className = `toast show ${type === "error" ? "error" : ""}`;
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => {
    els.toast.className = "toast";
  }, 3200);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setupScrollEffects() {
  const updateHeader = () => {
    document.body.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function animateNumber(element, value, formatter = (number) => String(number)) {
  if (!element) return;

  const end = Number(value || 0);
  if (!motionAllowed) {
    element.textContent = formatter(end);
    element.dataset.currentValue = String(end);
    return;
  }

  const start = Number(element.dataset.currentValue || 0);
  const duration = 780;
  const startTime = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (end - start) * eased);
    element.textContent = formatter(current);

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    element.dataset.currentValue = String(end);
  };

  requestAnimationFrame(tick);
}

function setupRevealAnimations(root = document) {
  if (!motionAllowed) return;

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("reveal-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12
      }
    );
  }

  const revealTargets = root.querySelectorAll(
    ".page-hero, .section, .story-section, .faq-section, .cta-band, .trust-strip > div, .car-card, .service-item, .testimonial-grid article, .filter-form, .booking-form, .contact-form, .car-form, .metric, .booking-row, .lead-row, .admin-car-row"
  );

  revealTargets.forEach((element, index) => {
    if (element.dataset.revealBound === "true") return;
    element.dataset.revealBound = "true";
    element.classList.add("reveal");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
    revealObserver.observe(element);
  });
}

function userInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function renderUserNav(user) {
  const nav = document.querySelector(".site-nav");
  if (!nav || page === "admin") return;

  nav.querySelector(".user-nav-group")?.remove();
  const group = document.createElement("span");
  group.className = "user-nav-group";

  if (user) {
    group.innerHTML = `
      <a class="user-pill" href="/account">
        <span class="user-avatar">${escapeHtml(userInitials(user.fullName))}</span>
        <span>${escapeHtml(user.fullName.split(" ")[0] || "Llogaria")}</span>
      </a>
      <button class="nav-admin nav-logout" type="button" data-user-logout>
        <i data-lucide="log-out"></i>
        <span>Dil</span>
      </button>
    `;
  } else {
    group.innerHTML = `
      <a class="nav-cta" href="/login">
        <i data-lucide="log-in"></i>
        <span>Hyr</span>
      </a>
      <a class="nav-admin" href="/signup">
        <i data-lucide="user-plus"></i>
        <span>Regjistrohu</span>
      </a>
    `;
  }

  nav.appendChild(group);
  group.querySelector("[data-user-logout]")?.addEventListener("click", userLogout);
  refreshIcons();
}

async function loadCurrentUser() {
  if (page === "admin" || page === "admin-login") return null;

  const data = await fetchJson("/api/user-me");
  renderUserNav(data.user);

  if (page === "account") {
    if (!data.authenticated) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return null;
    }
    renderAccount(data.user);
  }

  if (page === "booking" && data.user && els.bookingForm) {
    const form = els.bookingForm.elements;
    if (form.customerName && !form.customerName.value) form.customerName.value = data.user.fullName;
    if (form.email && !form.email.value) form.email.value = data.user.email;
    if (form.phone && !form.phone.value) form.phone.value = data.user.phone;
  }

  return data.user;
}

function renderAccount(user) {
  if (!user) return;

  setText(els.accountName, user.fullName.split(" ")[0] || "klient");
  setText(els.accountFullName, user.fullName);
  setText(els.accountEmail, user.email);
  setText(els.accountPhone, user.phone);
}

function setDefaultDates() {
  const today = new Date();
  const pickup = toInputDate(addDays(today, 1));
  const dropoff = toInputDate(addDays(today, 4));

  setValue(els.pickupDate, pickup);
  setValue(els.returnDate, dropoff);
  setValue(els.heroPickupDate, pickup);
  setValue(els.heroReturnDate, dropoff);
}

function buildQuery() {
  const params = new URLSearchParams();
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value && value !== "all") {
      params.set(key, value);
    }
  });
  return params.toString();
}

function syncFilterInputs() {
  setValue(els.searchInput, state.filters.search);
  setValue(els.categoryFilter, state.filters.category);
  setValue(els.locationFilter, state.filters.location);
  setValue(els.statusFilter, state.filters.status);
}

function applyUrlFilters() {
  const category = params.get("category");
  const location = params.get("location");
  const status = params.get("status");
  const search = params.get("search");

  if (category) state.filters.category = category;
  if (location) state.filters.location = location;
  if (status) state.filters.status = status;
  if (search) state.filters.search = search;
}

async function loadStats() {
  const hasStats =
    els.totalCars ||
    els.publicTotalCars ||
    els.availableCars ||
    els.publicAvailableCars ||
    els.activeBookings ||
    els.revenue;

  if (!hasStats) return;

  const endpoint = page === "admin" ? "/api/stats" : "/api/public-stats";
  const stats = await fetchJson(endpoint);

  animateNumber(els.totalCars, stats.cars.total || 0);
  animateNumber(els.availableCars, stats.cars.available || 0);
  animateNumber(els.activeBookings, stats.bookings?.active || 0);
  animateNumber(els.revenue, stats.bookings?.revenue || 0, formatMoney);
  animateNumber(els.publicTotalCars, stats.cars.total || 0, (value) => `${value}+`);
  animateNumber(els.publicAvailableCars, stats.cars.available || 0);
}

async function loadOptions() {
  const optionTargets = [
    els.categoryFilter,
    els.heroCategory,
    els.locationFilter,
    els.heroLocation,
    els.pickupLocation,
    els.carLocation
  ].filter(Boolean);

  if (optionTargets.length === 0) return;

  const options = await fetchJson("/api/options");
  const categories = options.categories.map((item) => item.category);
  const locations = options.locations.map((item) => item.location);

  fillSelect(els.categoryFilter, categories, "Te gjitha");
  fillSelect(els.heroCategory, categories, "Te gjitha");
  fillSelect(els.locationFilter, locations, "Te gjitha");
  fillSelect(els.heroLocation, locations, "Te gjitha");
  fillSelect(els.pickupLocation, locations, "Zgjidh qytetin");
  fillSelect(els.carLocation, locations, "Zgjidh qytetin");
  syncFilterInputs();
}

function fillSelect(select, values, allLabel) {
  if (!select) return;

  const current = select.value;
  select.innerHTML = `<option value="all">${allLabel}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = values.includes(current) ? current : "all";
}

async function loadCars() {
  const needsCars = els.carGrid || els.featuredCarGrid || els.bookingCarSelect || els.adminCarList;
  if (!needsCars) return;

  const query = buildQuery();
  const data = await fetchJson(`/api/cars${query ? `?${query}` : ""}`);
  state.cars = data.cars;

  renderCars();
  renderFeaturedCars();
  renderAdminCars();
  renderBookingCarSelect();
  selectInitialBookingCar();
}

async function loadBookings() {
  if (!els.bookingList) return;

  const data = await fetchJson("/api/bookings");
  state.bookings = data.bookings;
  renderBookings();
}

async function loadInquiries() {
  if (!els.leadList) return;

  const data = await fetchJson("/api/inquiries");
  state.inquiries = data.inquiries;
  renderInquiries();
}

async function loadMyBookings() {
  if (!els.accountBookingList) return;

  const data = await fetchJson("/api/my-bookings");
  renderAccountBookings(data.bookings);
}

function carStatusLabel(status) {
  if (status === "available") return "E disponueshme";
  if (status === "booked") return "E zene";
  return "Servis";
}

function carStatusClass(status) {
  if (status === "available") return "status-available";
  if (status === "booked") return "status-booked";
  return "status-maintenance";
}

function carCard(car) {
  const available = car.status === "available";
  const booked = car.status === "booked";
  const action = available
    ? `<a class="primary-button" href="/booking?carId=${car.id}"><i data-lucide="calendar-plus"></i><span>Rezervo</span></a>`
    : booked
    ? `<button class="primary-button" type="button" disabled><i data-lucide="calendar-x"></i><span>E zene</span></button>`
    : `<button class="primary-button" type="button" disabled><i data-lucide="wrench"></i><span>Servis</span></button>`;

  return `
    <article class="car-card">
      <div class="car-photo">
        <img src="${escapeHtml(car.image_url)}" alt="${escapeHtml(`${car.brand} ${car.model}`)}" loading="lazy" />
      </div>
      <div class="car-body">
        <div class="car-title">
          <h3>${escapeHtml(car.brand)} ${escapeHtml(car.model)}</h3>
          <span class="status-badge ${carStatusClass(car.status)}">
            ${carStatusLabel(car.status)}
          </span>
        </div>
        <div class="meta-grid">
          <span class="meta-item"><i data-lucide="calendar"></i>${escapeHtml(car.year)}</span>
          <!-- location removed per request -->
          <span class="meta-item"><i data-lucide="fuel"></i>${escapeHtml(car.fuel)}</span>
          <span class="meta-item"><i data-lucide="users"></i>${escapeHtml(car.seats)} vende</span>
          <span class="meta-item"><i data-lucide="gauge"></i>${escapeHtml(car.transmission)}</span>
          <span class="meta-item"><i data-lucide="tag"></i>${escapeHtml(car.category)}</span>
        </div>
        <div class="price-row">
          <span><strong>${formatMoney(car.price_per_day)}</strong><small> / dite</small></span>
          ${action}
        </div>
      </div>
    </article>
  `;
}

function renderCars() {
  if (!els.carGrid) return;

  setText(els.resultCount, `${state.cars.length} rezultate`);

  if (state.cars.length === 0) {
    els.carGrid.innerHTML = `<div class="empty-state">Nuk ka makina per filtrat aktuale.</div>`;
    return;
  }

  els.carGrid.innerHTML = state.cars.map(carCard).join("");
  refreshIcons();
  setupRevealAnimations(els.carGrid);
}

function renderFeaturedCars() {
  if (!els.featuredCarGrid) return;

  const cars = state.cars.filter((car) => car.status === "available").slice(0, 3);
  if (cars.length === 0) {
    els.featuredCarGrid.innerHTML = `<div class="empty-state">Nuk ka makina te disponueshme per momentin.</div>`;
    return;
  }

  els.featuredCarGrid.innerHTML = cars.map(carCard).join("");
  refreshIcons();
  setupRevealAnimations(els.featuredCarGrid);
}

function renderAdminCars() {
  if (!els.adminCarList) return;

  if (state.cars.length === 0) {
    els.adminCarList.innerHTML = `<div class="empty-state">Nuk ka makina ne flote.</div>`;
    return;
  }

  els.adminCarList.innerHTML = state.cars
    .map((car) => {
      const available = car.status === "available";
      return `
        <article class="admin-car-row">
          <img src="${escapeHtml(car.image_url)}" alt="${escapeHtml(`${car.brand} ${car.model}`)}" loading="lazy" />
          <span>
            <strong>${escapeHtml(car.brand)} ${escapeHtml(car.model)}</strong>
            <small>${escapeHtml(car.category)} | ${escapeHtml(car.year)}</small>
          </span>
          <span>
            <strong>${formatMoney(car.price_per_day)}</strong>
            <small>${escapeHtml(car.transmission)} | ${escapeHtml(car.fuel)} | ${escapeHtml(car.seats)} vende</small>
          </span>
          <span class="status-badge ${carStatusClass(car.status)}">${carStatusLabel(car.status)}</span>
          <span class="admin-car-actions">
            <button class="icon-button" type="button" title="Edito makinen" aria-label="Edito makinen" data-edit-car="${car.id}">
              <i data-lucide="pencil"></i>
            </button>
            <button class="icon-button danger-button" type="button" title="Fshi makinen" aria-label="Fshi makinen" data-delete-car="${car.id}">
              <i data-lucide="trash-2"></i>
            </button>
          </span>
        </article>
      `;
    })
    .join("");

  refreshIcons();
  setupRevealAnimations(els.adminCarList);
}

async function deleteCar(carId) {
  const car = state.cars.find((item) => String(item.id) === String(carId));
  const label = car ? `${car.brand} ${car.model}` : "kete makine";

  if (!window.confirm(t(`A je i sigurt qe do ta fshish ${label}? Rezervimet e lidhura me kete makine do hiqen gjithashtu.`))) {
    return;
  }

  try {
    await fetchJson(`/api/cars/${carId}`, { method: "DELETE" });
    await Promise.all([loadCars(), loadStats(), loadBookings(), loadOptions()]);
    notify("Makina u fshi nga flota.");
  } catch (error) {
    notify(error.message, "error");
  }
}

function openEditCar(carId) {
  const car = state.cars.find((item) => String(item.id) === String(carId));
  if (!car || !els.editCarDialog || !els.editCarForm) return;

  const form = els.editCarForm.elements;
  setValue(els.editCarId, car.id);
  setValue(form.brand, car.brand);
  setValue(form.model, car.model);
  setValue(form.year, car.year);
  setValue(form.category, car.category);
  setValue(form.transmission, car.transmission);
  setValue(form.fuel, car.fuel);
  setValue(form.seats, car.seats);
  setValue(form.pricePerDay, car.price_per_day);
  setValue(form.status, car.status);
  setValue(form.imageUrl, car.image_url);

  els.editCarDialog.showModal();
  refreshIcons();
}

function closeEditCarDialog() {
  els.editCarDialog?.close();
}

async function submitEditCar(event) {
  event.preventDefault();

  const id = els.editCarId?.value;
  if (!id) return;

  try {
    const data = formToObject(els.editCarForm);
    await fetchJson(`/api/cars/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
    closeEditCarDialog();
    await Promise.all([loadCars(), loadStats(), loadOptions()]);
    notify("Makina u perditesua me sukses.");
  } catch (error) {
    notify(error.message, "error");
  }
}

function renderBookingCarSelect() {
  if (!els.bookingCarSelect) return;

  const current = els.bookingCarSelect.value || params.get("carId") || "";
  const availableCars = state.cars.filter((car) => car.status === "available");
  els.bookingCarSelect.innerHTML = `<option value="">Zgjidh makine</option>`;

  availableCars.forEach((car) => {
    const option = document.createElement("option");
    option.value = car.id;
    option.textContent = `${car.brand} ${car.model} - ${formatMoney(car.price_per_day)} / dite`;
    els.bookingCarSelect.appendChild(option);
  });

  if (availableCars.some((car) => String(car.id) === String(current))) {
    els.bookingCarSelect.value = current;
  }
}

function selectInitialBookingCar() {
  if (!els.bookingForm || state.selectedCar) return;

  const carId = params.get("carId") || els.bookingCarSelect?.value;
  if (carId) {
    selectBookingCar(carId);
  }
}

function updateBookingTotal() {
  const car = state.selectedCar;
  const pickup = els.pickupDate?.value;
  const ret = els.returnDate?.value;

  if (!els.bookingTotal || !els.bookingTotalDetails) return;

  if (!car || !pickup || !ret) {
    setText(els.bookingTotal, "0 EUR");
    setText(els.bookingTotalDetails, "Zgjidh makinen dhe datat.");
    els.bookingTotalBox?.classList.remove("has-total");
    return;
  }

  const start = new Date(`${pickup}T00:00:00`);
  const end = new Date(`${ret}T00:00:00`);
  const days = Math.ceil((end - start) / 86400000);

  if (!Number.isFinite(days) || days < 1) {
    setText(els.bookingTotal, "0 EUR");
    setText(els.bookingTotalDetails, "Data e kthimit duhet te jete pas marrjes.");
    els.bookingTotalBox?.classList.remove("has-total");
    return;
  }

  const total = days * car.price_per_day;
  setText(els.bookingTotal, formatMoney(total));
  setText(
    els.bookingTotalDetails,
    `${days} dite × ${formatMoney(car.price_per_day)} / dite`
  );
  els.bookingTotalBox?.classList.add("has-total");
}

function selectBookingCar(carId) {
  const car = state.cars.find((item) => String(item.id) === String(carId));
  if (!car) return;

  state.selectedCar = car;
  setValue(els.selectedCarId, car.id);
  setValue(els.bookingCarSelect, car.id);

  if (els.selectedCarBox) {
    els.selectedCarBox.classList.add("is-selected");
    els.selectedCarBox.innerHTML = `
      <strong>${escapeHtml(car.brand)} ${escapeHtml(car.model)}</strong>
      <span>${formatMoney(car.price_per_day)} / dite</span>
    `;
  }

  updateBookingTotal();
}

function statusClass(status) {
  if (status === "confirmed") return "status-available";
  if (status === "completed") return "status-completed";
  if (status === "cancelled") return "status-cancelled";
  if (status === "pending") return "status-maintenance";
  return "status-maintenance";
}

function statusLabel(status) {
  if (status === "confirmed") return "Konfirmuar";
  if (status === "completed") return "Perfunduar";
  if (status === "cancelled") return "Anuluar";
  if (status === "pending") return "Pritje";
  return status;
}

function bookingActionButtons(booking) {
  if (booking.status === "pending") {
    return `
      <button class="icon-button" type="button" title="Konfirmo" aria-label="Konfirmo rezervimin" data-booking-status="${booking.id}" data-status="confirmed">
        <i data-lucide="check"></i>
      </button>
      <button class="icon-button danger-button" type="button" title="Anulo" aria-label="Anulo rezervimin" data-booking-status="${booking.id}" data-status="cancelled">
        <i data-lucide="x"></i>
      </button>
    `;
  }
  if (booking.status === "confirmed") {
    return `
      <button class="icon-button" type="button" title="Perfundo" aria-label="Perfundo rezervimin" data-booking-status="${booking.id}" data-status="completed">
        <i data-lucide="badge-check"></i>
      </button>
      <button class="icon-button danger-button" type="button" title="Anulo" aria-label="Anulo rezervimin" data-booking-status="${booking.id}" data-status="cancelled">
        <i data-lucide="x"></i>
      </button>
    `;
  }
  return "";
}

function renderBookings() {
  if (!els.bookingList) return;

  if (state.bookings.length === 0) {
    els.bookingList.innerHTML = `<div class="empty-state">Nuk ka rezervime.</div>`;
    return;
  }

  els.bookingList.innerHTML = state.bookings
    .map((booking) => `
      <article class="booking-row">
        <span>
          <strong>${escapeHtml(booking.customer_name)}</strong>
          <small>${escapeHtml(booking.email)} | ${escapeHtml(booking.phone)}</small>
        </span>
        <span>
          <strong>${escapeHtml(booking.brand)} ${escapeHtml(booking.model)}</strong>
          <small>${escapeHtml(booking.category)}</small>
        </span>
        <span>
          <strong>${formatDate(booking.pickup_date)} - ${formatDate(booking.return_date)}</strong>
          <small>${escapeHtml(booking.pickup_location)}</small>
        </span>
        <span>
          <strong>${formatMoney(booking.total_price)}</strong>
          <small>Totali</small>
        </span>
        <span class="booking-actions">
          <span class="status-badge ${statusClass(booking.status)}">${statusLabel(booking.status)}</span>
          ${bookingActionButtons(booking)}
        </span>
      </article>
    `)
    .join("");

  refreshIcons();
  setupRevealAnimations(els.bookingList);
}

function renderAccountBookings(bookings) {
  if (!els.accountBookingList) return;

  if (!bookings.length) {
    els.accountBookingList.innerHTML = `
      <div class="empty-state">
        Nuk ke ende rezervime ne llogarine tende.
        <a class="primary-button" href="/booking"><i data-lucide="calendar-plus"></i><span>Rezervo tani</span></a>
      </div>
    `;
    refreshIcons();
    return;
  }

  els.accountBookingList.innerHTML = bookings
    .map((booking) => `
      <article class="booking-row">
        <span>
          <strong>${escapeHtml(booking.brand)} ${escapeHtml(booking.model)}</strong>
          <small>${escapeHtml(booking.category)}</small>
        </span>
        <span>
          <strong>${formatDate(booking.pickup_date)} - ${formatDate(booking.return_date)}</strong>
          <small>${escapeHtml(booking.pickup_location)}</small>
        </span>
        <span>
          <strong>${formatMoney(booking.total_price)}</strong>
          <small>Totali</small>
        </span>
        <span>
          <span class="status-badge ${statusClass(booking.status)}">${statusLabel(booking.status)}</span>
        </span>
      </article>
    `)
    .join("");

  els.accountBookingList.insertAdjacentHTML("afterend", "");

  const accountCard = document.querySelector(".account-card");
  const existingBtn = accountCard?.querySelector(".account-new-booking");
  if (existingBtn) existingBtn.remove();
  accountCard?.insertAdjacentHTML("beforeend", `
    <a class="primary-button account-new-booking" href="/booking">
      <i data-lucide="calendar-plus"></i><span>Rezervo tani</span>
    </a>
  `);

  refreshIcons();
  setupRevealAnimations(els.accountBookingList);
}

function renderInquiries() {
  if (!els.leadList) return;

  setText(els.leadCount, `${state.inquiries.length} leads`);

  if (state.inquiries.length === 0) {
    els.leadList.innerHTML = `<div class="empty-state">Nuk ka mesazhe kontakti.</div>`;
    return;
  }

  els.leadList.innerHTML = state.inquiries
    .map((lead) => `
      <article class="lead-row">
        <span>
          <strong>${escapeHtml(lead.full_name)}</strong>
          <small>${escapeHtml(lead.email)} | ${escapeHtml(lead.phone)}</small>
        </span>
        <span>
          <strong>${escapeHtml(lead.topic)}</strong>
          <small>${formatDate(lead.created_at)} ${String(lead.created_at).slice(11, 16)}</small>
        </span>
        <span>
          <strong>${escapeHtml(lead.message)}</strong>
          <small>${escapeHtml(lead.status)}</small>
        </span>
      </article>
    `)
    .join("");
  setupRevealAnimations(els.leadList);
}

function clearSelectedCar() {
  state.selectedCar = null;
  setValue(els.selectedCarId, "");
  setValue(els.bookingCarSelect, "");

  if (els.selectedCarBox) {
    els.selectedCarBox.classList.remove("is-selected");
    els.selectedCarBox.innerHTML = `
      <strong>Zgjidh nje makine</strong>
      <span>Rezervimi lidhet me makinen e zgjedhur.</span>
    `;
  }

  updateBookingTotal();
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setAdminView(name) {
  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminView === name);
  });

  document.querySelectorAll(".admin-view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${name}`)?.classList.add("active");
  refreshIcons();
}

async function submitBooking(event) {
  event.preventDefault();

  if (!els.selectedCarId?.value) {
    notify("Zgjidh nje makine perpara rezervimit.", "error");
    return;
  }

  try {
    await fetchJson("/api/bookings", {
      method: "POST",
      body: JSON.stringify(formToObject(els.bookingForm))
    });
    els.bookingForm.reset();
    setDefaultDates();
    clearSelectedCar();
    await Promise.all([loadStats(), loadBookings(), loadCars()]);
    notify("Rezervimi u krijua me sukses.");
  } catch (error) {
    notify(error.message, "error");
  }
}

async function submitContact(event) {
  event.preventDefault();

  try {
    await fetchJson("/api/inquiries", {
      method: "POST",
      body: JSON.stringify(formToObject(els.contactForm))
    });
    els.contactForm.reset();
    await loadInquiries();
    notify("Mesazhi u dergua me sukses.");
  } catch (error) {
    notify(error.message, "error");
  }
}

async function submitCar(event) {
  event.preventDefault();

  try {
    await fetchJson("/api/cars", {
      method: "POST",
      body: JSON.stringify(formToObject(els.carForm))
    });
    els.carForm.reset();
    els.carForm.elements.year.value = new Date().getFullYear();
    els.carForm.elements.seats.value = 5;
    els.carForm.elements.pricePerDay.value = 55;
    await Promise.all([loadOptions(), loadStats(), loadCars()]);
    setAdminView("carsAdmin");
    notify("Makina u shtua ne flote.");
  } catch (error) {
    notify(error.message, "error");
  }
}

async function submitAdminLogin(event) {
  event.preventDefault();

  try {
    await fetchJson("/api/admin-login", {
      method: "POST",
      body: JSON.stringify(formToObject(els.adminLoginForm))
    });
    window.location.href = safeNext("/admin");
  } catch (error) {
    notify(error.message, "error");
  }
}

async function submitUserLogin(event) {
  event.preventDefault();

  try {
    await fetchJson("/api/user-login", {
      method: "POST",
      body: JSON.stringify(formToObject(els.userLoginForm))
    });
    window.location.href = safeNext("/account");
  } catch (error) {
    notify(error.message, "error");
  }
}

async function submitUserSignup(event) {
  event.preventDefault();

  try {
    await fetchJson("/api/signup", {
      method: "POST",
      body: JSON.stringify(formToObject(els.userSignupForm))
    });
    window.location.href = safeNext("/account");
  } catch (error) {
    notify(error.message, "error");
  }
}

async function adminLogout() {
  try {
    await fetchJson("/api/admin-logout", { method: "POST" });
  } finally {
    window.location.href = "/login?admin=1";
  }
}

async function userLogout() {
  try {
    await fetchJson("/api/user-logout", { method: "POST" });
  } finally {
    window.location.href = "/";
  }
}

async function changeBookingStatus(button) {
  try {
    await fetchJson(`/api/bookings/${button.dataset.bookingStatus}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: button.dataset.status })
    });
    await Promise.all([loadStats(), loadBookings()]);
    notify("Statusi u perditesua.");
  } catch (error) {
    notify(error.message, "error");
  }
}

function applyFilterInputs() {
  state.filters.search = els.searchInput?.value.trim() || "";
  state.filters.category = els.categoryFilter?.value || "all";
  state.filters.location = els.locationFilter?.value || "all";
  state.filters.status = els.statusFilter?.value || "all";
  loadCars().catch((error) => notify(error.message, "error"));
}

function bindEvents() {
  els.menuToggle?.addEventListener("click", () => {
    const isOpen = els.siteHeader.classList.toggle("nav-open");
    els.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      els.siteHeader?.classList.remove("nav-open");
      els.menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => setAdminView(button.dataset.adminView));
  });

  els.adminCarList?.addEventListener("click", (event) => {
    const deleteBtn = event.target.closest("[data-delete-car]");
    if (deleteBtn) {
      deleteCar(deleteBtn.dataset.deleteCar);
      return;
    }
    const editBtn = event.target.closest("[data-edit-car]");
    if (editBtn) {
      openEditCar(editBtn.dataset.editCar);
    }
  });

  els.bookingList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-booking-status]");
    if (button) {
      changeBookingStatus(button);
    }
  });

  els.filterForm?.addEventListener("input", applyFilterInputs);
  els.filterForm?.addEventListener("change", applyFilterInputs);

  els.heroSearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const pickup = els.heroPickupDate?.value;
    const ret = els.heroReturnDate?.value;
    if (pickup && ret && ret <= pickup) {
      notify("Data e kthimit duhet te jete pas dates se marrjes.", "error");
      return;
    }
    const query = new URLSearchParams({
      category: els.heroCategory?.value || "all",
      location: els.heroLocation?.value || "all",
      status: "available"
    });
    window.location.href = `/fleet?${query.toString()}`;
  });

  els.resetFilters?.addEventListener("click", () => {
    els.filterForm.reset();
    state.filters = {
      search: "",
      category: "all",
      location: "all",
      status: "all"
    };
    loadCars().catch((error) => notify(error.message, "error"));
  });

  els.bookingCarSelect?.addEventListener("change", () => {
    if (!els.bookingCarSelect.value) {
      clearSelectedCar();
      return;
    }
    selectBookingCar(els.bookingCarSelect.value);
  });

  els.pickupDate?.addEventListener("change", updateBookingTotal);
  els.returnDate?.addEventListener("change", updateBookingTotal);

  els.bookingForm?.addEventListener("submit", submitBooking);
  els.contactForm?.addEventListener("submit", submitContact);
  els.carForm?.addEventListener("submit", submitCar);
  els.editCarForm?.addEventListener("submit", submitEditCar);
  els.closeEditCar?.addEventListener("click", closeEditCarDialog);
  els.cancelEditCar?.addEventListener("click", closeEditCarDialog);
  els.editCarDialog?.addEventListener("click", (event) => {
    if (event.target === els.editCarDialog) closeEditCarDialog();
  });
  els.adminLoginForm?.addEventListener("submit", submitAdminLogin);
  els.userLoginForm?.addEventListener("submit", submitUserLogin);
  els.passwordToggleButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      const wrapper = button.closest(".password-field");
      const input = wrapper?.querySelector("input[type='password'], input[type='text']");
      if (!input) return;

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      // Lucide replaces <i> with an <svg> on first render, so swap the markup instead of editing the <i>.
      button.innerHTML = `<i data-lucide="${isHidden ? "eye-off" : "eye"}"></i>`;
      button.setAttribute("aria-label", isHidden ? "Fsheh fjalëkalimin" : "Shfaq fjalëkalimin");
      button.setAttribute("aria-pressed", String(isHidden));
      refreshIcons();
      input.focus();
    });
  });
  els.userSignupForm?.addEventListener("submit", submitUserSignup);
  els.logoutButton?.addEventListener("click", adminLogout);
  els.footerLogoutButton?.addEventListener("click", adminLogout);
  els.userLogoutButton?.addEventListener("click", userLogout);
  els.refreshCars?.addEventListener("click", () => {
    loadCars()
      .then(() => notify("Flota u rifreskua."))
      .catch((error) => notify(error.message, "error"));
  });
  els.refreshBookings?.addEventListener("click", () => {
    loadBookings()
      .then(() => notify("Rezervimet u rifreskuan."))
      .catch((error) => notify(error.message, "error"));
  });
}

// Only same-site paths are allowed after login, so ?next= can't send people to another website.
function safeNext(fallback) {
  const next = params.get("next") || "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

// Static hosting has no server-side redirect, so signed-in visitors are sent past the login/signup pages here.
async function redirectSignedInVisitors() {
  const adminMode = page === "login" && params.get("admin") === "1";
  if ((page !== "login" && page !== "signup") || adminMode) return false;
  try {
    const data = await fetch("/api/user-me").then((response) => response.json());
    if (!data.authenticated) return false;
    window.location.replace(safeNext("/account"));
    return true;
  } catch {
    return false;
  }
}

async function init() {
  if (page === "login" && params.get("admin") === "1") {
    document.body.classList.add("admin-auth-mode");
  }

  if (await redirectSignedInVisitors()) return;

  if (page === "booking") {
    state.filters.status = "available";
  }

  applyUrlFilters();
  setDefaultDates();
  setupScrollEffects();
  bindEvents();

  try {
    await Promise.all([loadCurrentUser(), loadStats(), loadOptions()]);
    syncFilterInputs();
    await Promise.all([loadCars(), loadBookings(), loadInquiries(), loadMyBookings()]);
    refreshIcons();
    setupRevealAnimations(document);
  } catch (error) {
    notify(error.message, "error");
  }
}

init();