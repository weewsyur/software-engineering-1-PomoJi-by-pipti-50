/**
 * OPTIONAL one-time cleanup of old wellness-score data.
 * Dry run by default. Needs: npm i -D firebase-admin, and a service account key.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./key.json node scripts/cleanup-wellness.js --group wellness
 *       -> lists docs in every collection (group) named "wellness"
 *   ... --group wellness --apply
 *       -> deletes those docs
 *   ... --group stats --field wellnessScore --apply
 *       -> removes just that field from docs in collection group "stats"
 *
 * TODO: find where the wellness score is actually stored in your project
 * (collection name / field name) and pass them in. Back up first (gcloud firestore export).
 */
const admin = require('firebase-admin');

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const group = get('--group');
const field = get('--field');
const apply = args.includes('--apply');

if (!group) {
  console.error('Usage: node cleanup-wellness.js --group <collectionGroup> [--field <fieldName>] [--apply]');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

(async () => {
  const snap = await db.collectionGroup(group).get();
  console.log(`${snap.size} document(s) in collection group "${group}"${apply ? '' : '  (DRY RUN)'}`);
  let batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    if (field && !(field in doc.data())) continue;
    console.log(`${apply ? (field ? 'remove field from' : 'delete') : 'would touch'}: ${doc.ref.path}`);
    if (apply) {
      field ? batch.update(doc.ref, { [field]: admin.firestore.FieldValue.delete() }) : batch.delete(doc.ref);
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
  }
  if (apply && n % 400 !== 0) await batch.commit();
  console.log(apply ? `Done. ${n} change(s).` : 'Dry run only. Re-run with --apply to make changes.');
})();
