// Cloudflare Worker for Mohamed Sehli's Portfolio + Live $500 Website & Automation Pack Demo.
// Built automatically by build_worker.py (embeds index.html and demo.html).

const PORTFOLIO_HTML = "__PORTFOLIO_HTML__";
const DEMO_HTML = "__DEMO_HTML__";
const AVATAR_B64 = "__AVATAR_B64__";
const KV_KEY = "demo_inquiries_v1";
const MAX_STORED_LEADS = 40;
const VALID_STATUSES = new Set(["New", "Contacted", "Booked"]);
const VALID_PRESETS = new Set(["accounting", "clinic", "service"]);
const VALID_URGENCIES = new Set(["urgent", "standard", "planning"]);

function securityHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders("application/json; charset=utf-8"),
      "Cache-Control": "no-store",
    },
  });
}

export function scoreAndBuildAutomation({ name, email, service, urgency, notes, preset, lang, nowMs }) {
  const baseDate = new Date(nowMs);
  const followUpDate = new Date(nowMs + 3 * 86400 * 1000).toISOString().slice(0, 10);

  let score = urgency === "urgent" ? 90 : urgency === "standard" ? 74 : 58;
  if (notes && notes.length >= 25) score = Math.min(99, score + 6);
  const priority = score >= 85 ? "HIGH" : "NORMAL";

  const isFr = lang === "fr";
  const checklists = {
    accounting: isFr
      ? ["Vérifier la forme juridique et le volume de pièces", "Envoyer le lien de dépôt sécurisé des bilans", "Planifier un appel découverte de 15 min"]
      : ["Confirm entity type & monthly transaction volume", "Send secure onboarding folder & QuickBooks/Xero invite", "Schedule 15-minute discovery call"],
    clinic: isFr
      ? ["Vérifier les disponibilités praticien & mutuelle", "Envoyer le questionnaire pré-consultation", "Planifier un rappel SMS/e-mail 24h avant le RDV"]
      : ["Check practitioner availability & insurance pre-check", "Send digital intake questionnaire prior to visit", "Queue 24-hour appointment reminder & post-visit review"],
    service: isFr
      ? ["Calculer la fourchette de devis selon le volume", "Envoyer l'estimation PDF instantanée par e-mail", "Programmer la relance automatique J+3 si non confirmé"]
      : ["Calculate estimate range from scope & location", "Send instant quote summary email + booking link", "Schedule Day-3 automatic follow-up if unbooked"],
  };

  const bizNames = {
    accounting: isFr ? "Cabinet Clarté" : "Clarity Bookkeeping & Tax",
    clinic: isFr ? "Clinique Horizon" : "Harbor Physiotherapy",
    service: isFr ? "Atelier Nord" : "Summit Moving & Quotes",
  };

  const biz = bizNames[preset] || bizNames.accounting;
  const emailSubject = isFr
    ? `[${biz}] Confirmation de votre demande — ${service}`
    : `[${biz}] We received your ${service} inquiry`;

  const emailBody = isFr
    ? `Bonjour ${name},\n\nMerci pour votre demande concernant « ${service} ». Elle a été enregistrée automatiquement (Priorité : ${priority}) et notre équipe vous répondra sous 2 heures ouvrées.\n\nProchaines étapes préparées pour vous :\n- ${checklists[preset][0]}\n- ${checklists[preset][1]}\n\nVous pouvez aussi choisir un créneau de 15 minutes directement ici : https://mohamed-sehli.sehlisimo50.workers.dev/demo\n\nCordialement,\nL'équipe ${biz}`
    : `Hi ${name},\n\nThanks for reaching out about ${service}. Your request has been logged automatically (Priority: ${priority}) and our team will reply within 2 business hours.\n\nWhat we prepared automatically:\n- ${checklists[preset][0]}\n- ${checklists[preset][1]}\n\nWant to skip email back-and-forth? Pick a 15-minute slot here: https://mohamed-sehli.sehlisimo50.workers.dev/demo\n\nBest,\n${biz} Team`;

  const followUpTask = isFr
    ? `Relancer ${name} (${email}) sur « ${service} » si le statut reste Nouveau`
    : `Follow up with ${name} (${email}) on "${service}" if status is still New`;

  return {
    id: `lead_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    service,
    urgency,
    notes,
    preset,
    lang: isFr ? "fr" : "en",
    score,
    priority,
    status: "New",
    followUpDate,
    createdAt: baseDate.toISOString(),
    automation: {
      emailSubject,
      emailBody,
      followUpTask,
      checklist: checklists[preset] || checklists.accounting,
    },
  };
}

export function seedDefaultLeads(nowMs = Date.now()) {
  return [
    scoreAndBuildAutomation({
      name: "Daniel Carter",
      email: "daniel@ridgecraftco.com",
      service: "Monthly Bookkeeping",
      urgency: "urgent",
      notes: "8-person studio migrating from spreadsheets to QuickBooks Online.",
      preset: "accounting",
      lang: "en",
      nowMs: nowMs - 3600 * 1000,
    }),
    scoreAndBuildAutomation({
      name: "Claire Moreau",
      email: "claire@atelier-lumiere.fr",
      service: "Tenue Comptable Mensuelle",
      urgency: "standard",
      notes: "PME de 6 personnes à Bordeaux souhaitant automatiser la collecte de pièces.",
      preset: "accounting",
      lang: "fr",
      nowMs: nowMs - 7200 * 1000,
    }),
    scoreAndBuildAutomation({
      name: "Rachel Brooks",
      email: "rachel.brooks@example.net",
      service: "2–3 Bedroom Home Move",
      urgency: "standard",
      notes: "Moving 3BR home in South Austin, needs fast quote + packing.",
      preset: "service",
      lang: "en",
      nowMs: nowMs - 10800 * 1000,
    }),
  ];
}

async function readLeads(env) {
  if (!env || !env.LEADS_KV) return seedDefaultLeads();
  const raw = await env.LEADS_KV.get(KV_KEY);
  if (!raw) {
    const seeded = seedDefaultLeads();
    await env.LEADS_KV.put(KV_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedDefaultLeads();
  } catch {
    return seedDefaultLeads();
  }
}

async function saveLeads(env, leads) {
  if (!env || !env.LEADS_KV) return;
  await env.LEADS_KV.put(KV_KEY, JSON.stringify(leads.slice(0, MAX_STORED_LEADS)));
}

export function csvCell(value) {
  const s = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsv(leads) {
  const header = ["ID", "Name", "Email", "Preset", "Service", "Priority", "Score", "Status", "FollowUpDate", "CreatedAt"];
  const rows = leads.map((l) =>
    [l.id, l.name, l.email, l.preset, l.service, l.priority, l.score, l.status, l.followUpDate, l.createdAt]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n") + "\n";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "GET" && (path === "/" || path === "/index.html")) {
      const html = PORTFOLIO_HTML === "__KV__" ? (await env.LEADS_KV.get("page_index_html")) || "Portfolio loading..." : PORTFOLIO_HTML;
      return new Response(html, {
        status: 200,
        headers: securityHeaders("text/html; charset=utf-8"),
      });
    }

    if (request.method === "GET" && (path === "/demo" || path === "/demo.html")) {
      const html = DEMO_HTML === "__KV__" ? (await env.LEADS_KV.get("page_demo_html")) || "Demo loading..." : DEMO_HTML;
      return new Response(html, {
        status: 200,
        headers: securityHeaders("text/html; charset=utf-8"),
      });
    }

    if (request.method === "GET" && path === "/avatar.jpg") {
      let bytes;
      if (AVATAR_B64 === "__KV__" && env && env.LEADS_KV) {
        bytes = await env.LEADS_KV.get("asset_avatar_jpg", { type: "arrayBuffer" });
      } else if (AVATAR_B64 && AVATAR_B64 !== "__AVATAR_B64__") {
        bytes = Uint8Array.from(atob(AVATAR_B64), (c) => c.charCodeAt(0));
      }
      if (!bytes) return new Response("Not Found", { status: 404 });
      return new Response(bytes, {
        status: 200,
        headers: {
          ...securityHeaders("image/jpeg"),
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    if (request.method === "GET" && path === "/health") {
      return jsonResponse({ ok: true, service: "mohamed-sehli-portfolio-demo", kvBound: Boolean(env && env.LEADS_KV) });
    }

    if (request.method === "GET" && path === "/api/inquiries") {
      const inquiries = await readLeads(env);
      return jsonResponse({ inquiries });
    }

    if (request.method === "POST" && path === "/api/inquiries") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body." }, 400);
      }

      const name = String(body.name || "").trim().slice(0, 80);
      const email = String(body.email || "").trim().slice(0, 100);
      const service = String(body.service || "").trim().slice(0, 100);
      const urgency = VALID_URGENCIES.has(body.urgency) ? body.urgency : "standard";
      const preset = VALID_PRESETS.has(body.preset) ? body.preset : "accounting";
      const notes = String(body.notes || "").trim().slice(0, 400);
      const lang = body.lang === "fr" ? "fr" : "en";

      if (!name || !service || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return jsonResponse({ error: "Please enter a valid name, email, and service." }, 400);
      }

      const inquiry = scoreAndBuildAutomation({
        name,
        email,
        service,
        urgency,
        notes,
        preset,
        lang,
        nowMs: Date.now(),
      });
      const existing = await readLeads(env);
      const updated = [inquiry, ...existing].slice(0, MAX_STORED_LEADS);
      await saveLeads(env, updated);
      return jsonResponse({ inquiry, inquiries: updated }, 201);
    }

    if (request.method === "PATCH" && path.startsWith("/api/inquiries/")) {
      const id = decodeURIComponent(path.slice("/api/inquiries/".length));
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body." }, 400);
      }
      if (!VALID_STATUSES.has(body.status)) {
        return jsonResponse({ error: "Invalid status." }, 400);
      }
      const existing = await readLeads(env);
      let found = null;
      const updated = existing.map((item) => {
        if (item.id === id) {
          found = { ...item, status: body.status };
          return found;
        }
        return item;
      });
      if (!found) return jsonResponse({ error: "Lead not found." }, 404);
      await saveLeads(env, updated);
      return jsonResponse({ inquiry: found });
    }

    if (request.method === "POST" && path === "/api/reset") {
      const seeded = seedDefaultLeads();
      await saveLeads(env, seeded);
      return jsonResponse({ inquiries: seeded });
    }

    if (request.method === "GET" && path === "/api/export.csv") {
      const inquiries = await readLeads(env);
      return new Response(buildCsv(inquiries), {
        status: 200,
        headers: {
          ...securityHeaders("text/csv; charset=utf-8"),
          "Content-Disposition": 'attachment; filename="demo-leads.csv"',
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response("Not Found", { status: 404, headers: securityHeaders("text/plain; charset=utf-8") });
  },
};
