// Run: node --test tests/engine.test.js
// Throwaway DB, never touches data.db.
process.env.DB_PATH = '/tmp/bhivanta-smm-test.db';
const fs = require('node:fs'); try { fs.unlinkSync('/tmp/bhivanta-smm-test.db'); } catch {}
const test = require('node:test'); const assert = require('node:assert');
const { contentSafetyCheck, canPublish, dailyReportBody, db, TARGETS_30D } = require('../server.js');
test('certified organic claim is blocked', () => {
  assert.equal(contentSafetyCheck('Ye certified organic hai').ok, false);
});
test('guaranteed result claim is blocked', () => {
  assert.equal(contentSafetyCheck('Guaranteed phool aayenge').ok, false);
});
test('price in content is blocked', () => {
  assert.equal(contentSafetyCheck('Price ₹499 hai').ok, false);
});
test('approved benefits wording passes', () => {
  assert.equal(contentSafetyCheck('Better flowers, leaves, fruits, soil quality ko support karta hai').ok, true);
});
test('publish without a real URL is refused', () => {
  assert.equal(canPublish({ caption: 'Better flowers' }, '').ok, false);
  assert.equal(canPublish({ caption: 'Better flowers' }, 'not-a-url').ok, false);
});
test('publish with URL + clean content passes check', () => {
  assert.equal(canPublish({ caption: 'Better flowers, leaves' }, 'https://www.instagram.com/p/test123/').ok, true);
});
test('30-day calendar seeded, Day 1 has full package', () => {
  const n = db.prepare('SELECT COUNT(*) c FROM content_items').get().c;
  assert.equal(n, 30);
  const d1 = db.prepare('SELECT * FROM content_items WHERE day_no=1').get();
  assert.ok(d1.caption.length > 100 && d1.script.length > 100);
  assert.ok(!/₹/.test(d1.caption + d1.script));
});
test('targets are execution targets, not promises', () => {
  assert.equal(TARGETS_30D.posts, 30);
  assert.equal(TARGETS_30D.reels, 16);
  assert.equal(TARGETS_30D.carousels, 4);
});
test('daily report uses required structure and never invents analytics', () => {
  const body = dailyReportBody('2026-10-27');
  assert.match(body, /Employee Name: AI Social Media Marketing Manager/);
  assert.match(body, /Reporting To: Founder & CEO/);
  assert.match(body, /Target vs Achievement/);
  assert.match(body, /Problems or Blockers/);
  assert.match(body, /Next-Day Action Plan/);
  assert.match(body, /TBD/);
});
test('brand audit marks price and certification as TBD / not verified', () => {
  const price = db.prepare('SELECT * FROM brand_audit WHERE item=?').get('Price / MRP');
  assert.match(price.status, /TBD/);
  const cert = db.prepare('SELECT * FROM brand_audit WHERE item LIKE ?').get('Certification%');
  assert.match(cert.status, /NOT VERIFIED/);
});
