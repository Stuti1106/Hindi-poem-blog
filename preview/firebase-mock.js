// Local preview only: stands in for the Firebase SDK so the site runs without a Firebase project.
// Everything lives in memory and disappears on refresh. Not deployed (outside public/).

const store = new Map();
const docListeners = new Set();
const queryListeners = new Set();
const authListeners = new Set();
let currentUser = null;

// Sample content from the Nidhyakshar design reference (illustrative, not Nidhi's published work).
store.set("poems/sample-tumhare-baad", {
  kind: "poem",
  title: "तुम्हारे बाद",
  titleEn: "After You",
  category: "longing",
  featured: true,
  writtenOn: "2026-10-12",
  body: "तुम्हारे जाने के बाद भी,\nकुछ रास्ते तुम्हारे रहे।\n\nकुछ ख़्वाब आँखों में ठहरे,\nकुछ लफ़्ज़ अधूरे रहे।\n\nमैंने वक़्त से पूछा,\nक्या यादें भी कभी सोती हैं?\nवह मुस्कुराकर बोला,\nकुछ बातें उम्र भर होती हैं।",
  bodyEn: "Even after you left,\nsome roads still belonged to you.\n\nSome dreams stayed in my eyes,\nsome words remained unfinished.\n\nI asked time,\ndo memories ever fall asleep?\nIt smiled and answered,\nsome things live with us for a lifetime.",
  photoPath: "", photoUrl: "",
});
store.set("site/about", {
  intro: "",
  bio: "", portraitUrl: "", portraitPath: "",
});

const later = fn => setTimeout(fn, 0);
const snapDoc = path => {
  const data = store.get(path);
  return { id: path.split("/").pop(), exists: () => data !== undefined, data: () => (data ? { ...data } : undefined) };
};
const snapQuery = q => {
  const docs = [...store.keys()].filter(k => k.startsWith(q.path + "/") && k.split("/").length === 2).map(snapDoc);
  if (q.order) {
    const { field, dir } = q.order;
    docs.sort((a, b) => String(a.data()[field] ?? "").localeCompare(String(b.data()[field] ?? "")) * (dir === "desc" ? -1 : 1));
  }
  return { docs };
};
const notify = () => {
  for (const l of docListeners) l.next(snapDoc(l.path));
  for (const l of queryListeners) l.next(snapQuery(l.q));
};

/* app */
export const initializeApp = () => ({});

/* firestore */
export const getFirestore = () => ({});
export const collection = (_db, path) => ({ kind: "col", path });
export function doc(a, ...segs) {
  if (a?.kind === "col") {
    const id = segs[0] || Math.random().toString(36).slice(2, 12);
    return { kind: "doc", path: `${a.path}/${id}`, id };
  }
  const path = segs.join("/");
  return { kind: "doc", path, id: segs[segs.length - 1] };
}
export const orderBy = (field, dir = "asc") => ({ field, dir });
export const query = (col, order) => ({ kind: "query", path: col.path, order });
export function onSnapshot(ref, next) {
  const entry = ref.kind === "doc" ? { path: ref.path, next } : { q: ref, next };
  (ref.kind === "doc" ? docListeners : queryListeners).add(entry);
  later(() => next(ref.kind === "doc" ? snapDoc(ref.path) : snapQuery(ref)));
  return () => (ref.kind === "doc" ? docListeners : queryListeners).delete(entry);
}
export async function getDoc(ref) {
  if (ref.path.startsWith("editors/")) return { exists: () => !!currentUser, data: () => ({ role: "editor" }) };
  return snapDoc(ref.path);
}
export async function setDoc(ref, data) { store.set(ref.path, structuredClone(data)); later(notify); }
export async function updateDoc(ref, data) { store.set(ref.path, { ...(store.get(ref.path) || {}), ...data }); later(notify); }
export async function deleteDoc(ref) { store.delete(ref.path); later(notify); }

/* auth: "Editor sign-in" signs in a pretend editor so the writing tools can be tried */
export const getAuth = () => ({});
export class GoogleAuthProvider {}
export function onAuthStateChanged(_auth, cb) { authListeners.add(cb); later(() => cb(currentUser)); return () => authListeners.delete(cb); }
export async function signInWithPopup() {
  currentUser = { email: "preview-editor@example.com" };
  for (const cb of authListeners) cb(currentUser);
  return { user: currentUser };
}
export async function signOut() { currentUser = null; for (const cb of authListeners) cb(null); }

/* storage */
const blobs = new Map();
export const getStorage = () => ({});
export const ref = (_s, path) => ({ path });
export async function uploadBytes(r, blob) { blobs.set(r.path, URL.createObjectURL(blob)); }
export async function getDownloadURL(r) { return blobs.get(r.path); }
export async function deleteObject(r) { blobs.delete(r.path); }

/* functions: Claude features need the deployed Cloud Functions */
export const getFunctions = () => ({});
export const httpsCallable = () => async () => { throw { code: "functions/unavailable" }; };
