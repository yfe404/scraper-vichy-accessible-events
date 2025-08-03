// src/main.ts  – one-shot playlist POST with date facet
import { Actor } from 'apify';
import { CheerioCrawler, Request } from 'crawlee';
import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import { buildRouter } from './routes.js';

interface Input {
    maxEvents?: number; // how many items to request in one shot
    monthsAhead?: number; // how far into the future (default 3)
}

const INFO_TYPE = '23808';
const ENDPOINT = `https://vichymonamour.fr/api/render/website_v2/` + `vichy/playlist/${INFO_TYPE}/fr_FR/json`;

// wheelchair criteria facet (unused yet, website should be updated soon)
const FACET_XXX = [
    'accessible-en-fauteuil-roulant-avec-aide-1610584802810317056',
    'accessible-en-fauteuil-roulant-en-autonomie-1608219246836411904',
];

await Actor.init();

/* ── INPUT ─────────────────────────────────────────────────────────────── */
const { maxEvents = 1000, monthsAhead = 3 } = (await Actor.getInput<Input>()) ?? {};

/* ── build POST body ───────────────────────────────────────────────────── */
const today = dayjs(); // local TZ (Europe/Paris on Apify)
const startISO = today.startOf('day').format(); // 2025-07-05T00:00:00+02:00
const endISO = today.add(monthsAhead, 'month').endOf('month').format(); // 2025-09-30T23:59:59+02:00

const postBody = {
    appType: 'website',
    applyConfig: true,
    size: maxEvents, // one shot
    start: 0,
    confId: INFO_TYPE,
    facets: {
        '195930': {
            start: startISO,
            end: endISO,
            availableOnly: true,
        },
        //'XXX': FACET_XXX,
    },
    randomSeed: randomUUID(),
};

/* ── seed RequestQueue with a single playlist request ─────────────────── */
const rq = await Actor.openRequestQueue();
const router = buildRouter();
await rq.addRequest({
    url: ENDPOINT,
    method: 'POST',
    payload: JSON.stringify(postBody),
    headers: { 'Content-Type': 'application/json' },
    label: 'PLAYLIST',
    useExtendedUniqueKey: true,
});

/* ── run crawler with external router (routes.ts) ──────────────────────── */
const crawler = new CheerioCrawler({
    requestQueue: rq,
    requestHandler: router,
});

await crawler.run();
await Actor.exit();
