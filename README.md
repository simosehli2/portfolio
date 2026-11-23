# Mohamed Sehli — Portfolio & Live $500 Automation Pack Demo

Personal engineering portfolio and interactive workflow automation demo built by **Mohamed Sehli** (Full-Stack & Workflow Automation Engineer · Meknes, Morocco · GMT+1).

- **Live Deployment (Cloudflare Workers + KV):** [mohamed-sehli.sehlisimo50.workers.dev](https://mohamed-sehli.sehlisimo50.workers.dev)
- **Live Interactive $500 Automation Demo:** [mohamed-sehli.sehlisimo50.workers.dev/demo](https://mohamed-sehli.sehlisimo50.workers.dev/demo)
- **Flagship SaaS:** [merchyon.com](https://merchyon.com)

---

## What's Inside

- **`index.html`** — Light-mode editorial portfolio with EN / FR language switcher, live production work showcase, stack overview, and transparent pricing ($500 Website + Automation Pack & part-time agency retainers).
- **`demo.html`** — Interactive SMB client intake demo (Accounting, Clinic, and Local Service presets in EN & FR) showing real-time lead qualification, Cloudflare KV CRM persistence, instant tailored confirmation email generation, Day-3 follow-up scheduling, webhook JSON preview, and CSV export.
- **`worker_template.js` + `build_worker.py`** — Bundles the HTML pages and REST API (`/api/inquiries`, `/api/export.csv`, `/api/reset`, `/health`) into a single zero-dependency Cloudflare Worker (`worker.js`).
- **`test_worker.mjs`** — 10 automated tests covering routing, Cloudflare KV persistence, validation, CSV formula-injection neutralization, and lead scoring.

## Build & Test Locally

```bash
python3 build_worker.py
node test_worker.mjs
```

## License

MIT
