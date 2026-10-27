// Bhivanta Social Media Manager — AI employee app
// Same pattern as the WhatsApp Employee app: Node 24 stdlib + node:sqlite, zero paid deps.
// DEFAULT MODE IS DRAFT ONLY. Nothing here publishes to a real Instagram/Facebook/
// YouTube account by itself. A content item can move to Published ONLY after
// owner approval AND a real published URL is entered by the owner. Analytics
// are ONLY numbers the owner enters from a platform's own analytics — if no
// number is entered, the app shows TBD / 0-entered, never an invented figure.
// Hard guardrails (from the Founder's brief, 27 Oct 2026):
//  - NO fake followers/likes/views/comments/engagement, NO spam, NO copying
//    competitors, NO copyrighted assets without permission, NO fabricated
//    testimonials, NO invented analytics, NO unverified product claims.
//  - NEVER claim certified organic, guaranteed results, or suitable for
//    every plant, unless verified documentation supports it (none on record).
//  - NO price/discount/offer/scientific claim without approved info.
//    Price/MRP, pack sizes, ingredients, dosage are TBD on record — the app
//    stores them as TBD and content templates must NOT fill them in.
//  - NO spending, NO paid ads, NO commercial influencer contact, NO account
//    setting change, NO password sharing, without Founder authorisation.
//  - Scope is SOCIAL MEDIA ONLY. No WhatsApp marketing, no email marketing,
//    no order processing — those belong to other departments/employees.
//  - Language: simple Indian Hindi / Hinglish / English, practical value
//    first, selling second. Brand voice: professional, approachable,
//    trustworthy, gardening-focused. Brand colours: dark green #0B1F15,
//    gold, cream. Tagline: Better Care. Happier Plants.
//  - This app has NOT accessed, published to, or analysed any live social
//    account. Account access below is from the Founder's own records only.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || (fs.existsSync('/app/data') ? '/app/data/data.db' : './data.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
function hashPass(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function getSetting(k) { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k); return r ? r.value : null; }
function setSetting(k, v) { db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v); }
function audit(action, detail) { db.prepare('INSERT INTO audit_log(action,detail,created_at) VALUES(?,?,?)').run(action, detail || '', now()); }

db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, pass_hash TEXT, pass_salt TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, detail TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS content_items(id INTEGER PRIMARY KEY AUTOINCREMENT, day_no INTEGER, title TEXT, platform TEXT, type TEXT, format TEXT, hook TEXT, caption TEXT, script TEXT, hashtags TEXT, cta TEXT, language TEXT, scheduled_date TEXT, status TEXT, published_url TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, kind TEXT, due_date TEXT, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS analytics(id INTEGER PRIMARY KEY AUTOINCREMENT, entry_date TEXT, platform TEXT, reach INTEGER, impressions INTEGER, watch_time_min INTEGER, engagement_rate REAL, profile_visits INTEGER, followers INTEGER, website_clicks INTEGER, leads INTEGER, sales INTEGER, source_note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT, author TEXT, text TEXT, category TEXT, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS brand_audit(id INTEGER PRIMARY KEY AUTOINCREMENT, item TEXT, status TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS daily_reports(id INTEGER PRIMARY KEY AUTOINCREMENT, report_date TEXT UNIQUE, body TEXT, created_at TEXT);
`);

// ---------- Content safety check (used by tests + publish guard) ----------
const BANNED_CLAIMS = [/certified organic/i, /guaranteed/i, /100% result/i, /sabhi paudhon/i, /every plant/i, /₹\s*\d/, /price.*₹/i, /discount/i, /offer.*%/i];
function contentSafetyCheck(text) {
  const t = (text || '');
  const hits = BANNED_CLAIMS.filter(r => r.test(t)).map(r => String(r));
  return { ok: hits.length === 0, hits };
}
function canPublish(item, publishedUrl) {
  if (!publishedUrl || !/^https?:\/\//.test(publishedUrl)) return { ok: false, error: 'Published URL required — a real link from the platform, never an invented link' };
  const check = contentSafetyCheck((item.caption || '') + ' ' + (item.script || '') + ' ' + (item.title || ''));
  if (!check.ok) return { ok: false, error: 'Content contains an unverified claim/price — remove it before publishing: ' + check.hits.join(', ') };
  return { ok: true };
}

// ---------- Seed ----------
if (!getSetting('seeded')) {
  const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users(username,pass_hash,pass_salt,role) VALUES(?,?,?,?)').run('owner', hashPass(process.env.ADMIN_PASSWORD || 'admin123', salt), salt, 'owner');
  setSetting('seeded', '1');
  setSetting('approval_mode', '1');
  setSetting('publishing_mode', 'draft_only');
  setSetting('brand_tagline', 'Better Care. Happier Plants.');
  setSetting('brand_colours', 'Dark green #0B1F15 + gold + cream');
  audit('seed', 'Social Media Manager seeded: draft-only, approval mode ON, no live account access claimed');
  // Brand audit — ONLY facts from Founder records (26 Oct 2026 audit + earlier records).
  // Anything not verified is marked TBD / NOT VERIFIED, never filled in.
  const auditRows = [
    ['Product', 'VERIFIED', 'Organic Plant Growth Promoter (granules) for home gardeners. Sold via nurseries as retailers. Website bhivantaorganics.com.'],
    ['Approved benefits wording', 'VERIFIED', 'Better flowers, leaves, fruits, soil quality (wording from live site). No other benefit claim approved.'],
    ['Target audience', 'VERIFIED', 'Home gardeners, plant lovers, gardening enthusiasts, nurseries, gardening shops, retailers across India.'],
    ['Price / MRP', 'TBD — DO NOT PUBLISH', 'Site says Price on WhatsApp. Pack MRP blank on record. Never publish a price until Founder approves it.'],
    ['Pack sizes', 'TBD — DO NOT PUBLISH', '2 sizes visible on pack photos, exact weights unknown.'],
    ['Ingredients', 'TBD — DO NOT PUBLISH', 'Not transcribed from pack. Do not list ingredients.'],
    ['Dosage / usage', 'TBD — DO NOT PUBLISH', 'Instructions exist on pack back but text not transcribed. Do not give dosage.'],
    ['Certification (organic etc.)', 'NOT VERIFIED — DO NOT CLAIM', 'No verified certification document on record. Never claim certified organic.'],
    ['Guaranteed results', 'NOT VERIFIED — DO NOT CLAIM', 'No guaranteed-result evidence. Use approved benefits wording only, never a guarantee.'],
    ['Instagram @bhivantaorganics', 'CONNECTED (per Founder records, 26 Oct audit)', 'Personal account, professional switch still pending. Audit time: 2 followers, 7 posts, latest plant post 0 likes / 0 comments. Insights failed HTTP 500 at audit — reach/impressions UNKNOWN, not invented. Posting via API has had connector-policy blocks; a block lifts only if Founder directly messages to publish. Approval rule: approval = SCHEDULE for stated time, never publish immediately unless Founder says abhi post kar do; next day batch approved evening before; auto-approve 3 hours past scheduled time for posting only.'],
    ['Facebook', 'NOT VERIFIED', 'Facebook presence NOT verified at 26 Oct audit. No Facebook page confirmed in this app. Do not claim a Facebook audience until verified.'],
    ['YouTube @BHIVANTAORGANICS', 'EXISTS (per Founder records)', 'Channel joined 23 Aug 2025; description updated 26 Oct 2026 to current product wording (name/handle/logo untouched). Subscriber/view numbers NOT on record — TBD, do not invent. Shorts are a target platform, manual upload may be needed.'],
    ['LinkedIn', 'NOT VERIFIED', 'No Company Page and no personal profile for bhivantaorganics@gmail.com / Gagan Kumar found. Company Page needs a signed-in personal profile the Founder creates/signs in himself. Do not claim LinkedIn presence.'],
    ['Pinterest', 'PENDING', 'Login errored 26 Oct, no account confirmed/created, no money spent, pending on Google sign-in. Do not claim Pinterest presence.'],
    ['Threads', 'PENDING', 'Pending per social manager records. Do not claim Threads presence.'],
    ['Website traffic baseline', 'UNKNOWN', 'Search Console: sc-domain:bhivantaorganics.com verified, 1 indexed page, 2 not indexed, sitemap 404 not submitted. Sessions baseline UNKNOWN — do not invent.'],
    ['Email subscribers / retail partners', 'VERIFIED ZERO (26 Oct)', 'Email list: 0 verified subscribers, no consent list. Active retail partners confirmed: 0. B2B conversations verified: 0. These are baselines, not targets.'],
    ['Stock / shipping / returns', 'TBD — DO NOT PROMISE', 'Rolling out through partner nurseries; online delivery NOT live as of 26 Oct audit. Do not promise delivery, stock, or returns until Founder confirms.'],
  ];
  for (const [item, status, detail] of auditRows) db.prepare('INSERT INTO brand_audit(item,status,detail) VALUES(?,?,?)').run(item, status, detail);

  // 30-day content calendar. Day 1 is the full first-day package (see below).
  // All other days are DRAFT titles/hooks only — captions/scripts are added
  // day by day, reviewed for claims, and held for approval. No post is
  // marked Published without a real platform URL. Platforms rotate
  // Instagram / Facebook / YouTube Shorts; Facebook items stay Draft until
  // Facebook presence is verified by the Founder.
  const topics = [
    ['Paudhe ko pehchaniye: patte kya bata rahe hain?', 'post', 'educational', 'Patte peele kyun padte hain? 3 aam wajah aur 3 simple check'],
    ['Balcony garden ki shuruaat: pehle 5 kadam', 'carousel', 'educational', 'Chhoti jagah, bada garden — shuruaat ka simple plan'],
    ['Paani dene ki 3 galtiyan jo aksar hoti hain', 'reel', 'educational', 'Zyada paani = kam growth? Ye 3 galtiyan mat karo'],
    ['Mitti ki jaanch ghar par: haath se simple test', 'post', 'educational', 'Mitti haath me lo, ye ek test bata dega bahut kuch'],
    ['Phool wale paudhon ki dekhbhaal: roshni, paani, sabr', 'reel', 'educational', 'Phool kam aa rahe hain? Pehle ye 3 cheezein check karo'],
    ['Kitchen garden: dhaniya, pudina, tulsi ki dekhbhaal', 'carousel', 'educational', 'Rasoi se garden tak — 3 aasan paudhe'],
    ['Indoor plants: kam roshni me kaun se paudhe tikte hain?', 'post', 'educational', 'Kam roshni wala kamra bhi hara ho sakta hai'],
    ['Brand story: Bhivanta kyun? Gaon se ghar tak ka safar', 'post', 'brand', 'Better Care. Happier Plants. — ye kahani kahan se shuru hui'],
    ['Mitti ko saans lene do: gudai ka sahi tareeka', 'reel', 'educational', 'Mitti sakht ho gayi hai? Gudai ka sahi tareeka seekho'],
    ['Nursery se paudha kharidte waqt 5 checks', 'carousel', 'educational', 'Nursery me ye 5 cheezein dekhe bina paudha mat lo'],
    ['Garmi me paudhon ki dekhbhaal', 'post', 'educational', 'Garmi me paudhe murjha rahe hain? Ye simple bachav'],
    ['Compost ghar par: kitchen waste se mitti ka khana', 'reel', 'educational', 'Kitchen waste phenko mat — compost banao'],
    ['Bachchon ke saath gardening: pehla paudha', 'post', 'educational', 'Bachche ko pehla paudha lagana sikhao — ye tareeka'],
    ['Paudhon ki growth promoter kya hota hai? (sirf samajh, koi dawa nahi)', 'carousel', 'educational', 'Growth promoter kya karta hai aur kya nahi — saaf samajh'],
    ['Terrace garden: dhoop, hawa aur paani ka santulan', 'reel', 'educational', 'Terrace par garden? Dhoop aur hawa ka ye santulan zaroori hai'],
    ['Paudhe ko repot kab aur kaise karein?', 'post', 'educational', 'Roots bahar aa rahe hain? Repot ka sahi waqt ye hai'],
    ['Festival garden: ghar ko phoolo se sajao', 'post', 'festival', 'Tyohar par ghar ka garden hi sabse sundar sajawat hai'],
    ['Nursery partner ki kahani: local nursery kyun zaroori hai', 'reel', 'brand', 'Aapki paas wali nursery hi aapke garden ki dost hai'],
    ['Paani ka schedule: har paudhe ko ek jaisa paani nahi', 'carousel', 'educational', 'Har paudhe ka paani alag — ye chart yaad rakho'],
    ['Mitti, paani, roshni: garden ke 3 dost', 'post', 'educational', 'Garden ke 3 dost — in teeno ka dhyan rakho, paudha khush rahega'],
    ['Gardening myths: 3 galat baatein jo sab maante hain', 'reel', 'educational', 'Ye 3 gardening myths aaj hi chhodo'],
    ['Customer sawal: mere paudhe ke patte kyun jhad rahe hain?', 'post', 'community', 'Aapke sawal, hamare jawab — patte jhadne ki aam wajah'],
    ['Balcony me sabzi: palak, methi ki shuruaat', 'carousel', 'educational', 'Balcony me apni sabzi ugao — shuruaat yahan se'],
    ['Paudhon ki photo kaise lein: simple mobile tips', 'reel', 'educational', 'Apne garden ki sundar photo mobile se hi lo'],
    ['Brand story: ek paudhe se shuru hui soch', 'post', 'brand', 'Better Care. Happier Plants. — is line ke peeche ki soch'],
    ['Sardiyon ki taiyari: paudhon ko thand se bachao', 'post', 'educational', 'Thand aane se pehle paudhon ki ye taiyari kar lo'],
    ['UGC: apne garden ki photo bhejo (permission ke saath)', 'reel', 'community', 'Aapka garden, aapki kahani — permission ke saath share karenge'],
    ['Nursery visit: paudha chunne ka sahi tareeka', 'carousel', 'educational', 'Nursery visit par ye galti mat karo'],
    ['30 din ka garden safar: kya seekha, kya aage?', 'post', 'review', '30 din, 30 seekh — aage ka plan aapke sawalon se banega'],
    ['Garden diary: apne paudhe ki weekly photo diary', 'post', 'community', 'Har hafte ek photo — growth dikhega, seekh bhi milegi'],
  ];
  const platforms = ['Instagram', 'Facebook', 'YouTube Shorts'];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  topics.forEach(([title, type, cat, hook], i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const platform = type === 'reel' ? (i % 2 === 0 ? 'Instagram' : 'YouTube Shorts') : platforms[i % 3];
    const format = type === 'reel' ? 'short-video' : type === 'carousel' ? 'carousel' : 'single-post';
    db.prepare(`INSERT INTO content_items(day_no,title,platform,type,format,hook,caption,script,hashtags,cta,language,scheduled_date,status,published_url,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(i + 1, title, platform, type, format, hook, '', '', '#BhivantaOrganics #PlantCare #HomeGarden #GardeningIndia', 'Follow karein, comment me apna sawal likhein, website dekhein: bhivantaorganics.com', 'Hinglish', ds, 'Pending', null, now(), now());
  });
  // Day 1 full package — the only day seeded with full caption + script.
  // Approved wording only. No price, no certification, no guarantee, no dosage.
  const day1Caption = `Paudhe ko pehchaniye: patte kya bata rahe hain? 🌿\n\nPatte peele padna, murjhana ya jhadna — ye paudhe ki bhasha hai. Pehle roshni, paani aur mitti ko check karein, phir koi badlav karein.\n\nBhivanta Organics ka Organic Plant Growth Promoter home gardeners ke liye hai — iska lakshya better flowers, leaves, fruits aur soil quality ko support karna hai (site ki approved wording). Ye koi guarantee nahi hai, aur har paudhe par ek jaisa asar ka dawa nahi kiya ja raha.\n\nAapke paudhe ke patte kya keh rahe hain? Comment me batayein. 🌱`;
  const day1Script = `REEL SCRIPT (30-40 sec, Hinglish, voiceover, no music claim):\nHook (0-3s): "Patte peele kyun padte hain? 3 aam wajah aur 3 simple check."\nScene 1: Paudhe ke patte close-up. Voice: "Pehla check — paani. Mitti upar se sookhi hai ya geeli?"\nScene 2: Roshni check. Voice: "Doosra check — roshni. Paudha dhoop me hai ya chhaya me?"\nScene 3: Mitti check. Voice: "Teesra check — mitti. Sakht hai ya narm?"\nEnd card: "Better Care. Happier Plants. 🌱 Bhivanta Organics — bhivantaorganics.com"\nCTA: "Comment me likho — tumhare paudhe ke patte kya keh rahe hain?"\nNOTE: Price, dosage, certification ka zikr nahi. Product ko sirf approved wording me dikhana hai.`;
  db.prepare(`UPDATE content_items SET caption=?, script=?, status=? WHERE day_no=1`).run(day1Caption, day1Script, 'In Progress');
  // Day 1 tasks
  const day1Tasks = [
    ['Day 1 post taiyaar karo: patte wali educational post ka caption + visual brief review karo', 'content', today()],
    ['Day 1 reel script review karo: hook + 3 checks + CTA, koi unverified claim to nahi', 'review', today()],
    ['Day 1 content Founder ko approval ke liye bhejo — bina approval ke publish mat karo', 'approval', today()],
    ['Comments ka jawab / category karo (permission ke hisaab se)', 'community', today()],
    ['End-of-day report banao: Tasks, Published, Performance (jo data hai wahi), Blockers, Approvals, Kal ka plan', 'report', today()],
  ];
  for (const [t, kind, due] of day1Tasks) db.prepare('INSERT INTO tasks(title,kind,due_date,status,created_at) VALUES(?,?,?,?,?)').run(t, kind, due, 'Pending', now());
  // First weekly task set (targets, not promises)
  db.prepare('INSERT INTO tasks(title,kind,due_date,status,created_at) VALUES(?,?,?,?,?)').run('Week 1 performance report banao: targets vs actual (jo analytics owner ne dale hain, wahi)', 'report', today(), 'Pending', now());
}

// ---------- Startup password sync (same pattern as WhatsApp app) ----------
// If ADMIN_PASSWORD env changes, the stored owner hash updates on startup,
// so "change env + restart" actually changes the login password.
if (process.env.ADMIN_PASSWORD) {
  const owner = db.prepare('SELECT * FROM users WHERE username=?').get('owner');
  if (owner && hashPass(process.env.ADMIN_PASSWORD, owner.pass_salt) !== owner.pass_hash) {
    const salt = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE users SET pass_hash=?, pass_salt=? WHERE id=?').run(hashPass(process.env.ADMIN_PASSWORD, salt), salt, owner.id);
    audit('admin_password_synced_from_env', 'owner password updated from ADMIN_PASSWORD env on startup');
  }
}

// ---------- Helpers ----------
function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); }); }
function authUser(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return null;
  const s = db.prepare('SELECT user_id FROM sessions WHERE token=?').get(t);
  return s ? db.prepare('SELECT id,username,role FROM users WHERE id=?').get(s.user_id) : null;
}
const TARGETS_30D = { posts: 30, reels: 16, carousels: 4, daily_reports: 30, weekly_reports: 4, formats_tested: 3, hooks_tested: 3 };
function dashboardData() {
  const q = (sql, ...a) => db.prepare(sql).get(...a);
  const published = q('SELECT COUNT(*) c FROM content_items WHERE status=?', 'Published').c;
  const reelsPub = q(`SELECT COUNT(*) c FROM content_items WHERE status=? AND type=?`, 'Published', 'reel').c;
  const carPub = q(`SELECT COUNT(*) c FROM content_items WHERE status=? AND type=?`, 'Published', 'carousel').c;
  const awaiting = q('SELECT COUNT(*) c FROM content_items WHERE status=?', 'Awaiting Approval').c;
  const pending = q('SELECT COUNT(*) c FROM content_items WHERE status=?', 'Pending').c;
  const inProg = q('SELECT COUNT(*) c FROM content_items WHERE status=?', 'In Progress').c;
  const totalContent = q('SELECT COUNT(*) c FROM content_items').c;
  const a = q('SELECT COALESCE(SUM(reach),0) reach, COALESCE(SUM(impressions),0) impressions, COALESCE(SUM(watch_time_min),0) watch, COALESCE(SUM(profile_visits),0) visits, COALESCE(SUM(website_clicks),0) clicks, COALESCE(SUM(leads),0) leads, COALESCE(SUM(sales),0) sales, COUNT(*) n FROM analytics');
  const tasksOpen = q('SELECT COUNT(*) c FROM tasks WHERE status!=?', 'Completed').c;
  const reports = q('SELECT COUNT(*) c FROM daily_reports').c;
  return {
    targets30d: TARGETS_30D,
    content: { total: totalContent, published, reelsPublished: reelsPub, carouselsPublished: carPub, awaitingApproval: awaiting, pending, inProgress: inProg },
    analyticsEntered: a.n > 0 ? a : null,
    analyticsNote: a.n > 0 ? 'Numbers owner ne platform analytics se dale hain — jo date/platform ka data nahi dala gaya, wo TBD hai, invented nahi.' : 'Koi analytics abhi enter nahi hua hai — baseline TBD hai. Reach/impressions/followers ka koi number invent nahi kiya gaya hai.',
    tasksOpen, dailyReports: reports,
    approvalMode: getSetting('approval_mode') === '1',
    publishingMode: getSetting('publishing_mode'),
  };
}
function dailyReportBody(date) {
  const items = db.prepare('SELECT * FROM content_items WHERE scheduled_date=?').all(date);
  const pub = items.filter(i => i.status === 'Published');
  const tasks = db.prepare('SELECT * FROM tasks WHERE due_date=?').all(date);
  const done = tasks.filter(t => t.status === 'Completed');
  const an = db.prepare('SELECT * FROM analytics WHERE entry_date=?').all(date);
  const anText = an.length ? an.map(x => `${x.platform}: reach ${x.reach ?? 'TBD'}, impressions ${x.impressions ?? 'TBD'}, profile visits ${x.profile_visits ?? 'TBD'}, website clicks ${x.website_clicks ?? 'TBD'}, leads ${x.leads ?? 'TBD'}, sales ${x.sales ?? 'TBD'} (${x.source_note || 'platform analytics'})`).join('\n') : 'Koi analytics is date ke liye enter nahi hua hai — performance TBD hai, koi number invent nahi kiya gaya.';
  return `Employee Name: AI Social Media Marketing Manager
Department: Social Media Marketing
Reporting To: Founder & CEO, Bhivanta Organics Pvt. Ltd.
Daily Status: ${date}
Tasks Assigned: ${tasks.map(t => t.title).join(' | ') || 'Koi task is date ke liye nahi'}
Tasks Completed: ${done.map(t => t.title).join(' | ') || 'Abhi koi task Completed mark nahi hua'}
Content Published: ${pub.map(i => `${i.title} (${i.platform}, ${i.published_url || 'URL TBD'})`).join(' | ') || 'Aaj koi content Published mark nahi hua — jo content Published hai, uska real platform link hi yahan aayega'}
Actual Performance:
${anText}
Target vs Achievement (30-day execution targets, NOT sales/follower promises):
- Posts target 30, ab tak Published: ${db.prepare(`SELECT COUNT(*) c FROM content_items WHERE status=?`).get('Published').c}
- Reels target 12-16, ab tak Published reels: ${db.prepare(`SELECT COUNT(*) c FROM content_items WHERE status=? AND type=?`).get('Published', 'reel').c}
- Carousels target 4+, ab tak Published carousels: ${db.prepare(`SELECT COUNT(*) c FROM content_items WHERE status=? AND type=?`).get('Published', 'carousel').c}
Problems or Blockers: Jo account/analytics/publishing access available nahi hai, wo Brand Audit me likha hai. Facebook presence NOT VERIFIED hai, isliye Facebook items Draft hi rahenge jab tak Founder verify na karein. Price/MRP, ingredients, dosage TBD hain — in par koi post publish nahi hogi.
Approvals Required: Awaiting Approval wale content items ki list dashboard ke Approvals tab me hai. Bina Founder approval ke koi post Published mark nahi hogi.
Next-Day Action Plan: Kal ke scheduled content items ko review karo, claims check karo, approval ke liye bhejo, comments categorise karo, aur analytics (agar platform se mile) enter karo.`;
}

// ---------- HTTP server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (p === '/api/health') return sendJson(res, 200, { ok: true, mode: getSetting('publishing_mode'), approvalMode: getSetting('approval_mode'), time: now() });
    if (p === '/api/auth/login' && req.method === 'POST') {
      const b = await readBody(req);
      const u = db.prepare('SELECT * FROM users WHERE username=?').get(b.username);
      if (!u || hashPass(b.password || '', u.pass_salt) !== u.pass_hash) return sendJson(res, 401, { error: 'Invalid login' });
      const token = crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)').run(token, u.id, now());
      audit('login', u.username); return sendJson(res, 200, { token, username: u.username, role: u.role });
    }
    if (p.startsWith('/api/')) {
      const user = authUser(req);
      if (!user) return sendJson(res, 401, { error: 'Login required' });
      const body = req.method === 'POST' || req.method === 'PUT' ? await readBody(req) : {};
      if (p === '/api/dashboard') return sendJson(res, 200, dashboardData());
      if (p === '/api/content' && req.method === 'GET') {
        const status = url.searchParams.get('status');
        const rows = status ? db.prepare('SELECT * FROM content_items WHERE status=? ORDER BY scheduled_date ASC, id ASC').all(status) : db.prepare('SELECT * FROM content_items ORDER BY scheduled_date ASC, id ASC').all();
        return sendJson(res, 200, rows);
      }
      if (p === '/api/content' && req.method === 'POST') {
        const check = contentSafetyCheck((body.caption || '') + ' ' + (body.script || '') + ' ' + (body.title || ''));
        if (!check.ok) return sendJson(res, 400, { error: 'Unverified claim/price found — remove before saving: ' + check.hits.join(', ') });
        const r = db.prepare(`INSERT INTO content_items(day_no,title,platform,type,format,hook,caption,script,hashtags,cta,language,scheduled_date,status,published_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(body.day_no || null, body.title || 'Untitled', body.platform || 'Instagram', body.type || 'post', body.format || 'single-post', body.hook || '', body.caption || '', body.script || '', body.hashtags || '', body.cta || '', body.language || 'Hinglish', body.scheduled_date || today(), 'Pending', null, now(), now());
        audit('content_created', `content ${r.lastInsertRowid}`); return sendJson(res, 200, { id: r.lastInsertRowid });
      }
      const contentId = p.match(/^\/api\/content\/(\d+)$/);
      if (contentId && req.method === 'PUT') {
        const item = db.prepare('SELECT * FROM content_items WHERE id=?').get(contentId[1]);
        if (!item) return sendJson(res, 404, { error: 'Not found' });
        const next = { ...item, ...body };
        if (body.status === 'Published') {
          const chk = canPublish(next, body.published_url || item.published_url);
          if (!chk.ok) return sendJson(res, 400, { error: chk.error });
          if (getSetting('approval_mode') === '1' && item.status !== 'Awaiting Approval' && !body.approvedByOwner) {
            // Owner approval is enforced by the UI flow: an item must pass
            // through Awaiting Approval before Published, unless the owner
            // explicitly marks approvedByOwner in the same update.
            return sendJson(res, 400, { error: 'Owner approval required first — move to Awaiting Approval, get Founder approval, then publish with a real URL' });
          }
        }
        const check = contentSafetyCheck((next.caption || '') + ' ' + (next.script || '') + ' ' + (next.title || ''));
        if (!check.ok) return sendJson(res, 400, { error: 'Unverified claim/price found: ' + check.hits.join(', ') });
        db.prepare(`UPDATE content_items SET title=?,platform=?,type=?,format=?,hook=?,caption=?,script=?,hashtags=?,cta=?,language=?,scheduled_date=?,status=?,published_url=?,updated_at=? WHERE id=?`)
          .run(next.title, next.platform, next.type, next.format, next.hook, next.caption, next.script, next.hashtags, next.cta, next.language, next.scheduled_date, next.status || item.status, next.published_url || null, now(), item.id);
        audit('content_updated', `content ${item.id} -> ${next.status || item.status}`); return sendJson(res, 200, { ok: true });
      }
      if (p === '/api/tasks' && req.method === 'GET') return sendJson(res, 200, db.prepare('SELECT * FROM tasks ORDER BY due_date ASC, id ASC').all());
      if (p === '/api/tasks' && req.method === 'POST') { const r = db.prepare('INSERT INTO tasks(title,kind,due_date,status,created_at) VALUES(?,?,?,?,?)').run(body.title, body.kind || 'content', body.due_date || today(), 'Pending', now()); return sendJson(res, 200, { id: r.lastInsertRowid }); }
      const taskId = p.match(/^\/api\/tasks\/(\d+)\/status$/);
      if (taskId && req.method === 'POST') { db.prepare('UPDATE tasks SET status=? WHERE id=?').run(body.status, taskId[1]); audit('task_status', `task ${taskId[1]} -> ${body.status}`); return sendJson(res, 200, { ok: true }); }
      if (p === '/api/analytics' && req.method === 'GET') return sendJson(res, 200, db.prepare('SELECT * FROM analytics ORDER BY entry_date DESC, id DESC').all());
      if (p === '/api/analytics' && req.method === 'POST') {
        const r = db.prepare(`INSERT INTO analytics(entry_date,platform,reach,impressions,watch_time_min,engagement_rate,profile_visits,followers,website_clicks,leads,sales,source_note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(body.entry_date || today(), body.platform || 'Instagram', body.reach ?? null, body.impressions ?? null, body.watch_time_min ?? null, body.engagement_rate ?? null, body.profile_visits ?? null, body.followers ?? null, body.website_clicks ?? null, body.leads ?? null, body.sales ?? null, body.source_note || 'Owner entered from platform analytics', now());
        audit('analytics_entered', `analytics ${r.lastInsertRowid} ${body.platform}`); return sendJson(res, 200, { id: r.lastInsertRowid });
      }
      if (p === '/api/comments' && req.method === 'GET') return sendJson(res, 200, db.prepare('SELECT * FROM comments ORDER BY id DESC').all());
      if (p === '/api/comments' && req.method === 'POST') { const r = db.prepare('INSERT INTO comments(platform,author,text,category,status,created_at) VALUES(?,?,?,?,?,?)').run(body.platform || 'Instagram', body.author || '', body.text || '', body.category || 'general', body.status || 'categorised', now()); return sendJson(res, 200, { id: r.lastInsertRowid }); }
      if (p === '/api/brand-audit' && req.method === 'GET') return sendJson(res, 200, db.prepare('SELECT * FROM brand_audit ORDER BY id ASC').all());
      if (p === '/api/reports/daily' && req.method === 'GET') {
        const date = url.searchParams.get('date') || today();
        let rep = db.prepare('SELECT * FROM daily_reports WHERE report_date=?').get(date);
        if (!rep) { const bodyText = dailyReportBody(date); const r = db.prepare('INSERT INTO daily_reports(report_date,body,created_at) VALUES(?,?,?)').run(date, bodyText, now()); rep = { id: r.lastInsertRowid, report_date: date, body: bodyText }; }
        return sendJson(res, 200, rep);
      }
      if (p === '/api/reports/daily' && req.method === 'POST') {
        const date = body.report_date || today();
        const bodyText = dailyReportBody(date);
        db.prepare('INSERT INTO daily_reports(report_date,body,created_at) VALUES(?,?,?) ON CONFLICT(report_date) DO UPDATE SET body=excluded.body').run(date, bodyText, now());
        return sendJson(res, 200, { ok: true, body: bodyText });
      }
      return sendJson(res, 404, { error: 'Not found' });
    }
    // Static files
    let file = p === '/' ? '/index.html' : p;
    const safe = file.replace(/\.\./g, '');
    const full = __dirname + '/public' + safe;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const ext = full.split('.').pop();
      const types = { html: 'text/html', js: 'text/javascript', css: 'text/css' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' }); return res.end(fs.readFileSync(full));
    }
    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) { console.error(e); return sendJson(res, 500, { error: e.message }); }
});
if (require.main === module) server.listen(PORT, () => console.log(`Bhivanta Social Media Manager running on http://localhost:${PORT} — login: owner`));
module.exports = { server, db, contentSafetyCheck, canPublish, dailyReportBody, TARGETS_30D };
