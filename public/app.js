import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, query, orderBy, onSnapshot, getDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const main = $("#main");
const POET = { hi: "निधि श्रीवास्तव", en: "Nidhi Shrivastava" };
// Nidhi's portrait. A portrait uploaded on the About page replaces it.
const AUTHOR_PHOTO = "/images/nidhi.jpg";
const AUTHOR_PHOTO_SMALL = "/images/nidhi-small.jpg";

// Nidhi's introduction, drawn from her résumé. Text saved from the About page's editor replaces it.
const DEFAULT_ABOUT = {
  hi: {
    intro: "मैं निधि श्रीवास्तव हूँ, भोपाल से। हिंदी मेरी अपनी भाषा है, और कविता वह जगह जहाँ मेरे एहसास शब्द बन जाते हैं।",
    bio: "हिंदी साहित्य से मेरा रिश्ता पढ़ाई के दिनों से है। बरकतुल्लाह विश्वविद्यालय, भोपाल से मैंने हिंदी साहित्य और राजनीति विज्ञान में स्नातक किया, और फिर समाजशास्त्र में एम.ए. और एम.फ़िल.।\n\nमेरी रचनाएँ हिंदी पुस्तक “इबादत” का हिस्सा बनीं, जिसके लिए मैंने मौलिक लेखन के साथ प्रूफ़रीडिंग और संपादन में भी योगदान दिया। अजीत म्यूज़िक अकादमी के संगीत और सांस्कृतिक कार्यक्रमों के लिए मैंने हिंदी स्क्रिप्ट लिखी हैं, और मातृभारती पर मेरी सोलह कविताएँ पाठकों तक पहुँचीं।\n\nशब्दों के साथ रंगों से भी मेरा नाता है: मैंने सर जे. जे. स्कूल ऑफ़ आर्ट, मुंबई से फ़ाइन आर्ट्स की पढ़ाई की है।\n\nनिध्याक्षर पर मैं अपनी कविताएँ उनके अंग्रेज़ी अनुवाद के साथ साझा करती हूँ, ताकि जो पाठक हिंदी नहीं पढ़ते, वे भी उनके एहसास तक पहुँच सकें।",
  },
  en: {
    intro: "I'm Nidhi Shrivastava, from Bhopal. Hindi is my own language, and poetry is where my feelings find their words.",
    bio: "My bond with Hindi literature goes back to my student days. At Barkatullah University, Bhopal, I studied Hindi Literature and Political Science, and went on to an M.A. and M.Phil. in Sociology.\n\nMy writing is part of the Hindi book Ibadat, where I also helped with proofreading and editing. I have written Hindi scripts for musical and cultural performances at Ajit Music Academy, and sixteen of my poems have reached readers on Matrubharti.\n\nAlongside words, I have always loved colour: I trained in Fine Arts at Sir J. J. School of Art, Mumbai.\n\nOn Nidhyakshar I share my poems with English translations, so that readers who don't read Hindi can still feel them.",
  },
};
const ABOUT_FACTS = {
  hi: [["शहर", "भोपाल"], ["पुस्तक", "इबादत (हिंदी)"], ["पढ़ाई", "हिंदी साहित्य में स्नातक · समाजशास्त्र में एम.ए., एम.फ़िल."], ["कला", "फ़ाइन आर्ट्स, सर जे. जे. स्कूल ऑफ़ आर्ट"]],
  en: [["Home", "Bhopal"], ["Book", "Ibadat (Hindi)"], ["Studies", "B.A. Hindi Literature · M.A. & M.Phil. Sociology"], ["Art", "Fine Arts, Sir J. J. School of Art"]],
};
const aboutIntro = () => about.intro || DEFAULT_ABOUT[lang].intro;
const aboutBio = () => about.bio || DEFAULT_ABOUT[lang].bio;
// Sakura is the site's motif; the rose belongs only to the मोहब्बत (Love) collection.
const blossom = (cls = "blossom") => `<svg class="${cls}" viewBox="-26 -26 52 52" aria-hidden="true"><use href="#sk-flower" fill="var(--blossom)"/></svg>`;
const sprig = (cls = "sprig") => `<svg class="${cls}" viewBox="0 0 170 130" aria-hidden="true"><use href="#sakura-sprig"/></svg>`;
const rose = (cls = "rose-mark") => `<svg class="${cls}" viewBox="0 0 200 260" aria-hidden="true"><use href="#rose"/></svg>`;
const catMark = key => key === "love" ? rose() : "";
// A few petals drifting across the home hero (hidden when reduced motion is preferred).
const petals = () => `<div class="petals" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>`;

const CATS = [
  { key: "love", hi: "मोहब्बत", en: "Love", dhi: "प्रेम, अपनापन और छोटे-छोटे पल", den: "Love, closeness and small moments" },
  { key: "longing", hi: "विरह", en: "Longing", dhi: "दूरी, इंतज़ार और अधूरी बातें", den: "Distance, waiting and words left unsaid" },
  { key: "memories", hi: "यादें", en: "Memories", dhi: "बीते दिनों की ख़ुशबू", den: "The fragrance of days gone by" },
  { key: "life", hi: "ज़िंदगी", en: "Life", dhi: "रोज़मर्रा की सीख और सवाल", den: "Everyday lessons and reflections" },
  { key: "self", hi: "ख़ुद से मुलाक़ात", en: "Self-discovery", dhi: "अपने आप से मिलने के पल", den: "Moments of meeting yourself" },
];
const catOf = k => CATS.find(c => c.key === k);
const catPair = k => { const c = catOf(k); return c ? `${c.hi} · ${c.en}` : ""; };

/* ---------- language ---------- */
const STR = {
  hi: {
    nav: { home: "मुखपृष्ठ", poems: "कविताएँ", journal: "डायरी", about: "मेरे बारे में", contact: "संपर्क" },
    newWriting: "+ नई रचना",
    heroBy: "निधि श्रीवास्तव की हिंदी कविताओं की डायरी। हर कविता के साथ उसका अंग्रेज़ी अनुवाद भी, ताकि हर पाठक उसे महसूस कर सके।",
    explore: "कविताएँ पढ़ें",
    featured: "चुनी हुई कविता",
    readPoem: "पूरी कविता पढ़ें",
    browse: "एहसास के रास्ते",
    browseSub: "Browse by feeling",
    poemsCount: n => n === 1 ? "1 कविता" : `${n} कविताएँ`,
    aboutPoet: "कवयित्री से मिलिए",
    readMoreAbout: "पूरा परिचय पढ़ें",
    loading: "पन्ने पलटे जा रहे हैं…",
    emptyBig: "पहली कविता का इंतज़ार है",
    emptyWriter: "ऊपर “+ नई रचना” दबाएँ। कविता टाइप करें या हस्तलिखित पन्ने की फ़ोटो अपलोड करें।",
    emptyReader: "जल्द ही यहाँ कविताएँ आएँगी।",
    allPoems: "सभी",
    saved: "सहेजी गई",
    savedNote: "सहेजी गई कविताएँ सिर्फ़ इसी डिवाइस के ब्राउज़र में रहती हैं, दूसरे फ़ोन या कंप्यूटर पर नहीं दिखेंगी।",
    savedEmpty: "आपने अभी कोई कविता नहीं सहेजी। किसी कविता पर “♡ सहेजें” दबाएँ।",
    search: "कविता, पंक्ति या शब्द खोजें…",
    noMatch: "इस खोज से कोई कविता नहीं मिली।",
    notFound: "यह रचना नहीं मिली।",
    untitled: "शीर्षकहीन",
    by: "निधि श्रीवास्तव",
    minRead: n => `${n} मिनट`,
    home: "मुखपृष्ठ",
    poemsCrumb: "कविताएँ",
    journalCrumb: "डायरी",
    viewHi: "मूल",
    viewEn: "अनुवाद",
    viewBoth: "दोनों",
    translationLabel: "English translation",
    copyLink: "लिंक कॉपी करें",
    copied: "लिंक कॉपी हो गया",
    copyFail: "कॉपी नहीं हुआ। नीचे का लिंक चुनकर कॉपी करें:",
    whatsapp: "WhatsApp पर भेजें",
    save: "♡ सहेजें",
    savedBtn: "♥ सहेजी गई",
    readingMode: "पढ़ने का मोड",
    exitReading: "पढ़ने का मोड बंद करें",
    related: "ऐसी ही और कविताएँ",
    seeOrig: "मूल हस्तलिखित पन्ना देखें",
    edit: "संपादित करें",
    del: "हटाएँ",
    delConfirm: "यह रचना और उसका पन्ना हमेशा के लिए हट जाएगा।",
    delYes: "हाँ, हटाएँ",
    delNo: "रहने दें",
    delFail: "हटाया नहीं जा सका। फिर कोशिश करें।",
    journalTitle: "डायरी",
    journalSub: "The Journal · reflections and essays",
    journalIntro: "कविताओं के पीछे की बातें, विचार और छोटे-छोटे लेख।",
    journalEmpty: "डायरी में अभी कोई पन्ना नहीं है।",
    poemsTitle: "कविताएँ",
    poemsSub: "All poems",
    aboutTitle: "मेरे बारे में",
    aboutSub: "About Nidhi",
    aboutEmptyWriter: "यहाँ निधि जी का परिचय जोड़ें: वे कब से लिख रही हैं, क्या उन्हें लिखने के लिए प्रेरित करता है।",
    aboutEmptyReader: "परिचय जल्द ही।",
    editAbout: "परिचय बदलें",
    introLabel: "छोटा परिचय",
    introHelp: "मुखपृष्ठ पर दिखेगा, दो-तीन पंक्तियाँ",
    bioLabel: "पूरा परिचय",
    portraitLabel: "तस्वीर (वैकल्पिक)",
    choosePortrait: "तस्वीर चुनें",
    removePortrait: "तस्वीर हटाएँ",
    contactTitle: "संपर्क",
    contactSub: "Messages and collaborations",
    contactDefault: "कविताओं के बारे में कुछ कहना हो, या साथ मिलकर कुछ करना हो, तो लिखिए।",
    emailLabel: "ईमेल",
    copyEmail: "ईमेल कॉपी करें",
    emailCopied: "ईमेल कॉपी हो गया",
    contactEmpty: "संपर्क की जानकारी जल्द ही।",
    editContact: "संपर्क बदलें",
    noteLabel: "पाठकों के लिए संदेश",
    instaLabel: "Instagram लिंक",
    fbLabel: "Facebook लिंक",
    ytLabel: "YouTube लिंक",
    urlHelp: "https:// से शुरू होने वाला पूरा लिंक",
    badUrl: "लिंक https:// से शुरू होना चाहिए।",
    privacyTitle: "गोपनीयता",
    privacySub: "Privacy",
    privacy: "यह वेबसाइट पाठकों से कोई निजी जानकारी नहीं माँगती और इसमें कोई विज्ञापन या ट्रैकिंग नहीं है।\n\nजो कविताएँ आप “♡ सहेजें” से सहेजते हैं, वे सिर्फ़ आपके अपने ब्राउज़र में रहती हैं। हम उन्हें नहीं देख सकते।\n\nअगर आप ईमेल या सोशल मीडिया से संपर्क करते हैं, तो आपका संदेश उसी सेवा के ज़रिए पहुँचता है और सिर्फ़ जवाब देने के लिए इस्तेमाल होता है।\n\nयह वेबसाइट Google Firebase पर चलती है, जो वेबसाइट चलाने के लिए सामान्य तकनीकी जानकारी (जैसे IP पता) अपने आप दर्ज कर सकता है।\n\nइस वेबसाइट की सभी कविताएँ और लेख निधि श्रीवास्तव की मौलिक रचनाएँ हैं। बिना अनुमति इन्हें कहीं और प्रकाशित न करें।",
    copyright: y => `© ${y} निधि श्रीवास्तव। सर्वाधिकार सुरक्षित।`,
    privacyLink: "गोपनीयता",
    signIn: "लेखक लॉगिन",
    signOut: "लॉग आउट",
    signedInAs: e => `${e} से लॉग इन`,
    notEditor: e => `${e} लेखक के रूप में जुड़ा नहीं है। वेबसाइट के मालिक से इसे जोड़ने को कहें।`,
    signInFail: "लॉग इन नहीं हो सका। फिर कोशिश करें।",
    loginTitle: "लेखक लॉगिन",
    loginSub: "Editor sign-in",
    loginIntro: "यह पन्ना निध्याक्षर की लेखिका के लिए है। अपने Google खाते से लॉग इन करें, फिर आप कविताएँ लिख, बदल और हटा सकेंगी।",
    loginGoogle: "Google से लॉग इन करें",
    loginReady: "आप लेखक के रूप में लॉग इन हैं। अब आप नई कविता लिख सकती हैं, और हर कविता के पन्ने पर “संपादित करें” और “हटाएँ” दिखेंगे।",
    loginWrite: "+ नई रचना लिखें",
    loginHome: "मुखपृष्ठ पर जाएँ",
    loginTip: "सुझाव: इस पन्ने को बुकमार्क कर लें।",
    signInOff: "लॉग इन अभी चालू नहीं है। वेबसाइट के मालिक को Firebase में Google sign-in चालू करना होगा।",
    signInDomain: "यह पता (domain) अभी लॉग इन के लिए जुड़ा नहीं है। वेबसाइट के मालिक को इसे Firebase में जोड़ना होगा।",
    signInPopup: "लॉग इन की खिड़की नहीं खुल सकी। ब्राउज़र में pop-ups की अनुमति दें और फिर कोशिश करें।",
    cancel: "रद्द करें",
    saveBtn: "सहेजें",
    saving: "सहेजा जा रहा है…",
    saveFail: "सहेजा नहीं जा सका। इंटरनेट जाँचें और फिर से “सहेजें” दबाएँ।",
    noWrite: "आपको इस वेबसाइट में लिखने की अनुमति नहीं है।",
    newTitle: "नई रचना",
    editTitle: "रचना संपादित करें",
    kindLabel: "क्या लिख रहे हैं?",
    kindPoem: "कविता",
    kindJournal: "डायरी का पन्ना",
    fromPaper: "कागज़ से",
    paperHelp: "हस्तलिखित पन्ने की फ़ोटो चुनें या यहाँ खींचकर छोड़ें। फ़ोटो रचना के साथ सहेजी जाएगी, और Claude लिखावट पढ़कर उसे टाइप कर सकता है।",
    choosePhoto: "फ़ोटो चुनें",
    readHand: "✦ लिखावट पढ़ें",
    removePhoto: "फ़ोटो हटाएँ",
    hiTitle: "हिंदी शीर्षक",
    hiBody: "हिंदी मूल",
    hiBodyHelp: "हर पंक्ति नई लाइन में, छंदों के बीच खाली लाइन",
    enTitle: "अंग्रेज़ी शीर्षक",
    enBody: "अंग्रेज़ी अनुवाद",
    enBodyHelp: "भाव के प्रति सच्चा, सिर्फ़ शब्दशः नहीं",
    draftTr: "✦ Claude से अनुवाद का मसौदा",
    trWorking: "Claude अनुवाद कर रहा है… (आधा मिनट तक लग सकता है)",
    trDone: "मसौदा तैयार है। इसे ध्यान से पढ़ें और भाव के अनुसार ठीक करें।",
    trNeed: "पहले हिंदी मूल लिखें।",
    trOverwrite: "अनुवाद बॉक्स में पहले से कुछ लिखा है। नया मसौदा उसकी जगह ले लेगा। फिर से दबाएँ।",
    trFail: "अनुवाद नहीं हो सका। दोबारा कोशिश करें।",
    category: "श्रेणी",
    noCategory: "— चुनें —",
    date: "तारीख़",
    featuredLabel: "मुखपृष्ठ पर “चुनी हुई कविता” बनाएँ",
    needText: "शीर्षक या रचना लिखें।",
    notImage: "कृपया फ़ोटो (JPG या PNG) चुनें।",
    preparing: "फ़ोटो तैयार हो रही है…",
    photoAdded: "फ़ोटो जुड़ गई। “✦ लिखावट पढ़ें” दबाएँ, फिर जाँच लें।",
    photoBad: "यह फ़ोटो नहीं खुल सकी। दूसरी फ़ोटो आज़माएँ।",
    overwrite: "हिंदी बॉक्स में पहले से कुछ लिखा है। पढ़ी गई रचना उसकी जगह ले लेगी। फिर से दबाएँ।",
    reading: "Claude लिखावट पढ़ रहा है… (आधा मिनट तक लग सकता है)",
    readDone: "रचना टाइप हो गई। मूल पन्ने से मिलाकर देख लें और [?] वाले शब्द ठीक करें।",
    readFail: "लिखावट नहीं पढ़ी जा सकी। दोबारा कोशिश करें या हाथ से टाइप करें।",
    "err_resource-exhausted": "अभी बहुत अनुरोध हैं। एक मिनट बाद कोशिश करें।",
    "err_failed-precondition": "Claude ने यह अनुरोध पूरा नहीं किया। हाथ से लिखें।",
    "err_permission-denied": "आपको इस वेबसाइट में लिखने की अनुमति नहीं है।",
    "err_unauthenticated": "पहले लॉग इन करें।",
    "err_out-of-range": "पन्ना बहुत लंबा है। उसे दो हिस्सों में बाँटकर कोशिश करें।",
    "err_unavailable": "Claude अभी उपलब्ध नहीं है। थोड़ी देर बाद कोशिश करें।",
    bootError: "वेबसाइट लोड नहीं हो सकी। पेज रीफ़्रेश करें।",
  },
  en: {
    nav: { home: "Home", poems: "Poems", journal: "The Journal", about: "About Nidhi", contact: "Contact" },
    newWriting: "+ New writing",
    heroBy: "A Hindi poetry journal by Nidhi Shrivastava, with an English translation beside every poem so each reader can feel it.",
    explore: "Explore poems",
    featured: "Featured poem",
    readPoem: "Read the poem",
    browse: "Browse by feeling",
    browseSub: "एहसास के रास्ते",
    poemsCount: n => `${n} ${n === 1 ? "poem" : "poems"}`,
    aboutPoet: "Meet the poet",
    readMoreAbout: "Read the full story",
    loading: "Turning the pages…",
    emptyBig: "Waiting for the first poem",
    emptyWriter: "Press “+ New writing” above. Type a poem or upload a photo of a handwritten page.",
    emptyReader: "Poems will appear here soon.",
    allPoems: "All",
    saved: "Saved",
    savedNote: "Saved poems stay in this browser only. They won't appear on another phone or computer.",
    savedEmpty: "You haven't saved any poems yet. Press “♡ Save” on a poem.",
    search: "Search a poem, line or word…",
    noMatch: "No poem matches this search.",
    notFound: "This piece could not be found.",
    untitled: "Untitled",
    by: "By Nidhi Shrivastava",
    minRead: n => `${n} min read`,
    home: "Home",
    poemsCrumb: "Poems",
    journalCrumb: "Journal",
    viewHi: "Original",
    viewEn: "Translation",
    viewBoth: "Both",
    translationLabel: "English translation",
    copyLink: "Copy link",
    copied: "Link copied",
    copyFail: "Couldn't copy. Select this link and copy it:",
    whatsapp: "Send on WhatsApp",
    save: "♡ Save",
    savedBtn: "♥ Saved",
    readingMode: "Reading mode",
    exitReading: "Exit reading mode",
    related: "More poems like this",
    seeOrig: "See the original handwritten page",
    edit: "Edit",
    del: "Delete",
    delConfirm: "This writing and its page will be removed for good.",
    delYes: "Yes, delete",
    delNo: "Keep it",
    delFail: "Could not delete. Please try again.",
    journalTitle: "डायरी",
    journalSub: "The Journal · reflections and essays",
    journalIntro: "The thoughts behind the poems, reflections and short essays.",
    journalEmpty: "The journal has no entries yet.",
    poemsTitle: "कविताएँ",
    poemsSub: "All poems",
    aboutTitle: "मेरे बारे में",
    aboutSub: "About Nidhi",
    aboutEmptyWriter: "Add Nidhi's introduction here: how long she has been writing and what moves her to write.",
    aboutEmptyReader: "Introduction coming soon.",
    editAbout: "Edit introduction",
    introLabel: "Short introduction",
    introHelp: "shown on the home page, two or three lines",
    bioLabel: "Full story",
    portraitLabel: "Portrait (optional)",
    choosePortrait: "Choose portrait",
    removePortrait: "Remove portrait",
    contactTitle: "संपर्क",
    contactSub: "Messages and collaborations",
    contactDefault: "If you'd like to share a thought about a poem, or work together on something, please write.",
    emailLabel: "Email",
    copyEmail: "Copy email",
    emailCopied: "Email copied",
    contactEmpty: "Contact details coming soon.",
    editContact: "Edit contact details",
    noteLabel: "Message to readers",
    instaLabel: "Instagram link",
    fbLabel: "Facebook link",
    ytLabel: "YouTube link",
    urlHelp: "full link starting with https://",
    badUrl: "Links must start with https://.",
    privacyTitle: "गोपनीयता",
    privacySub: "Privacy",
    privacy: "This website doesn't ask readers for any personal information and has no ads or tracking.\n\nPoems you save with “♡ Save” are stored only in your own browser. We can't see them.\n\nIf you get in touch by email or social media, your message travels through that service and is used only to reply to you.\n\nThis website runs on Google Firebase, which may record basic technical information (such as IP addresses) to operate the site.\n\nAll poems and writing on this website are original works by Nidhi Shrivastava. Please don't republish them elsewhere without permission.",
    copyright: y => `© ${y} Nidhi Shrivastava. All rights reserved.`,
    privacyLink: "Privacy",
    signIn: "Editor sign-in",
    signOut: "Sign out",
    signedInAs: e => `Signed in as ${e}`,
    notEditor: e => `${e} isn't set up as an editor. Ask the site owner to add it.`,
    signInFail: "Sign-in didn't work. Please try again.",
    loginTitle: "लेखक लॉगिन",
    loginSub: "Editor sign-in",
    loginIntro: "This page is for Nidhyakshar's author. Sign in with your Google account to write, edit and delete poems.",
    loginGoogle: "Sign in with Google",
    loginReady: "You're signed in as an editor. You can write a new poem now, and every poem page will show Edit and Delete.",
    loginWrite: "+ Write something new",
    loginHome: "Go to the home page",
    loginTip: "Tip: bookmark this page.",
    signInOff: "Sign-in isn't switched on yet. The site owner needs to enable Google sign-in in Firebase.",
    signInDomain: "This web address isn't allowed for sign-in yet. The site owner needs to add it in Firebase.",
    signInPopup: "The sign-in window couldn't open. Allow pop-ups for this site and try again.",
    cancel: "Cancel",
    saveBtn: "Save",
    saving: "Saving…",
    saveFail: "Could not save. Check the internet connection and press “Save” again.",
    noWrite: "You don't have permission to write on this website.",
    newTitle: "New writing",
    editTitle: "Edit writing",
    kindLabel: "What are you writing?",
    kindPoem: "Poem",
    kindJournal: "Journal entry",
    fromPaper: "From paper",
    paperHelp: "Choose a photo of the handwritten page, or drag it here. The photo is saved with the writing, and Claude can read the handwriting and type it out.",
    choosePhoto: "Choose photo",
    readHand: "✦ Read handwriting",
    removePhoto: "Remove photo",
    hiTitle: "Hindi title",
    hiBody: "Hindi original",
    hiBodyHelp: "each line on its own line, a blank line between stanzas",
    enTitle: "English title",
    enBody: "English translation",
    enBodyHelp: "faithful to the feeling, not only the words",
    draftTr: "✦ Draft translation with Claude",
    trWorking: "Claude is translating… (this can take up to half a minute)",
    trDone: "Draft ready. Read it carefully and adjust it to match the feeling of the original.",
    trNeed: "Write the Hindi original first.",
    trOverwrite: "The translation box already has text. The new draft will replace it. Press again to continue.",
    trFail: "Could not translate. Please try again.",
    category: "Category",
    noCategory: "— choose —",
    date: "Date",
    featuredLabel: "Show as the featured poem on the home page",
    needText: "Write a title or some text.",
    notImage: "Please choose a photo (JPG or PNG).",
    preparing: "Preparing the photo…",
    photoAdded: "Photo added. Press “✦ Read handwriting”, then check the text.",
    photoBad: "This photo could not be opened. Try another one.",
    overwrite: "The Hindi box already has text. The transcription will replace it. Press again to continue.",
    reading: "Claude is reading the handwriting… (this can take up to half a minute)",
    readDone: "Typed. Compare it with the original page and fix any words marked [?].",
    readFail: "Could not read the handwriting. Try again, or type it by hand.",
    "err_resource-exhausted": "Too many requests right now. Try again in a minute.",
    "err_failed-precondition": "Claude did not complete this request. Please write it by hand.",
    "err_permission-denied": "You don't have permission to write on this website.",
    "err_unauthenticated": "Please sign in first.",
    "err_out-of-range": "The page is too long. Try it in two parts.",
    "err_unavailable": "Claude isn't available right now. Try again shortly.",
    bootError: "The website couldn't load. Please refresh the page.",
  },
};
let lang = "hi";
try { if (localStorage.getItem("lang") === "en") lang = "en"; } catch {}
const t = (k, ...a) => { const v = STR[lang][k]; return typeof v === "function" ? v(...a) : v; };

/* ---------- Firebase ---------- */
let db, auth, storage, functions;
try {
  // Firebase Hosting serves this project's config at a reserved URL, so nothing is hard-coded here.
  const config = await (await fetch("/__/firebase/init.json")).json();
  const app = initializeApp(config);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  functions = getFunctions(app, "asia-south1");
} catch (err) {
  console.error(err);
  main.innerHTML = `<p class="boot-error">${esc(t("bootError"))}</p>`;
  throw err;
}

/* ---------- state ---------- */
let user = null, canWrite = false, authNote = "";
let entries = [];       // poems and journal entries, newest first
let loaded = false;
let about = { intro: "", bio: "", portraitUrl: "", portraitPath: "" };
let contact = { email: "", note: "", instagram: "", facebook: "", youtube: "" };
let view = { name: "home" };
let filter = { cat: "", q: "", saved: false };
let editing = null;     // "about" | "contact" | null
let portraitDraft = null; // { url, blob } while editing About
let draft = null;
let favs = new Set();
try { favs = new Set(JSON.parse(localStorage.getItem("favs") || "[]")); } catch {}
let readView = "both";
try { readView = localStorage.getItem("readView") || "both"; } catch {}

const poems = () => entries.filter(e => (e.kind || "poem") === "poem");
const journal = () => entries.filter(e => e.kind === "journal");
const fmtDate = s => {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return isNaN(d) ? s : d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });
};
const minutes = e => Math.max(1, Math.round(((e.body || "") + " " + (e.bodyEn || "")).split(/\s+/).filter(Boolean).length / 110));
const firstLines = (s, n) => (s || "").replace(/^\s+/, "").split("\n").slice(0, n).join("\n").replace(/\s+$/, "");
const link = (path, inner, cls = "", extra = "") => `<a href="${esc(path)}" data-go="${esc(path)}"${cls ? ` class="${cls}"` : ""} ${extra}>${inner}</a>`;

/* ---------- routing (real paths, so every poem has its own address) ---------- */
function parsePath(p) {
  const parts = p.replace(/\/+$/, "").split("/").filter(Boolean);
  if (!parts.length) return { name: "home" };
  if (parts[0] === "poems") return parts[1] ? { name: "poems", cat: parts[1] } : { name: "poems" };
  if (parts[0] === "saved") return { name: "poems", saved: true };
  if (parts[0] === "poem" && parts[1]) return { name: "entry", id: parts[1] };
  if (["journal", "about", "contact", "privacy", "login"].includes(parts[0])) return { name: parts[0] };
  return { name: "home" };
}
function applyView(v) {
  view = v;
  if (v.name === "poems") { filter.cat = v.cat || ""; filter.saved = !!v.saved; }
  editing = null; portraitDraft = null;
}
function go(path) {
  applyView(parsePath(path));
  if (location.pathname !== path) history.pushState(null, "", path);
  render();
  scrollTo(0, 0);
}
addEventListener("popstate", () => { applyView(parsePath(location.pathname)); render(); });
applyView(parsePath(location.pathname));

function setMeta(title, description) {
  document.title = title ? `${title} · निध्याक्षर` : "निध्याक्षर · Nidhyakshar — निधि श्रीवास्तव की हिंदी कविताएँ";
  if (description) $('meta[name="description"]').setAttribute("content", description.slice(0, 160));
}

/* ---------- chrome ---------- */
function paintChrome() {
  document.documentElement.lang = lang;
  const cur = view.name === "entry" ? ((entries.find(e => e.id === view.id) || {}).kind === "journal" ? "journal" : "poems") : view.name;
  const paths = { home: "/", poems: "/poems", journal: "/journal", about: "/about", contact: "/contact" };
  $("#nav").innerHTML = Object.entries(paths).map(([k, p]) =>
    link(p, t("nav")[k], "", cur === k ? 'aria-current="page"' : "")).join("");
  for (const b of document.querySelectorAll("[data-lang]")) b.setAttribute("aria-pressed", b.dataset.lang === lang);
  $("#new-btn").textContent = t("newWriting");
  $("#new-btn").hidden = !canWrite || view.name === "edit";
  $("#exit-reading").textContent = t("exitReading");
  const socials = [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"]].filter(([k]) => contact[k]);
  $("#footer").innerHTML = `
    ${blossom("fflower")}
    <div class="flinks">
      ${link("/about", t("nav").about)}
      ${link("/contact", t("nav").contact)}
      ${link("/privacy", t("privacyLink"))}
      ${socials.map(([k, n]) => `<a href="${esc(contact[k])}" target="_blank" rel="noopener">${n}</a>`).join("")}
    </div>
    <div>${t("copyright", new Date().getFullYear())}</div>
    <div class="account">
      ${user ? `<span>${esc(t("signedInAs", user.email))}</span><button data-signout>${t("signOut")}</button>` : `<button data-signin>${t("signIn")}</button>`}
    </div>
    ${authNote ? `<div class="status err">${esc(authNote)}</div>` : ""}`;
}

function render() {
  document.body.classList.remove("reading");
  document.body.dataset.view = view.name; // poem pages and the editor hide the side branches
  paintChrome();
  const v = view.name;
  if (v === "home") renderHome();
  else if (v === "poems") renderPoems();
  else if (v === "entry") renderEntry();
  else if (v === "journal") renderJournal();
  else if (v === "about") renderAbout();
  else if (v === "contact") renderContact();
  else if (v === "privacy") renderPrivacy();
  else if (v === "login") renderLogin();
  else if (v === "edit") renderEditor();
}

/* ---------- shared pieces ---------- */
function card(e) {
  return link(`/poem/${e.id}`, `
    ${catOf(e.category) ? `<span class="eyebrow">${esc(catPair(e.category))}</span>` : ""}
    <span class="pt">${esc(e.title || t("untitled"))}</span>
    ${e.titleEn ? `<span class="pe">${esc(e.titleEn)}</span>` : ""}
    <span class="px">${esc(firstLines(e.body, 3))}</span>
    <span class="pm">${esc(fmtDate(e.writtenOn))} · ${t("minRead", minutes(e))}${favs.has(e.id) ? ' · <span class="heart">♥</span>' : ""}</span>`, "pcard");
}
const emptyBox = () => `<div class="empty"><div class="big">${t("emptyBig")}</div><p style="margin:0">${canWrite ? t("emptyWriter") : t("emptyReader")}</p></div>`;
const loadingBox = () => `<div class="empty">${t("loading")}</div>`;
const sectionHead = (title, sub) => `<div class="section-head"><h2 class="section-title">${title}</h2>${sub ? `<p class="section-sub">${sub}</p>` : ""}</div>`;

/* ---------- home ---------- */
function renderHome() {
  setMeta("", "");
  const ps = poems();
  const feat = ps.find(p => p.featured) || ps[0];
  const featHtml = !loaded ? loadingBox() : !feat ? emptyBox() : `
    <div class="featured">
      <div>
        ${catOf(feat.category) ? `<div class="eyebrow">${esc(catPair(feat.category))}</div>` : ""}
        <h3 class="ftitle">${esc(feat.title || t("untitled"))}</h3>
        ${feat.titleEn ? `<p class="section-sub" style="margin:0 0 18px">${esc(feat.titleEn)}</p>` : ""}
        <p class="hindi" lang="hi">${esc(firstLines(feat.body, 6))}</p>
      </div>
      <div style="display:grid;gap:18px;align-content:space-between">
        ${feat.bodyEn ? `<div lang="en"><div class="eyebrow">${t("translationLabel")}</div><p class="en-body" style="margin-top:10px">${esc(firstLines(feat.bodyEn, 6))}</p></div>` : "<div></div>"}
        <div>${link(`/poem/${feat.id}`, `${t("readPoem")} →`, "btn primary")}</div>
      </div>
    </div>`;
  const counts = Object.fromEntries(CATS.map(c => [c.key, ps.filter(p => p.category === c.key).length]));
  const portrait = `<img class="portrait" src="${esc(about.portraitUrl || AUTHOR_PHOTO_SMALL)}" alt="${esc(POET[lang])}" loading="lazy">`;

  main.innerHTML = `
    <section class="hero">
      ${petals()}
      <div>
        <h1 lang="hi">जहाँ एहसास, शब्द बन जाते हैं।</h1>
        <p class="hero-en" lang="en">Where feelings find their words.</p>
        <p class="hero-by">${t("heroBy")}</p>
        ${link("/poems", `${t("explore")} →`, "btn primary")}
      </div>
      <figure class="hero-photo">
        <img src="${esc(about.portraitUrl || AUTHOR_PHOTO)}" alt="${esc(POET[lang])}" width="900" height="1080" fetchpriority="high">
        ${sprig("hero-sprig")}
        <figcaption>${esc(POET[lang])}</figcaption>
      </figure>
    </section>
    <section class="block">
      <div class="eyebrow">${t("featured")}</div>
      ${featHtml}
    </section>
    <section class="block">
      ${sectionHead(t("browse"), t("browseSub"))}
      <div class="feelings">${CATS.map(c => link(`/poems/${c.key}`, `
          ${catMark(c.key)}
          <span class="fh" lang="hi">${c.hi}</span>
          <span class="fe" lang="en">${c.en}</span>
          <span class="fd">${lang === "hi" ? c.dhi : c.den}</span>
          <span class="fc">${t("poemsCount", counts[c.key])}</span>`, "feel")).join("")}</div>
    </section>
    <section class="block">
      ${sectionHead(t("aboutPoet"), lang === "hi" ? POET.en : POET.hi)}
      <div class="about-home">
        ${portrait}
        <div style="display:grid;gap:14px">
          <p class="about-text">${esc(aboutIntro())}</p>
          <div>${link("/about", `${t("readMoreAbout")} →`, "btn")}</div>
        </div>
      </div>
    </section>`;
}

/* ---------- poems ---------- */
function renderPoems() {
  const q = filter.q.trim().toLowerCase();
  let list = poems();
  if (filter.saved) list = list.filter(p => favs.has(p.id));
  if (filter.cat) list = list.filter(p => p.category === filter.cat);
  if (q) list = list.filter(p => [p.title, p.titleEn, p.body, p.bodyEn].join("\n").toLowerCase().includes(q));
  const c = catOf(filter.cat);
  setMeta(c ? `${c.hi} · ${c.en}` : "कविताएँ · Poems", c ? `${c.hi} (${c.en}): ${c.dhi}. निधि श्रीवास्तव की कविताएँ।` : "निधि श्रीवास्तव की सभी हिंदी कविताएँ, अंग्रेज़ी अनुवाद के साथ।");
  let body;
  if (!loaded) body = loadingBox();
  else if (filter.saved && !favs.size) body = `<div class="empty">${t("savedEmpty")}</div>`;
  else if (!poems().length) body = emptyBox();
  else if (!list.length) body = `<div class="empty">${t("noMatch")}</div>`;
  else body = `<div class="cards">${list.map(card).join("")}</div>`;

  main.innerHTML = `
    <section class="block">
      ${c?.key === "love" ? rose("rose-mark head-rose") : ""}
      ${sectionHead(c ? c.hi : t("poemsTitle"), c ? `${c.en} · ${lang === "hi" ? c.dhi : c.den}` : t("poemsSub"))}
      <div class="filters">
        ${link("/poems", t("allPoems"), "chip", `aria-pressed="${!filter.cat && !filter.saved}"`)}
        ${CATS.map(k => link(`/poems/${k.key}`, `<span class="hi">${k.hi}</span> · ${k.en}`, "chip", `aria-pressed="${filter.cat === k.key}"`)).join("")}
        ${link("/saved", `♥ ${t("saved")}`, "chip", `aria-pressed="${filter.saved}"`)}
      </div>
      <input type="search" id="q" class="search" placeholder="${esc(t("search"))}" aria-label="${esc(t("search"))}" value="${esc(filter.q)}">
      ${filter.saved ? `<p class="note">${t("savedNote")}</p>` : ""}
      ${body}
    </section>`;
  const qi = $("#q");
  qi.oninput = () => { filter.q = qi.value; const pos = qi.selectionStart; renderPoems(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); };
}

/* ---------- journal ---------- */
function renderJournal() {
  setMeta("डायरी · The Journal", "निधि श्रीवास्तव की डायरी: कविताओं के पीछे की बातें, विचार और छोटे-छोटे लेख।");
  const list = journal();
  main.innerHTML = `
    <section class="block">
      ${sectionHead(t("journalTitle"), t("journalSub"))}
      <p class="muted" style="margin:0;max-width:60ch">${t("journalIntro")}</p>
      ${!loaded ? loadingBox() : !list.length ? `<div class="empty">${t("journalEmpty")}</div>` : `<div class="cards">${list.map(card).join("")}</div>`}
    </section>`;
}

/* ---------- a single poem or journal entry ---------- */
function renderEntry() {
  const e = entries.find(x => x.id === view.id);
  if (!e) { setMeta("", ""); main.innerHTML = `<div class="reader">${loaded ? `<div class="empty">${t("notFound")}</div>` : loadingBox()}</div>`; return; }
  setMeta([e.title, e.titleEn].filter(Boolean).join(" · ") || t("untitled"), `${firstLines(e.body, 2).replace(/\n/g, " ")} — ${POET.hi}`);
  const isJ = e.kind === "journal";
  const hasEn = !!(e.bodyEn || "").trim();
  const mode = hasEn ? readView : "hi";
  const c = catOf(e.category);
  const url = `${location.origin}/poem/${e.id}`;
  const pool = isJ ? journal() : poems();
  const same = c ? pool.filter(p => p.id !== e.id && p.category === e.category) : [];
  const related = (same.length ? same : pool.filter(p => p.id !== e.id)).slice(0, 3);

  main.innerHTML = `
    <article class="reader">
      <div class="crumbs">
        ${link("/", t("home"))} →
        ${link(isJ ? "/journal" : "/poems", isJ ? t("journalCrumb") : t("poemsCrumb"))}
        ${c ? ` → ${link(`/poems/${c.key}`, c.hi)}` : ""}
      </div>
      ${hasEn ? `<div class="seg" role="group" aria-label="${esc(t("translationLabel"))}">
        <button data-rv="hi" aria-pressed="${mode === "hi"}">${t("viewHi")}</button>
        <button data-rv="en" aria-pressed="${mode === "en"}">${t("viewEn")}</button>
        <button data-rv="both" aria-pressed="${mode === "both"}">${t("viewBoth")}</button></div>` : ""}
      <div class="sheet">
        <span class="tape" aria-hidden="true"></span>
        ${sprig("sheet-sprig")}
        ${sprig("sheet-sprig sheet-sprig-bl")}
        <span class="loose-petals" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <header class="poem-head">
          ${c ? `${c.key === "love" ? rose("rose-mark poem-rose") : ""}<div class="eyebrow">${esc(catPair(e.category))}</div>` : isJ ? `<div class="eyebrow">${t("journalCrumb")}</div>` : ""}
          <h1 lang="hi">${esc(e.title || t("untitled"))}</h1>
          ${e.titleEn ? `<p class="en-title" lang="en">${esc(e.titleEn)}</p>` : ""}
          <div class="byline">${t("by")} · ${t("minRead", minutes(e))}${e.writtenOn ? " · " + esc(fmtDate(e.writtenOn)) : ""}</div>
        </header>
        ${blossom("sheet-orn")}
        ${mode !== "en" ? `<p class="hindi" lang="hi">${esc(e.body)}</p>` : ""}
        ${hasEn && mode === "both" ? blossom("sheet-orn") : ""}
        ${hasEn && mode !== "hi" ? `<div class="translation" lang="en">
            <div class="eyebrow">${t("translationLabel")}</div>
            <p class="en-body">${esc(e.bodyEn)}</p></div>` : ""}
        <p class="signature">— ${POET[lang]} ${blossom("sig-blossom")}</p>
      </div>
      ${e.photoUrl ? `<details class="orig"><summary>${t("seeOrig")}</summary><img src="${esc(e.photoUrl)}" alt="${esc(e.title)}" loading="lazy"></details>` : ""}
      <div class="share">
        <button class="btn small" data-copy="${esc(url)}">${t("copyLink")}</button>
        <a class="btn small" href="https://wa.me/?text=${encodeURIComponent((e.title || "") + " — " + POET.en + "\n" + url)}" target="_blank" rel="noopener">${t("whatsapp")}</a>
        <button class="btn small" data-fav="${esc(e.id)}">${favs.has(e.id) ? t("savedBtn") : t("save")}</button>
        <button class="btn small" data-reading>${t("readingMode")}</button>
      </div>
      <div class="status" id="share-status" style="text-align:center"></div>
      ${canWrite ? `<div class="writer-actions" id="writer-actions">
          <button class="btn small" data-edit="${esc(e.id)}">${t("edit")}</button>
          <button class="btn small danger" data-ask-del>${t("del")}</button></div>` : ""}
      ${related.length ? `<section class="related" style="display:grid;gap:16px;padding-top:28px;border-top:1px solid var(--blush)">
          <div class="eyebrow">${t("related")}</div>
          <div class="cards">${related.map(card).join("")}</div></section>` : ""}
    </article>`;
}

/* ---------- about / contact / privacy ---------- */
function renderAbout() {
  setMeta("मेरे बारे में · About Nidhi", DEFAULT_ABOUT.hi.intro + " " + DEFAULT_ABOUT.en.intro);
  if (editing === "about") return renderAboutForm();
  main.innerHTML = `
    <div class="about-page">
      <figure class="about-photo">
        <img src="${esc(about.portraitUrl || AUTHOR_PHOTO)}" alt="${esc(POET[lang])}" width="900" height="1080">
        ${sprig("hero-sprig")}
      </figure>
      <div class="about-copy">
        <h1 class="about-lead">${esc(aboutIntro())}</h1>
        <div class="about-body">${aboutBio().split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join("")}</div>
        <dl class="facts">${ABOUT_FACTS[lang].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <p class="signature">— ${POET[lang]}</p>
        ${canWrite ? `<div><button class="btn small" data-edit-site="about">${t("editAbout")}</button></div>` : ""}
      </div>
    </div>`;
}
function renderAboutForm(keep) {
  if (portraitDraft === null) portraitDraft = { url: about.portraitUrl || "", blob: null };
  // Start from what readers currently see, so editing builds on the existing introduction.
  const intro = keep ? keep.intro : aboutIntro(), bio = keep ? keep.bio : aboutBio();
  main.innerHTML = `
    <div class="prose">
      ${sectionHead(t("aboutTitle"), t("aboutSub"))}
      <form class="editor" id="about-form" novalidate>
        <div class="field">${t("portraitLabel")}
          <div class="row"><img class="portrait" src="${esc(portraitDraft.url || AUTHOR_PHOTO_SMALL)}" alt="">
            <label class="btn small" for="portrait-in">${t("choosePortrait")}</label>
            <input type="file" id="portrait-in" accept="image/*" hidden>
            ${portraitDraft.url ? `<button type="button" class="link" id="portrait-rm">${t("removePortrait")}</button>` : ""}</div></div>
        <label>${t("introLabel")} <small>${t("introHelp")}</small><textarea id="a-intro" class="f-hi" style="min-height:120px">${esc(intro)}</textarea></label>
        <label>${t("bioLabel")}<textarea id="a-bio" class="f-hi">${esc(bio)}</textarea></label>
        <div class="row"><button class="btn primary" type="submit">${t("saveBtn")}</button>
          <button type="button" class="link" data-cancel-site>${t("cancel")}</button><span class="status" id="site-status"></span></div>
      </form>
    </div>`;
  const current = () => ({ intro: $("#a-intro").value, bio: $("#a-bio").value });
  $("#portrait-in").onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return;
    const k = current();
    try { const blob = await compress(f, 900); portraitDraft = { url: URL.createObjectURL(blob), blob }; } catch {}
    renderAboutForm(k);
  };
  const rm = $("#portrait-rm");
  if (rm) rm.onclick = () => { const k = current(); portraitDraft = { url: "", blob: null }; renderAboutForm(k); };
  $("#about-form").onsubmit = ev => { ev.preventDefault(); saveAbout(current()); };
}

async function saveAbout({ intro, bio }) {
  const st = $("#site-status");
  st.className = "status"; st.textContent = t("saving");
  try {
    let { portraitUrl = "", portraitPath = "" } = about;
    const changed = portraitDraft && portraitDraft.url !== (about.portraitUrl || "");
    if (changed) {
      if (portraitPath) await deleteObject(storageRef(storage, portraitPath)).catch(() => {});
      portraitUrl = ""; portraitPath = "";
      if (portraitDraft.blob) {
        portraitPath = `portraits/portrait-${Date.now()}.jpg`;
        const r = storageRef(storage, portraitPath);
        await uploadBytes(r, portraitDraft.blob, { contentType: "image/jpeg" });
        portraitUrl = await getDownloadURL(r);
      }
    }
    const data = { intro: intro.trim(), bio: bio.trim(), portraitUrl, portraitPath };
    await setDoc(doc(db, "site", "about"), data);
    about = data; editing = null; portraitDraft = null; render();
  } catch (e) {
    console.error(e);
    st.className = "status err"; st.textContent = e?.code === "permission-denied" || e?.code === "storage/unauthorized" ? t("noWrite") : t("saveFail");
  }
}

function renderContact() {
  setMeta("संपर्क · Contact", "निधि श्रीवास्तव से संपर्क करें।");
  if (editing === "contact") return renderContactForm();
  const socials = [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"]].filter(([k]) => contact[k]);
  main.innerHTML = `
    <div class="prose">
      ${sectionHead(t("contactTitle"), t("contactSub"))}
      <p class="body-text">${esc(contact.note || t("contactDefault"))}</p>
      ${contact.email ? `<div class="contact-line"><span class="eyebrow">${t("emailLabel")}</span>
          <a class="addr" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>
          <button class="btn small" data-copy="${esc(contact.email)}" data-copied="${esc(t("emailCopied"))}">${t("copyEmail")}</button></div>` : ""}
      ${socials.length ? `<div class="row">${socials.map(([k, n]) => `<a class="btn small" href="${esc(contact[k])}" target="_blank" rel="noopener">${n}</a>`).join("")}</div>` : ""}
      ${!contact.email && !socials.length ? `<div class="empty">${t("contactEmpty")}</div>` : ""}
      <div class="status" id="share-status"></div>
      ${canWrite ? `<div><button class="btn small" data-edit-site="contact">${t("editContact")}</button></div>` : ""}
    </div>`;
}
function renderContactForm() {
  main.innerHTML = `
    <div class="prose">
      ${sectionHead(t("contactTitle"), t("contactSub"))}
      <form class="editor" id="contact-form" novalidate>
        <label>${t("noteLabel")}<textarea id="c-note" class="f-hi" style="min-height:110px" placeholder="${esc(t("contactDefault"))}">${esc(contact.note)}</textarea></label>
        <label>${t("emailLabel")}<input type="email" id="c-email" value="${esc(contact.email)}"></label>
        <div class="two">
          <label>${t("instaLabel")} <small>${t("urlHelp")}</small><input id="c-instagram" value="${esc(contact.instagram)}"></label>
          <label>${t("fbLabel")} <small>${t("urlHelp")}</small><input id="c-facebook" value="${esc(contact.facebook)}"></label>
          <label>${t("ytLabel")} <small>${t("urlHelp")}</small><input id="c-youtube" value="${esc(contact.youtube)}"></label>
        </div>
        <div class="row"><button class="btn primary" type="submit">${t("saveBtn")}</button>
          <button type="button" class="link" data-cancel-site>${t("cancel")}</button><span class="status" id="site-status"></span></div>
      </form>
    </div>`;
  $("#contact-form").onsubmit = async ev => {
    ev.preventDefault();
    const st = $("#site-status");
    const d = { note: $("#c-note").value.trim(), email: $("#c-email").value.trim() };
    for (const k of ["instagram", "facebook", "youtube"]) {
      const v = $("#c-" + k).value.trim();
      if (v && !/^https:\/\//i.test(v)) { st.className = "status err"; st.textContent = t("badUrl"); return; }
      d[k] = v;
    }
    st.className = "status"; st.textContent = t("saving");
    try { await setDoc(doc(db, "site", "contact"), d); contact = d; editing = null; render(); }
    catch (e) { st.className = "status err"; st.textContent = e?.code === "permission-denied" ? t("noWrite") : t("saveFail"); }
  };
}

// Nidhi's private sign-in page (nidhyakshar.in/login). Readers never need it.
function renderLogin() {
  setMeta(`${t("loginTitle")} · ${t("loginSub")}`, "");
  let state;
  if (user && canWrite) state = `
      <p class="body-text">${t("loginReady")}</p>
      <div class="row">
        <button class="btn primary" data-new>${t("loginWrite")}</button>
        ${link("/", t("loginHome"), "btn")}
      </div>
      <p class="note">${esc(t("signedInAs", user.email))} · <button class="link" data-signout>${t("signOut")}</button></p>`;
  else if (user) state = `
      <p class="status err">${esc(t("notEditor", user.email))}</p>
      <div class="row"><button class="btn" data-signout>${t("signOut")}</button></div>`;
  else state = `
      <p class="body-text">${t("loginIntro")}</p>
      <div><button class="btn primary login-google" data-signin>${t("loginGoogle")}</button></div>
      ${authNote ? `<p class="status err">${esc(authNote)}</p>` : ""}
      <p class="note">${t("loginTip")}</p>`;
  main.innerHTML = `
    <div class="prose login-page">
      ${blossom("login-blossom")}
      ${sectionHead(t("loginTitle"), t("loginSub"))}
      ${state}
    </div>`;
}

function renderPrivacy() {
  setMeta("गोपनीयता · Privacy", "निध्याक्षर की गोपनीयता नीति।");
  main.innerHTML = `<div class="prose">${sectionHead(t("privacyTitle"), t("privacySub"))}<p class="body-text">${esc(t("privacy"))}</p></div>`;
}

/* ---------- photos ---------- */
// Resize before upload: sharp enough to read handwriting, small enough to load quickly on a phone.
async function compress(file, maxSide = 1800) {
  const img = await createImageBitmap(file);
  const s = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error("encode")), "image/jpeg", 0.85));
}
const blobToBase64 = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1]);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

/* ---------- editor ---------- */
function openEditor(id) {
  const e = id ? entries.find(x => x.id === id) : null;
  draft = {
    id: e?.id || null, kind: e?.kind || "poem",
    title: e?.title || "", titleEn: e?.titleEn || "", body: e?.body || "", bodyEn: e?.bodyEn || "",
    category: e?.category || "", writtenOn: e?.writtenOn || new Date().toISOString().slice(0, 10),
    featured: !!e?.featured,
    photoPath: e?.photoPath || "", photoUrl: e?.photoUrl || "",
    photoBlob: null, photoPreview: e?.photoUrl || "", photoChanged: false,
  };
  view = { name: "edit", id };
  render(); scrollTo(0, 0);
}

function renderEditor() {
  setMeta(draft.id ? t("editTitle") : t("newTitle"), "");
  const d = draft, isPoem = d.kind === "poem";
  main.innerHTML = `
    <div class="prose">
      <div class="crumbs"><button class="link" data-cancel-edit>← ${t("cancel")}</button></div>
      ${sectionHead(d.id ? t("editTitle") : t("newTitle"))}
      <form class="editor" id="ed" novalidate>
        <div class="field">${t("kindLabel")}
          <div class="kind">
            <label><input type="radio" name="kind" value="poem" ${isPoem ? "checked" : ""}> ${t("kindPoem")}</label>
            <label><input type="radio" name="kind" value="journal" ${!isPoem ? "checked" : ""}> ${t("kindJournal")}</label>
          </div></div>
        <div class="drop" id="drop">
          <strong>${t("fromPaper")}</strong>
          <small class="muted">${t("paperHelp")}</small>
          <div id="photo-slot"></div>
          <div class="row">
            <label class="btn small" for="f-photo">${t("choosePhoto")}</label>
            <input type="file" id="f-photo" accept="image/*" hidden>
            <button type="button" class="btn small primary" id="read-btn" hidden>${t("readHand")}</button>
            <button type="button" class="link" id="rm-photo" hidden>${t("removePhoto")}</button>
          </div>
          <div class="status" id="photo-status"></div>
        </div>
        <div class="two">
          <label>${t("hiTitle")}<input data-f="title" id="f-title" class="f-hi" value="${esc(d.title)}"></label>
          <label>${t("enTitle")}<input data-f="titleEn" id="f-titleEn" class="f-en" value="${esc(d.titleEn)}"></label>
        </div>
        <div class="two">
          <label>${t("hiBody")} <small>${t("hiBodyHelp")}</small><textarea data-f="body" id="f-body" class="f-hi" lang="hi">${esc(d.body)}</textarea></label>
          <label>${t("enBody")} <small>${t("enBodyHelp")}</small><textarea data-f="bodyEn" id="f-bodyEn" class="f-en" lang="en">${esc(d.bodyEn)}</textarea></label>
        </div>
        <div class="row"><button type="button" class="btn small" id="tr-btn">${t("draftTr")}</button><span class="status" id="tr-status"></span></div>
        <div class="two">
          ${isPoem ? `<label>${t("category")}<select data-f="category" id="f-category">
              <option value="">${t("noCategory")}</option>
              ${CATS.map(c => `<option value="${c.key}" ${d.category === c.key ? "selected" : ""}>${c.hi} · ${c.en}</option>`).join("")}
            </select></label>` : ""}
          <label>${t("date")}<input type="date" data-f="writtenOn" id="f-date" value="${esc(d.writtenOn)}"></label>
        </div>
        ${isPoem ? `<label class="check"><input type="checkbox" data-f="featured" id="f-featured" ${d.featured ? "checked" : ""}> ${t("featuredLabel")}</label>` : ""}
        <div class="row">
          <button class="btn primary" type="submit" id="save-btn">${t("saveBtn")}</button>
          <span class="status" id="save-status"></span>
        </div>
        ${d.id ? `<div class="row editor-delete" id="writer-actions">
          <button type="button" class="btn small danger" data-ask-del>${t("del")}</button>
        </div>` : ""}
      </form>
    </div>`;
  paintPhoto();
  for (const el of main.querySelectorAll("[data-f]"))
    el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", () => {
      draft[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
    });
  for (const r of main.querySelectorAll('input[name="kind"]')) r.onchange = () => { draft.kind = r.value; renderEditor(); };
  $("#f-photo").onchange = ev => ev.target.files[0] && takePhoto(ev.target.files[0]);
  const drop = $("#drop");
  drop.ondragover = ev => { ev.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = ev => { ev.preventDefault(); drop.classList.remove("over"); const f = ev.dataTransfer.files[0]; if (f) takePhoto(f); };
  $("#rm-photo").onclick = () => { Object.assign(draft, { photoBlob: null, photoPreview: "", photoChanged: true }); paintPhoto(); };
  $("#read-btn").onclick = readHandwriting;
  $("#tr-btn").onclick = draftTranslation;
  $("#ed").onsubmit = ev => { ev.preventDefault(); saveEntry(); };
}

function paintPhoto() {
  const slot = $("#photo-slot"); if (!slot) return;
  slot.innerHTML = draft.photoPreview ? `<img src="${esc(draft.photoPreview)}" alt="">` : "";
  $("#rm-photo").hidden = !draft.photoPreview;
  $("#read-btn").hidden = !draft.photoPreview;
}

async function takePhoto(file) {
  const st = $("#photo-status");
  if (!file.type.startsWith("image/")) { st.className = "status err"; st.textContent = t("notImage"); return; }
  st.className = "status"; st.textContent = t("preparing");
  try {
    draft.photoBlob = await compress(file);
    draft.photoPreview = URL.createObjectURL(draft.photoBlob);
    draft.photoChanged = true;
    st.textContent = t("photoAdded");
    paintPhoto();
  } catch { st.className = "status err"; st.textContent = t("photoBad"); }
}

const callError = e => STR[lang]["err_" + String(e?.code || "").replace(/^functions\//, "")];

async function readHandwriting() {
  const btn = $("#read-btn"), st = $("#photo-status");
  if (draft.body.trim() && !btn.dataset.sure) { btn.dataset.sure = 1; st.className = "status"; st.textContent = t("overwrite"); return; }
  delete btn.dataset.sure;
  btn.disabled = true; st.className = "status"; st.textContent = t("reading");
  try {
    // An already-saved photo is fetched back so it can be sent again.
    const blob = draft.photoBlob || await (await fetch(draft.photoPreview)).blob();
    const image = await blobToBase64(blob);
    const transcribe = httpsCallable(functions, "transcribe", { timeout: 300000 });
    const { data } = await transcribe({ image, mediaType: blob.type || "image/jpeg" });
    draft.body = data.text.trim(); $("#f-body").value = draft.body;
    if (!draft.title && data.title) { draft.title = data.title; $("#f-title").value = data.title; }
    st.textContent = t("readDone");
  } catch (e) {
    console.error(e);
    st.className = "status err"; st.textContent = callError(e) || t("readFail");
  } finally { btn.disabled = false; }
}

async function draftTranslation() {
  const btn = $("#tr-btn"), st = $("#tr-status");
  if (!draft.body.trim()) { st.className = "status err"; st.textContent = t("trNeed"); return; }
  if (draft.bodyEn.trim() && !btn.dataset.sure) { btn.dataset.sure = 1; st.className = "status"; st.textContent = t("trOverwrite"); return; }
  delete btn.dataset.sure;
  btn.disabled = true; st.className = "status"; st.textContent = t("trWorking");
  try {
    const translate = httpsCallable(functions, "translate", { timeout: 300000 });
    const { data } = await translate({ title: draft.title, body: draft.body, kind: draft.kind });
    draft.bodyEn = data.translation.trim(); $("#f-bodyEn").value = draft.bodyEn;
    if (!draft.titleEn && data.title) { draft.titleEn = data.title; $("#f-titleEn").value = data.title; }
    st.textContent = t("trDone");
  } catch (e) {
    console.error(e);
    st.className = "status err"; st.textContent = callError(e) || t("trFail");
  } finally { btn.disabled = false; }
}

async function saveEntry() {
  const st = $("#save-status"), btn = $("#save-btn");
  if (!draft.title.trim() && !draft.body.trim()) { st.className = "status err"; st.textContent = t("needText"); return; }
  btn.disabled = true; st.className = "status"; st.textContent = t("saving");
  try {
    const ref = draft.id ? doc(db, "poems", draft.id) : doc(collection(db, "poems"));
    let { photoPath, photoUrl } = draft;
    if (draft.photoChanged) {
      if (photoPath) await deleteObject(storageRef(storage, photoPath)).catch(() => {});
      photoPath = ""; photoUrl = "";
      if (draft.photoBlob) {
        photoPath = `pages/${ref.id}-${Date.now()}.jpg`;
        const r = storageRef(storage, photoPath);
        await uploadBytes(r, draft.photoBlob, { contentType: "image/jpeg" });
        photoUrl = await getDownloadURL(r);
      }
    }
    const isPoem = draft.kind === "poem";
    // Only one featured poem at a time.
    if (isPoem && draft.featured)
      for (const p of entries.filter(p => p.featured && p.id !== ref.id)) await updateDoc(doc(db, "poems", p.id), { featured: false });
    const old = entries.find(p => p.id === ref.id);
    const now = new Date().toISOString();
    await setDoc(ref, {
      kind: draft.kind,
      title: draft.title.trim(), titleEn: draft.titleEn.trim(),
      body: draft.body.replace(/\s+$/, ""), bodyEn: draft.bodyEn.replace(/\s+$/, ""),
      category: isPoem ? draft.category : "",
      featured: isPoem && !!draft.featured,
      writtenOn: draft.writtenOn || "",
      photoPath, photoUrl,
      createdAt: old?.createdAt || now, updatedAt: now,
    });
    draft = null;
    go(`/poem/${ref.id}`);
  } catch (e) {
    console.error(e);
    btn.disabled = false; st.className = "status err";
    st.textContent = e?.code === "permission-denied" || e?.code === "storage/unauthorized" ? t("noWrite") : t("saveFail");
  }
}

async function removeEntry(id) {
  const e = entries.find(x => x.id === id);
  try {
    if (e?.photoPath) await deleteObject(storageRef(storage, e.photoPath)).catch(() => {});
    await deleteDoc(doc(db, "poems", id));
    go(e?.kind === "journal" ? "/journal" : "/poems");
  } catch { const a = $("#writer-actions"); if (a) a.insertAdjacentHTML("beforeend", `<span class="status err">${t("delFail")}</span>`); }
}

/* ---------- events ---------- */
document.addEventListener("click", async ev => {
  const nav = ev.target.closest("[data-go]");
  if (nav) {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return; // let the browser open a new tab
    ev.preventDefault();
    go(nav.dataset.go);
    return;
  }
  const b = ev.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.lang) {
    if (d.lang === lang) return;
    lang = d.lang;
    try { localStorage.setItem("lang", lang); } catch {}
    if (view.name === "edit") { paintChrome(); renderEditor(); }
    else if (editing === "about") { paintChrome(); renderAboutForm({ intro: $("#a-intro").value, bio: $("#a-bio").value }); }
    else if (editing === "contact") paintChrome();
    else render();
  }
  else if (d.rv) { readView = d.rv; try { localStorage.setItem("readView", readView); } catch {} renderEntry(); }
  else if (d.fav) {
    favs.has(d.fav) ? favs.delete(d.fav) : favs.add(d.fav);
    try { localStorage.setItem("favs", JSON.stringify([...favs])); } catch {}
    b.textContent = favs.has(d.fav) ? t("savedBtn") : t("save");
  }
  else if (d.copy) {
    const st = $("#share-status");
    try { await navigator.clipboard.writeText(d.copy); if (st) { st.className = "status"; st.textContent = d.copied || t("copied"); } }
    catch { if (st) { st.className = "status"; st.innerHTML = `${esc(t("copyFail"))}<br><span style="user-select:all;overflow-wrap:anywhere">${esc(d.copy)}</span>`; } }
  }
  else if (b.hasAttribute("data-reading")) { document.body.classList.add("reading"); scrollTo(0, 0); }
  else if (b.id === "exit-reading") document.body.classList.remove("reading");
  else if (d.edit) openEditor(d.edit);
  else if (b.hasAttribute("data-cancel-edit")) { const id = view.id; draft = null; go(id ? `/poem/${id}` : "/"); }
  else if (b.hasAttribute("data-ask-del")) {
    $("#writer-actions").innerHTML = `<div class="confirm">${t("delConfirm")} <button type="button" class="btn small danger" data-del="${esc(view.id)}">${t("delYes")}</button><button type="button" class="link" data-keep>${t("delNo")}</button></div>`;
  }
  else if (d.del) removeEntry(d.del);
  else if (b.hasAttribute("data-keep")) view.name === "edit" ? renderEditor() : renderEntry();
  else if (d.editSite) { editing = d.editSite; portraitDraft = null; render(); }
  else if (b.hasAttribute("data-cancel-site")) { editing = null; portraitDraft = null; render(); }
  else if (b.hasAttribute("data-signin")) {
    authNote = "";
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) {
      console.error(e);
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
      authNote = e?.code === "auth/configuration-not-found" || e?.code === "auth/operation-not-allowed" ? t("signInOff")
        : e?.code === "auth/unauthorized-domain" ? t("signInDomain")
        : e?.code === "auth/popup-blocked" ? t("signInPopup")
        : t("signInFail");
      view.name === "login" ? renderLogin() : paintChrome();
    }
  }
  else if (b.hasAttribute("data-signout")) { await signOut(auth); }
  else if (b.hasAttribute("data-new")) openEditor(null);
});
$("#new-btn").onclick = () => openEditor(null);

/* ---------- live data ---------- */
const rerender = () => { if (view.name !== "edit" && !editing) render(); else paintChrome(); };
render();

onSnapshot(query(collection(db, "poems"), orderBy("writtenOn", "desc")), snap => {
  entries = snap.docs.map(x => ({ id: x.id, ...x.data() }));
  loaded = true; rerender();
}, err => { console.error(err); loaded = true; rerender(); });
onSnapshot(doc(db, "site", "about"), snap => { about = { intro: "", bio: "", portraitUrl: "", portraitPath: "", ...(snap.exists() ? snap.data() : {}) }; rerender(); });
onSnapshot(doc(db, "site", "contact"), snap => { contact = { email: "", note: "", instagram: "", facebook: "", youtube: "", ...(snap.exists() ? snap.data() : {}) }; rerender(); });

onAuthStateChanged(auth, async u => {
  user = u; canWrite = false; authNote = "";
  if (u?.email) {
    try { canWrite = (await getDoc(doc(db, "editors", u.email))).exists(); } catch { canWrite = false; }
    if (!canWrite) authNote = t("notEditor", u.email);
  }
  if (!canWrite && view.name === "edit") { draft = null; go("/"); return; }
  if (!canWrite) editing = null;
  rerender();
});
