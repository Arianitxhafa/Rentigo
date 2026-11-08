// Rentigo language (SQ / EN) and theme (system / light / dark) switches.
// Loaded in <head> before the page renders: it sets the theme and language right away, then
// translates the Albanian page (and everything app.js renders later) into English when chosen.
// Translations are keyed by the Albanian text, so the HTML and app.js stay unchanged.
(() => {
  const root = document.documentElement;
  const read = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  };

  const browser = (navigator.languages || [navigator.language || ""]).map((l) => String(l).slice(0, 2).toLowerCase()).find((l) => l === "sq" || l === "en");
  const saved = read("rentigo-lang");
  const lang = saved === "sq" || saved === "en" ? saved : browser || "sq";
  let theme = read("rentigo-theme");
  if (theme !== "light" && theme !== "dark") theme = "system";
  root.lang = lang;
  if (theme !== "system") root.dataset.theme = theme;

  const EN = {
    // Navigation and shell
    "Makina me qira": "Car rental",
    "Hap menune": "Open menu",
    "Navigimi kryesor": "Main navigation",
    Ballina: "Home",
    Flota: "Fleet",
    Rezervim: "Booking",
    Sherbime: "Services",
    "Rreth nesh": "About us",
    Kontakt: "Contact",
    Hyr: "Log in",
    Regjistrohu: "Sign up",
    Dil: "Log out",
    Llogaria: "Account",
    "Llogaria ime": "My account",
    Faqe: "Pages",
    Suport: "Support",
    "Mitrovice, Kosove": "Mitrovica, Kosovo",
    "© 2026 Rentigo. Te gjitha te drejtat e rezervuara.": "© 2026 Rentigo. All rights reserved.",
    "Siguri, transparence dhe rezervime te shpejta.": "Safety, transparency and fast bookings.",
    "Rezervime online, flote e verifikuar dhe asistence per udhetimet ne qytetet kryesore.": "Online booking, a verified fleet and assistance for trips across the main cities.",
    "24/7 asistence": "24/7 assistance",
    "Flote e kontrolluar": "Inspected fleet",
    // Titles and meta
    "Rentigo | Makina me qira ne Kosove": "Rentigo | Car rental in Kosovo",
    "Rentigo ofron makina me qira, rezervime online dhe asistence ne Kosove.": "Rentigo offers car rental, online booking and assistance in Kosovo.",
    "Rreth nesh | Rentigo": "About us | Rentigo",
    "Llogaria | Rentigo": "Account | Rentigo",
    "Admin | Rentigo": "Admin | Rentigo",
    "Rezervim | Rentigo": "Booking | Rentigo",
    "Kontakt | Rentigo": "Contact | Rentigo",
    "Flota | Rentigo": "Fleet | Rentigo",
    "Login | Rentigo": "Log in | Rentigo",
    "Sherbime | Rentigo": "Services | Rentigo",
    "Sign Up | Rentigo": "Sign up | Rentigo",
    // Home
    "Rezervim online ne pak hapa": "Book online in a few steps",
    "Flote moderne per udhetime biznesi, pushime familjare dhe levizje ditore ne qytetet kryesore.": "A modern fleet for business trips, family holidays and everyday driving in the main cities.",
    "Shiko makinat": "See the cars",
    Kontakto: "Contact us",
    "Kerko makine": "Find a car",
    Kerko: "Search",
    Kategoria: "Category",
    Kategori: "Category",
    "Te gjitha": "All",
    Marrja: "Pick-up",
    Kthimi: "Return",
    Avantazhet: "Why Rentigo",
    "makina ne flote": "cars in the fleet",
    asistence: "assistance",
    "qytete nga te cilat mund te besh rezervime": "cities you can book from",
    "gati per rezervim": "ready to book",
    "Te zgjedhura": "Featured",
    "Makina gati per rruge": "Cars ready for the road",
    "Per cdo lloj udhetimi": "For every kind of trip",
    Biznes: "Business",
    "Makina komode, dokumentacion i rregullt dhe fatura per kompanite.": "Comfortable cars, proper paperwork and invoices for companies.",
    Aeroport: "Airport",
    "Marrje dhe dorezim ne pikat kryesore, me koordinim te shpejte para udhetimit.": "Pick-up and drop-off at the main points, quickly coordinated before your trip.",
    Pushime: "Holidays",
    "SUV, city cars dhe makina familjare per rruget bregdetare ose qytetet malore.": "SUVs, city cars and family cars for coastal roads or mountain towns.",
    Siguri: "Safety",
    "Flote e kontrolluar, asistence rrugore dhe rezervime me historik.": "An inspected fleet, roadside assistance and a booking history.",
    "Gati per nisje": "Ready to go",
    "Rezervo makinen tende sot": "Book your car today",
    "Zgjidh floten, vendos datat dhe dergo rezervimin online.": "Pick from the fleet, set your dates and send the booking online.",
    "Fillo rezervimin": "Start booking",
    // About
    "Udhetime te thjeshta, nga rezervimi deri te dorezimi": "Simple trips, from booking to drop-off",
    "Rentigo kombinon flote te perzgjedhur, cmime te qarta dhe koordinim te shpejte per kliente individuale dhe kompani.": "Rentigo combines a hand-picked fleet, clear prices and fast coordination for individuals and companies.",
    "Flote e verifikuar": "Verified fleet",
    "Rezervime online": "Online bookings",
    "Kontakte klientesh": "Customer contacts",
    Klientet: "Customers",
    "Eksperience e qarte dhe e shpejte": "A clear, fast experience",
    "Rezervimi online ishte i thjeshte dhe makina ishte gati kur mberrita ne Mitrovice.": "Booking online was simple and the car was ready when I arrived in Mitrovica.",
    "Udhetim biznesi": "Business trip",
    "Flota kishte opsione per familje dhe procesi i marrjes zgjati pak minuta.": "The fleet had family options and pick-up took just a few minutes.",
    "Pushime ne jug": "Holiday in the south",
    "Ekipi na konfirmoi shpejt dhe ndryshimi i dates u trajtua pa vonesa.": "The team confirmed quickly and the date change was handled without delay.",
    "Rezervim weekend": "Weekend booking",
    // Account
    "Llogaria jote": "Your account",
    "Mire se erdhe,": "Welcome,",
    klient: "customer",
    Klient: "Customer",
    "Shiko profilin dhe rezervimet qe ke krijuar duke qene i loguar.": "See your profile and the bookings you made while logged in.",
    "Dil nga llogaria": "Log out",
    Rezervimet: "Bookings",
    "Historiku yt": "Your history",
    "Nuk ke ende rezervime ne llogarine tende.": "You don't have any bookings in your account yet.",
    // Admin
    "Panel administrimi": "Admin panel",
    "Paneli i menaxhimit": "Management panel",
    Statistika: "Statistics",
    "Makina aktive": "Active cars",
    "Te disponueshme": "Available",
    "Rezervime aktive": "Active bookings",
    "Te ardhura": "Revenue",
    "Admin tabs": "Admin tabs",
    Rezervime: "Bookings",
    Mesazhet: "Messages",
    "Shto makine": "Add a car",
    "Te gjitha makinat": "All cars",
    Rifresko: "Refresh",
    Marka: "Brand",
    Modeli: "Model",
    Viti: "Year",
    Transmisioni: "Transmission",
    Karburanti: "Fuel",
    Vende: "Seats",
    "Cmimi / dite": "Price / day",
    Statusi: "Status",
    "E disponueshme": "Available",
    "E zene": "Booked",
    Servis: "In service",
    "Foto URL": "Photo URL",
    "Ruaj makinen": "Save car",
    Edito: "Edit",
    "Perditeso makinen": "Update car",
    Mbyll: "Close",
    Anulo: "Cancel",
    "Ruaj ndryshimet": "Save changes",
    "Panel privat": "Private panel",
    "Menaxhim flote, rezervime, mesazhe dhe statistika operative.": "Fleet management, bookings, messages and operating statistics.",
    "Akses privat": "Private access",
    "Session i mbrojtur": "Protected session",
    Paneli: "Dashboard",
    "Dil nga admin": "Log out of admin",
    "Faqe publike": "Public pages",
    "© 2026 Rentigo Admin.": "© 2026 Rentigo Admin.",
    "Paneli eshte i disponueshem vetem per administratorin.": "The panel is available to the administrator only.",
    "Edito makinen": "Edit car",
    "Fshi makinen": "Delete car",
    Konfirmo: "Confirm",
    "Konfirmo rezervimin": "Confirm booking",
    "Anulo rezervimin": "Cancel booking",
    Perfundo: "Complete",
    "Perfundo rezervimin": "Complete booking",
    Konfirmuar: "Confirmed",
    Perfunduar: "Completed",
    Anuluar: "Cancelled",
    Pritje: "Pending",
    Totali: "Total",
    // Booking
    "Perfundo rezervimin online": "Complete your booking online",
    "Zgjidh makinen, vendos datat dhe dergo kerkesen.": "Pick the car, set the dates and send the request.",
    "Te dhenat": "Details",
    "Rezervo ne pak hapa": "Book in a few steps",
    "Zgjidh nje makine nga lista ose hap rezervimin direkt nga faqja e flotes.": "Pick a car from the list or start the booking straight from the fleet page.",
    "Shiko floten": "See the fleet",
    Makina: "Car",
    "Zgjidh makine": "Choose a car",
    "Zgjidh nje makine": "Choose a car",
    "Rezervimi lidhet me makinen e zgjedhur.": "The booking is linked to the selected car.",
    Klienti: "Customer",
    "Emri dhe mbiemri": "Full name",
    Telefon: "Phone",
    Lokacioni: "Location",
    "Zgjidh qytetin": "Choose a city",
    "Zgjidh makinen dhe datat.": "Choose the car and the dates.",
    "Rezervo tani": "Book now",
    Rezervo: "Book",
    "klienti@email.com": "customer@email.com",
    // Contact
    "Na shkruaj per oferte ose asistence": "Write to us for a quote or assistance",
    "Mesazhi ruhet si lead dhe shfaqet ne panelin admin.": "Your message is saved and shown in the admin panel.",
    Detajet: "Details",
    "Do te kthehemi shpejt": "We'll get back to you soon",
    "Na dergo detajet e udhetimit dhe do te kthehemi me opsionin me te pershtatshem.": "Send us your trip details and we'll come back with the best option.",
    Emri: "Name",
    Tema: "Subject",
    "Oferte biznesi": "Business quote",
    Asistence: "Assistance",
    Tjeter: "Other",
    Mesazhi: "Message",
    "Pershkruaj kerkesen...": "Describe your request...",
    "Dergo mesazhin": "Send message",
    // Fleet
    "Makina per qira": "Cars for rent",
    "Zgjidh sipas kategorise dhe disponueshmerise.": "Choose by category and availability.",
    Katalogu: "Catalogue",
    "Zgjidh makinen tende": "Choose your car",
    Filtra: "Filters",
    "Te zena": "Booked",
    Pastro: "Clear",
    "Nuk ka makina per filtrat aktuale.": "No cars match the current filters.",
    "Nuk ka makina te disponueshme per momentin.": "No cars are available right now.",
    "Nuk ka makina ne flote.": "There are no cars in the fleet.",
    "Nuk ka rezervime.": "No bookings.",
    "Nuk ka mesazhe kontakti.": "No contact messages.",
    "/ dite": "/ day",
    // Login and sign-up
    Perdorues: "Customer",
    "Hyr ne llogari": "Log in to your account",
    "Ruaj te dhenat dhe ndiq rezervimet e tua me Rentigo.": "Save your details and follow your bookings with Rentigo.",
    "Shfaq fjalëkalimin": "Show password",
    "Fsheh fjalëkalimin": "Hide password",
    "Shfaq fjalëkalimin admin": "Show admin password",
    "Nuk ke llogari?": "Don't have an account?",
    "Krijo llogari": "Create account",
    "Admin privat": "Private admin",
    "Vetem admin": "Admin only",
    "Hyr ne panel": "Log in to the panel",
    "Kjo zone kerkon password-in e administratorit.": "This area needs the administrator password.",
    "Password admin": "Admin password",
    "Shkruaj password-in": "Enter the password",
    "Hyr si admin": "Log in as admin",
    "Login klienti": "Customer login",
    "Llogari e re": "New account",
    Regjistrim: "Sign up",
    "Krijo profilin tend per rezervime me te shpejta.": "Create your profile for faster bookings.",
    "Minimum 6 karaktere": "At least 6 characters",
    "Ke llogari?": "Already have an account?",
    "Hyr ketu": "Log in here",
    // Services
    "Zgjidhje per cdo udhetim": "Solutions for every trip",
    "Makina per biznes, pushime, aeroport dhe udhetime ditore.": "Cars for business, holidays, airport runs and day trips.",
    "Makina komode, kontrata te qarta dhe fatura per kompani.": "Comfortable cars, clear contracts and invoices for companies.",
    "Marrje dhe dorezim ne pikat kryesore, me koordinim para udhetimit.": "Pick-up and drop-off at the main points, coordinated before your trip.",
    "SUV, city cars dhe makina familjare per bregdet ose udhetime malore.": "SUVs, city cars and family cars for the coast or mountain trips.",
    "Flote e kontrolluar, asistence rrugore dhe historik rezervimesh.": "An inspected fleet, roadside assistance and a booking history.",
    Procesi: "Process",
    "Si funksionon": "How it works",
    "1. Zgjidh makinen": "1. Choose the car",
    "Filtro floten sipas qytetit, kategorise dhe buxhetit.": "Filter the fleet by city, category and budget.",
    "2. Dergo rezervimin": "2. Send the booking",
    "Vendos datat, lokacionin dhe te dhenat e kontaktit.": "Set the dates, the location and your contact details.",
    "3. Merr konfirmimin": "3. Get confirmation",
    "Ekipi konfirmon disponueshmerine dhe dorezimin.": "The team confirms availability and the hand-over.",
    // Toasts and server messages
    "Duhet te identifikohesh si admin.": "You need to log in as admin.",
    "Duhet te hysh ne llogarine tende.": "You need to log in to your account.",
    "Kerkesa deshtoi.": "The request failed.",
    "Makina u fshi nga flota.": "The car was removed from the fleet.",
    "Makina u perditesua me sukses.": "The car was updated.",
    "Data e kthimit duhet te jete pas marrjes.": "The return date must be after pick-up.",
    "Data e kthimit duhet te jete pas dates se marrjes.": "The return date must be after the pick-up date.",
    "Zgjidh nje makine perpara rezervimit.": "Choose a car before booking.",
    "Rezervimi u krijua me sukses.": "Your booking was created.",
    "Mesazhi u dergua me sukses.": "Your message was sent.",
    "Makina u shtua ne flote.": "The car was added to the fleet.",
    "Statusi u perditesua.": "Status updated.",
    "Flota u rifreskua.": "Fleet refreshed.",
    "Rezervimet u rifreskuan.": "Bookings refreshed.",
    "JSON i derguar nuk eshte i vlefshem.": "The JSON sent isn't valid.",
    "Viti i makines nuk eshte i vlefshem.": "The car's year isn't valid.",
    "Numri i vendeve nuk eshte i vlefshem.": "The number of seats isn't valid.",
    "Cmimi ditor nuk eshte i vlefshem.": "The daily price isn't valid.",
    "Statusi i makines nuk eshte i vlefshem.": "The car status isn't valid.",
    "Makina e zgjedhur nuk eshte e vlefshme.": "The selected car isn't valid.",
    "Email-i nuk eshte i vlefshem.": "The email isn't valid.",
    "Datat duhet te jene ne formatin YYYY-MM-DD.": "Dates must use the YYYY-MM-DD format.",
    "Mesazhi duhet te kete te pakten 8 karaktere.": "The message needs at least 8 characters.",
    "Password-i duhet te kete te pakten 6 karaktere.": "The password needs at least 6 characters.",
    "Faqja nuk u gjet.": "Page not found.",
    "Ky email eshte regjistruar me pare.": "This email is already registered.",
    "Email ose password i gabuar.": "Wrong email or password.",
    "Password i gabuar.": "Wrong password.",
    "Akses i ndaluar.": "Access denied.",
    "Makina nuk u gjet.": "Car not found.",
    "Rezervimi nuk u gjet.": "Booking not found.",
    "API endpoint nuk u gjet.": "API endpoint not found.",
    "Metoda nuk lejohet.": "Method not allowed.",
    "Ndodhi nje gabim ne server.": "Something went wrong on the server.",
  };

  // Text that includes numbers or names.
  const PATTERNS = [
    [/^(\d+) rezultate?$/, (m, n) => `${n} result${n === "1" ? "" : "s"}`],
    [/^(\d+) mesazhe?$/, (m, n) => `${n} message${n === "1" ? "" : "s"}`],
    [/^(\d+) vende$/, "$1 seats"],
    [/^(.+) \| (\d+) vende$/, "$1 | $2 seats"],
    [/^(.+) \/ dite$/, "$1 / day"],
    [/^(\d+) dite × (.+)$/, (m, n, rest) => `${n} day${n === "1" ? "" : "s"} × ${rest.replace(/ \/ dite$/, " / day")}`],
    [/^Mungojne fushat: (.+)\.$/, "Missing fields: $1."],
    [/^Rezervimet lejohen vetem brenda qyteteve te Kosoves\. Zgjidh nje qytet: (.+)$/, "Bookings are only available within Kosovo. Choose a city: $1"],
    [/^A je i sigurt qe do ta fshish (.+)\? Rezervimet e lidhura me kete makine do hiqen gjithashtu\.$/, (m, label) => `Are you sure you want to delete ${label === "kete makine" ? "this car" : label}? Bookings linked to this car will be removed too.`],
  ];

  const norm = (s) => s.replace(/\s+/g, " ").trim();
  /** English for an Albanian string (keeps surrounding whitespace); Albanian is returned unchanged. */
  function t(text) {
    if (lang !== "en" || !text || !/[A-Za-zË]/.test(text)) return text;
    const key = norm(text);
    let out = EN[key];
    if (out === undefined) {
      for (const [re, rep] of PATTERNS) {
        if (re.test(key)) {
          out = key.replace(re, rep);
          break;
        }
      }
    }
    if (out === undefined) return text;
    return text.match(/^\s*/)[0] + out + text.match(/\s*$/)[0];
  }

  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  function translate(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const next = t(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
    for (const a of ATTRS) {
      const v = node.getAttribute(a);
      if (v) {
        const next = t(v);
        if (next !== v) node.setAttribute(a, next);
      }
    }
    node.childNodes.forEach(translate);
  }

  const ICONS = {
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  };
  const NEXT = { system: "light", light: "dark", dark: "system" };
  const THEME_NAME = {
    sq: { system: "sipas sistemit", light: "e çelët", dark: "e errët" },
    en: { system: "system", light: "light", dark: "dark" },
  };
  const themeLabel = () => (lang === "en" ? `Theme: ${THEME_NAME.en[theme]}` : `Tema: ${THEME_NAME.sq[theme]}`);

  function controls() {
    const box = document.createElement("div");
    box.className = "prefs";
    box.innerHTML = `
      <button type="button" class="prefs-theme" data-no-translate></button>
      <span class="prefs-lang" role="group" aria-label="${lang === "en" ? "Language" : "Gjuha"}">
        <button type="button" lang="sq" title="Shqip" aria-pressed="${lang === "sq"}">SQ</button>
        <button type="button" lang="en" title="English" aria-pressed="${lang === "en"}">EN</button>
      </span>`;
    const themeButton = box.querySelector(".prefs-theme");
    const paint = () => {
      themeButton.innerHTML = ICONS[theme];
      themeButton.setAttribute("aria-label", themeLabel());
      themeButton.title = themeLabel();
    };
    paint();
    themeButton.addEventListener("click", () => {
      theme = NEXT[theme];
      write("rentigo-theme", theme);
      if (theme === "system") delete root.dataset.theme;
      else root.dataset.theme = theme;
      paint();
    });
    box.querySelectorAll(".prefs-lang button").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.lang === lang) return;
        write("rentigo-lang", b.lang);
        location.reload();
      })
    );
    const header = document.querySelector(".site-header");
    if (header) header.insertBefore(box, header.querySelector(".menu-toggle"));
    else {
      box.classList.add("floating");
      document.body.appendChild(box);
    }
  }

  if (lang === "en") root.classList.add("i18n-pending");
  document.addEventListener("DOMContentLoaded", () => {
    controls();
    if (lang === "en") {
      document.title = t(document.title);
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = t(meta.content);
      translate(document.body);
      // Content rendered later by app.js (cars, bookings, toasts) is translated as it appears.
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "childList") m.addedNodes.forEach(translate);
          else if (m.type === "characterData") translate(m.target);
          else if (m.type === "attributes") translate(m.target);
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
    root.classList.remove("i18n-pending");
  });

  window.RentigoI18n = { lang, t };
})();
