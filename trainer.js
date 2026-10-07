/* Local trainer profile and event reminders. No account or server required. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainerCompanion = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  const PROFILE_KEY = "pgo-profile";
  const REMINDERS_KEY = "pgo-reminders";
  const NOTICE_KEY = "pgo-notifications";
  const TEAMS = {
    none: "Ainda sem equipe",
    mystic: "Mystic · Sabedoria",
    valor: "Valor · Bravura",
    instinct: "Instinct · Instinto",
  };
  const storageFailures = new Set();
  let profile = read(PROFILE_KEY, {});
  let reminders = read(REMINDERS_KEY, []);
  let notificationsEnabled = read(NOTICE_KEY, false) === true;
  let profileHost = null;
  let reminderHost = null;
  let timer = null;
  profile = cleanProfile(profile) || {};
  reminders = Array.isArray(reminders)
    ? reminders.map(normalizeEvent).filter(Boolean)
    : [];
  reminders = reminders.filter(
    (event, index, all) =>
      all.findIndex((item) => item.id === event.id) === index,
  );

  function read(key, fallback) {
    try {
      return JSON.parse(root.localStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
      storageFailures.delete(key);
      return true;
    } catch (_) {
      storageFailures.add(key);
      return false;
    }
  }
  function normalizeCode(value) {
    return String(value || "").replace(/[\s-]/g, "");
  }
  function validCode(value) {
    return /^\d{12}$/.test(normalizeCode(value));
  }
  function formatCode(value) {
    return normalizeCode(value).replace(/(.{4})(?=.)/g, "$1 ");
  }
  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function cleanProfile(value) {
    if (!isRecord(value)) return null;
    if (!Object.keys(value).length) return {};
    if (typeof value.code !== "string" || !validCode(value.code)) return null;
    if (
      value.name !== undefined &&
      (typeof value.name !== "string" || value.name.length > 30)
    )
      return null;
    if (value.team !== undefined && !Object.hasOwn(TEAMS, value.team))
      return null;
    return {
      name: (value.name || "").trim(),
      code: normalizeCode(value.code),
      team: value.team || "none",
    };
  }
  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }
  function normalizeEvent(event) {
    if (
      !event ||
      typeof event !== "object" ||
      !event.id ||
      !event.start ||
      !event.end
    )
      return null;
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    )
      return null;
    return {
      id: String(event.id).slice(0, 300),
      title: String(event.title || event.name || "Evento Pokémon GO").slice(
        0,
        300,
      ),
      start: start.toISOString(),
      end: end.toISOString(),
      url: safeUrl(event.url),
      notifiedAt:
        typeof event.notifiedAt === "string" &&
        Number.isFinite(Date.parse(event.notifiedAt))
          ? new Date(event.notifiedAt).toISOString()
          : null,
    };
  }
  function snapshot() {
    return {
      profile: { ...profile },
      reminders: reminders.map((event) => ({ ...event })),
    };
  }
  function validateSnapshot(value) {
    if (!isRecord(value))
      return {
        ok: false,
        error: "O backup de treinador precisa ser um objeto.",
      };
    const restoredProfile = cleanProfile(value.profile);
    if (!restoredProfile)
      return {
        ok: false,
        error:
          "O perfil do backup é inválido. Confira o código de 12 números, o nome e a equipe.",
      };
    if (!Array.isArray(value.reminders) || value.reminders.length > 2000)
      return {
        ok: false,
        error: "A lista de lembretes do backup é inválida (máximo de 2.000).",
      };
    const restoredReminders = [],
      ids = new Set();
    for (const event of value.reminders) {
      if (
        !isRecord(event) ||
        typeof event.id !== "string" ||
        !event.id.trim() ||
        event.id.length > 300 ||
        typeof (event.title || event.name) !== "string" ||
        !(event.title || event.name).trim() ||
        (event.title || event.name).length > 300 ||
        typeof event.start !== "string" ||
        typeof event.end !== "string" ||
        (event.url !== undefined &&
          (typeof event.url !== "string" ||
            (event.url && !safeUrl(event.url)))) ||
        (event.notifiedAt != null &&
          (typeof event.notifiedAt !== "string" ||
            !Number.isFinite(Date.parse(event.notifiedAt))))
      ) {
        return {
          ok: false,
          error: "Um lembrete do backup contém dados inválidos.",
        };
      }
      const clean = normalizeEvent(event);
      if (!clean || ids.has(clean.id))
        return {
          ok: false,
          error:
            "O backup contém lembretes com datas inválidas ou identificadores repetidos.",
        };
      ids.add(clean.id);
      restoredReminders.push(clean);
    }
    return {
      ok: true,
      value: { profile: restoredProfile, reminders: restoredReminders },
    };
  }
  function restore(value) {
    const checked = validateSnapshot(value);
    if (!checked.ok) return checked;
    // Validate every entry before changing either in-memory state or browser storage.
    const next = checked.value;
    const old = new Map();
    let persisted = false;
    try {
      old.set(PROFILE_KEY, root.localStorage.getItem(PROFILE_KEY));
      old.set(REMINDERS_KEY, root.localStorage.getItem(REMINDERS_KEY));
      root.localStorage.setItem(PROFILE_KEY, JSON.stringify(next.profile));
      root.localStorage.setItem(REMINDERS_KEY, JSON.stringify(next.reminders));
      storageFailures.delete(PROFILE_KEY);
      storageFailures.delete(REMINDERS_KEY);
      persisted = true;
    } catch (_) {
      // A quota error on the second key must not leave half of a backup on disk.
      for (const [key, original] of old) {
        try {
          if (original === null) root.localStorage.removeItem(key);
          else root.localStorage.setItem(key, original);
        } catch (_) {
          /* Storage may be entirely unavailable; report session-only restoration. */
        }
      }
      storageFailures.add(PROFILE_KEY);
      storageFailures.add(REMINDERS_KEY);
    }
    profile = next.profile;
    reminders = next.reminders;
    if (profileHost) init(profileHost);
    drawReminders();
    emitProfileChange();
    emitRemindersChange();
    status(
      persisted
        ? "Perfil restaurado do backup."
        : "Perfil restaurado nesta sessão. O navegador bloqueou o armazenamento permanente.",
      !persisted,
    );
    return { ok: true, persisted };
  }
  function escapeIcs(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\r|\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }
  function foldIcsLine(line) {
    let result = "",
      current = "",
      bytes = 0;
    const encoder = new TextEncoder();
    for (const char of line) {
      const length = encoder.encode(char).length;
      if (bytes + length > 75) {
        result += current + "\r\n";
        current = " ";
        bytes = 1;
      }
      current += char;
      bytes += length;
    }
    return result + current;
  }
  function icsDate(value) {
    return new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  }
  function makeCalendar(events, now = new Date()) {
    const clean = events.map(normalizeEvent).filter(Boolean);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Meus Pokemon GO//Lembretes//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    for (const event of clean) {
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + encodeURIComponent(event.id) + "@meuspokemon.local",
        "DTSTAMP:" + icsDate(now),
        "DTSTART:" + icsDate(event.start),
        "DTEND:" + icsDate(event.end),
        "SUMMARY:" + escapeIcs(event.title),
        "DESCRIPTION:" +
          escapeIcs(
            "Evento salvo em Meus Pokémon GO." +
              (event.url ? "\nDetalhes: " + event.url : ""),
          ),
      );
      if (event.url) lines.push("URL:" + event.url);
      lines.push(
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        "DESCRIPTION:" + escapeIcs(event.title),
        "END:VALARM",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    return lines.map(foldIcsLine).join("\r\n") + "\r\n";
  }
  function changed() {
    write(REMINDERS_KEY, reminders);
    drawReminders();
    emitRemindersChange();
  }
  function emitRemindersChange() {
    if (root.document)
      root.document.dispatchEvent(
        new root.CustomEvent("trainer-reminders-change", {
          detail: { count: reminders.length },
        }),
      );
  }
  function emitProfileChange() {
    if (root.document)
      root.document.dispatchEvent(
        new root.CustomEvent("trainer-profile-change", {
          detail: { name: profile.name || "", team: profile.team || "none" },
        }),
      );
  }
  function isSaved(id) {
    return reminders.some((event) => event.id === String(id));
  }
  function toggleReminder(event) {
    const id = event && String(event.id);
    if (isSaved(id)) {
      reminders = reminders.filter((item) => item.id !== id);
      changed();
      return false;
    }
    const clean = normalizeEvent(event);
    if (!clean || new Date(clean.end).getTime() <= Date.now()) return false;
    reminders.push(clean);
    changed();
    tick();
    return true;
  }
  function refresh(events) {
    if (!Array.isArray(events)) return;
    let modified = false;
    reminders = reminders.map((saved) => {
      const event = events.find((item) => item && String(item.id) === saved.id);
      if (!event) return saved;
      const fresh = normalizeEvent(event);
      if (!fresh) return saved;
      fresh.notifiedAt = fresh.start === saved.start ? saved.notifiedAt : null;
      if (JSON.stringify(fresh) !== JSON.stringify(saved)) modified = true;
      return fresh;
    });
    if (modified) changed();
  }
  function download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = root.document.createElement("a");
    link.href = url;
    link.download = filename;
    root.document.body.appendChild(link);
    link.click();
    link.remove();
    root.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function init(host) {
    if (!host) return;
    profileHost = host;
    host.classList.add("trainer-panel");
    host.innerHTML = `<div class="trainer-heading"><span class="trainer-eyebrow">SEU PASSE DE TREINADOR</span><h2>Novas amizades, novas aventuras.</h2><p>Guarde seu código e leve seu QR para a próxima raid.</p></div>
      <div class="trainer-profile-layout"><form class="trainer-form" novalidate>
        <label for="trainer-name">Nome de treinador<input id="trainer-name" name="name" maxlength="30" autocomplete="nickname" placeholder="Como você aparece no jogo"></label>
        <label for="trainer-code">Código de treinador<input id="trainer-code" name="code" inputmode="numeric" autocomplete="off" maxlength="16" placeholder="0000 0000 0000" aria-describedby="trainer-code-help trainer-status" required></label>
        <p id="trainer-code-help" class="trainer-help">Os 12 números em Pokémon GO → Amigos → Adicionar amigos.</p>
        <label for="trainer-team">Equipe<select id="trainer-team" name="team"><option value="none">Ainda sem equipe</option><option value="mystic">Mystic · Sabedoria</option><option value="valor">Valor · Bravura</option><option value="instinct">Instinct · Instinto</option></select></label>
        <div class="trainer-actions"><button class="trainer-button" type="submit">Salvar perfil</button><button class="trainer-button trainer-secondary" type="button" data-action="clear">Limpar perfil</button></div>
        <p id="trainer-status" class="trainer-status" role="status" aria-live="polite"></p>
        <p class="trainer-help">Seu perfil fica salvo neste navegador. Não acessamos sua conta do jogo.</p>
      </form><div class="trainer-pass" aria-label="Cartão de treinador"><div class="trainer-pass-top"><span class="trainer-pass-symbol" aria-hidden="true">✦</span><span>TRAINER PASS</span><span class="trainer-pass-badge">GO</span></div><p class="trainer-pass-name"></p><p class="trainer-pass-team"></p><div class="trainer-qr"></div><p class="trainer-pass-code"></p><p class="trainer-qr-note" hidden>QR com seus 12 números. Leia para copiar o código e adicioná-lo no jogo.</p><div class="trainer-actions trainer-pass-actions"><button class="trainer-button trainer-secondary" type="button" data-action="copy">Copiar código</button><button class="trainer-button trainer-secondary" type="button" data-action="download">Baixar QR</button></div></div></div>`;
    const form = host.querySelector("form");
    form.elements.name.value = String(profile.name || "").slice(0, 30);
    form.elements.code.value = validCode(profile.code)
      ? formatCode(profile.code)
      : "";
    form.elements.team.value = Object.hasOwn(TEAMS, profile.team)
      ? profile.team
      : "none";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validCode(form.elements.code.value)) {
        form.elements.code.setAttribute("aria-invalid", "true");
        status("Digite um código com exatamente 12 números.", true);
        form.elements.code.focus();
        return;
      }
      form.elements.code.removeAttribute("aria-invalid");
      profile = {
        name: form.elements.name.value.trim().slice(0, 30),
        code: normalizeCode(form.elements.code.value),
        team: form.elements.team.value,
      };
      const saved = write(PROFILE_KEY, profile);
      form.elements.code.value = formatCode(profile.code);
      drawPass();
      status(
        saved
          ? "Perfil salvo. Seu QR está pronto para compartilhar."
          : "Perfil pronto nesta sessão. O navegador bloqueou o armazenamento permanente.",
        !saved,
      );
      emitProfileChange();
    });
    form.elements.code.addEventListener("input", () =>
      form.elements.code.removeAttribute("aria-invalid"),
    );
    host
      .querySelector('[data-action="clear"]')
      .addEventListener("click", () => {
        profile = {};
        const saved = write(PROFILE_KEY, profile);
        form.reset();
        form.elements.code.removeAttribute("aria-invalid");
        drawPass();
        emitProfileChange();
        status(
          saved
            ? "Perfil removido deste navegador."
            : "Perfil limpo nesta sessão; o armazenamento do navegador está indisponível.",
          !saved,
        );
      });
    host
      .querySelector('[data-action="copy"]')
      .addEventListener("click", async () => {
        if (!validCode(profile.code)) return;
        try {
          await root.navigator.clipboard.writeText(profile.code);
          status("Código copiado!");
        } catch (_) {
          form.elements.code.value = formatCode(profile.code);
          form.elements.code.focus();
          form.elements.code.select();
          status(
            "Selecione e copie o código no campo acima. A cópia automática não está disponível aqui.",
          );
        }
      });
    host
      .querySelector('[data-action="download"]')
      .addEventListener("click", () => {
        const svg = host.querySelector(".trainer-qr svg");
        if (!svg) return;
        download(
          new XMLSerializer().serializeToString(svg),
          "meu-codigo-treinador.svg",
          "image/svg+xml;charset=utf-8",
        );
        status("QR baixado. Você pode compartilhar o arquivo.");
      });
    drawPass();
    startTimer();
  }
  function status(message, error = false) {
    if (!profileHost) return;
    const node = profileHost.querySelector("#trainer-status");
    node.textContent = message;
    node.classList.toggle("trainer-error", error);
  }
  function drawPass() {
    if (!profileHost) return;
    const valid = validCode(profile.code);
    profileHost.querySelector(".trainer-pass-name").textContent =
      profile.name || "Seu próximo capítulo";
    profileHost.querySelector(".trainer-pass-team").textContent = valid
      ? TEAMS[profile.team] || TEAMS.none
      : "Começa com uma nova amizade";
    profileHost.querySelector(".trainer-pass-code").textContent = valid
      ? formatCode(profile.code)
      : "••••  ••••  ••••";
    const qrHost = profileHost.querySelector(".trainer-qr");
    qrHost.replaceChildren();
    let qrReady = false;
    if (valid && typeof root.qrcode === "function") {
      try {
        const qr = root.qrcode(0, "M");
        qr.addData(profile.code, "Numeric");
        qr.make();
        qrHost.innerHTML = qr.createSvgTag({
          cellSize: 5,
          margin: 20,
          scalable: true,
        });
        const svg = qrHost.querySelector("svg");
        svg.setAttribute("role", "img");
        svg.setAttribute(
          "aria-label",
          "QR do código de treinador " + formatCode(profile.code),
        );
        qrReady = true;
      } catch (_) {
        /* The numeric code remains available if a QR cannot be generated. */
      }
    }
    if (!qrReady) {
      const empty = root.document.createElement("p");
      empty.className = "trainer-qr-empty";
      empty.textContent = valid
        ? "QR indisponível. Compartilhe seu código abaixo."
        : "Seu QR aparece aqui quando você salvar o código.";
      qrHost.appendChild(empty);
    }
    profileHost.querySelector('[data-action="copy"]').disabled = !valid;
    profileHost.querySelector('[data-action="download"]').disabled = !qrReady;
    profileHost.querySelector(".trainer-qr-note").hidden = !qrReady;
  }
  function renderReminders(host, events = []) {
    if (!host) return;
    reminderHost = host;
    host.classList.add("trainer-reminders");
    refresh(events);
    drawReminders();
    startTimer();
  }
  function dateLabel(value) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }
  function button(label, handler, secondary = true) {
    const element = root.document.createElement("button");
    element.type = "button";
    element.className =
      "trainer-button" + (secondary ? " trainer-secondary" : "");
    element.textContent = label;
    element.addEventListener("click", handler);
    return element;
  }
  function drawReminders() {
    if (!reminderHost) return;
    reminderHost.innerHTML = `<div class="trainer-reminder-heading"><div><span class="trainer-eyebrow">NÃO PERCA O PRÓXIMO ENCONTRO</span><h2>Meus lembretes <span class="trainer-reminder-count"></span></h2></div><div class="trainer-actions trainer-reminder-controls"></div></div><p class="trainer-help">Avisos 15 minutos antes, apenas enquanto o site estiver aberto. Para receber com o site fechado, exporte para seu calendário e ative os alertas nele. Os horários seguem o fuso deste dispositivo.</p><p class="trainer-reminder-status" role="status" aria-live="polite"></p><div class="trainer-reminder-list"></div>`;
    reminderHost.querySelector(".trainer-reminder-count").textContent =
      reminders.length;
    const controls = reminderHost.querySelector(".trainer-reminder-controls");
    const supported = "Notification" in root && root.isSecureContext;
    const enabled =
      supported &&
      root.Notification.permission === "granted" &&
      notificationsEnabled;
    controls.appendChild(
      button(
        enabled ? "Desativar avisos" : "Ativar avisos no navegador",
        async () => {
          if (enabled) {
            notificationsEnabled = false;
            write(NOTICE_KEY, false);
            drawReminders();
            return;
          }
          if (!supported) {
            reminderStatus(
              "Este navegador não permite notificações aqui. Exporte os eventos para seu calendário.",
            );
            return;
          }
          try {
            const permission = await root.Notification.requestPermission();
            notificationsEnabled = permission === "granted";
            write(NOTICE_KEY, notificationsEnabled);
            drawReminders();
            reminderStatus(
              notificationsEnabled
                ? "Avisos ativados enquanto esta página estiver aberta."
                : "Notificações não autorizadas. Você ainda pode exportar os lembretes.",
            );
            tick();
          } catch (_) {
            reminderStatus(
              "Não foi possível ativar as notificações. Exporte os lembretes para seu calendário.",
            );
          }
        },
      ),
    );
    const exportButton = button("Exportar calendário", () =>
      download(
        makeCalendar(reminders),
        "meus-eventos-pokemon.ics",
        "text/calendar;charset=utf-8",
      ),
    );
    exportButton.disabled = !reminders.length;
    controls.appendChild(exportButton);
    const list = reminderHost.querySelector(".trainer-reminder-list");
    if (!reminders.length) {
      const empty = root.document.createElement("div");
      empty.className = "trainer-reminder-empty";
      empty.innerHTML =
        '<span aria-hidden="true">☆</span><p>Sua próxima aventura merece um lembrete.</p><small>Salve um evento na agenda para encontrá-lo aqui.</small>';
      list.appendChild(empty);
    }
    for (const event of [...reminders].sort(
      (a, b) => new Date(a.start) - new Date(b.start),
    )) {
      const item = root.document.createElement("article");
      item.className = "trainer-reminder-item";
      const details = root.document.createElement("div");
      const title = root.document.createElement("h3");
      title.textContent = event.title;
      const time = root.document.createElement("p");
      time.textContent = dateLabel(event.start) + " → " + dateLabel(event.end);
      const ended = new Date(event.end).getTime() <= Date.now();
      const tag = root.document.createElement("span");
      tag.className = "trainer-reminder-tag";
      tag.textContent = ended
        ? "Encerrado"
        : new Date(event.start).getTime() <= Date.now()
          ? "Em andamento"
          : "Na sua agenda";
      details.append(tag, title, time);
      item.appendChild(details);
      const actions = root.document.createElement("div");
      actions.className = "trainer-actions";
      if (event.url) {
        const link = root.document.createElement("a");
        link.href = event.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "trainer-event-link";
        link.textContent = "Detalhes ↗";
        link.setAttribute("aria-label", "Detalhes de " + event.title);
        actions.appendChild(link);
      }
      actions.appendChild(
        button("Calendário", () =>
          download(
            makeCalendar([event]),
            "evento-pokemon.ics",
            "text/calendar;charset=utf-8",
          ),
        ),
      );
      const remove = button("Remover", () => {
        toggleReminder(event);
        reminderStatus("Lembrete removido.");
      });
      remove.setAttribute("aria-label", "Remover lembrete: " + event.title);
      actions.appendChild(remove);
      item.appendChild(actions);
      list.appendChild(item);
    }
    if (storageFailures.has(REMINDERS_KEY))
      reminderStatus("Lembretes disponíveis nesta sessão.");
    else if (enabled)
      reminderStatus(
        "Avisos no navegador ativados. Mantenha esta página aberta.",
      );
  }
  function reminderStatus(message) {
    if (reminderHost)
      reminderHost.querySelector(".trainer-reminder-status").textContent =
        message +
        (storageFailures.has(REMINDERS_KEY)
          ? " O navegador bloqueou o armazenamento permanente; exporte um backup antes de sair."
          : "");
  }
  function startTimer() {
    if (timer || !root.document) return;
    timer = root.setInterval(tick, 30000);
    root.document.addEventListener("visibilitychange", () => {
      if (!root.document.hidden) tick();
    });
    tick();
  }
  function dueReminders(events, now = Date.now()) {
    return events.filter(
      (event) =>
        !event.notifiedAt &&
        now >= new Date(event.start).getTime() - 900000 &&
        now < new Date(event.end).getTime(),
    );
  }
  function tick() {
    if (
      !notificationsEnabled ||
      !("Notification" in root) ||
      root.Notification.permission !== "granted"
    )
      return;
    let modified = false;
    for (const event of dueReminders(reminders)) {
      try {
        const minutes = Math.ceil(
          (new Date(event.start).getTime() - Date.now()) / 60000,
        );
        new root.Notification(event.title, {
          body:
            minutes > 0
              ? `Começa em ${minutes} min. Abra sua agenda para ver os detalhes.`
              : "Este evento está em andamento. Abra sua agenda para ver os detalhes.",
          tag: "pgo-" + event.id,
        });
        event.notifiedAt = new Date().toISOString();
        modified = true;
      } catch (_) {
        reminderStatus(
          "Este dispositivo não mostrou o aviso. Use a exportação para calendário para receber alertas.",
        );
      }
    }
    if (modified) write(REMINDERS_KEY, reminders);
  }
  return {
    init,
    renderReminders,
    refresh,
    toggleReminder,
    isSaved,
    snapshot,
    validateSnapshot,
    restore,
    normalizeCode,
    validCode,
    formatCode,
    normalizeEvent,
    makeCalendar,
    dueReminders,
  };
});
