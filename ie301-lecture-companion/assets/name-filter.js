/* GENERATED COPY - do not edit by hand.
   Source of truth: studio_dev/name-filter.js
   Rebuild with: python -X utf8 studio_dev/build_quiz_bank.py */
/* Name filter for the end-of-lesson quiz.

   WHY this exists: student-typed names are shown on a lecture-hall wall. The
   database is publicly writable by design, so the only thing standing between
   a rude word and the projector is this check plus the instructor's
   click-to-remove.

   WHERE it runs: on the student's phone, when they type their name. A blocked
   name is refused at entry with "pick a different name" and nothing is stored,
   so the projector never sees it. The instructor's remove control stays as the
   backstop, because no list is ever complete.

   WHY a false positive is cheap here: the student simply types another name.
   Nobody is thrown out of the quiz and no score is lost. That trade-off is the
   reason this leans strict on unambiguous strings and cautious on short roots.
*/
(() => {
  'use strict';

  // Fold the Turkish alphabet and the usual character games onto plain ASCII,
  // so "ş", "$", "5" and "s" all end up the same letter.
  const FOLD = {
    'ç':'c','ğ':'g','ı':'i','İ':'i','i':'i','ö':'o','ş':'s','ü':'u','â':'a','î':'i','û':'u',
    '0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','9':'g','@':'a','$':'s','!':'i','*':'','+':'t'
  };

  // Collapse runs of the same letter: "siiiktir" must not buy anything.
  // Written as a loop on purpose; a regex backreference here keeps getting
  // mangled by the layers of escaping between the editor and this file.
  function squeeze(text) {
    let out = '';
    for (const ch of text) if (ch !== out[out.length - 1]) out += ch;
    return out;
  }

  function normalize(raw) {
    let text = String(raw ?? '');
    // Uppercase Turkish İ/I must be handled before any toLowerCase call, which
    // would otherwise produce a combining dot and break the match.
    text = text.replace(/İ/g, 'i').replace(/I/g, 'i').replace(/Ş/g, 's').replace(/Ç/g, 'c')
               .replace(/Ğ/g, 'g').replace(/Ö/g, 'o').replace(/Ü/g, 'u');
    text = text.toLowerCase();
    text = [...text].map(ch => (ch in FOLD ? FOLD[ch] : ch)).join('');
    text = text.normalize('NFD').replace(/[̀-ͯ]/g, '');   // strip leftover accents
    text = text.replace(/[^a-z]+/g, ' ').trim();
    // "siiiktir" and "s i k t i r" should not buy anything, so squeeze runs of
    // the same letter and keep a spaced copy for whole-word checks.
    const squeezed = squeeze(text);
    return { spaced: squeezed, joined: squeezed.replace(/ /g, '') };
  }

  // Long enough to be unmistakable, so a substring match is safe.
  const CONTAINS = [
    'orospu','oruspu','amcik','amina','aminako','anasini','ananisik','avradini',
    'yarrak','sikey','sikim','siktir','sikik','sikici','sikise','siktim','siktig',
    'gotver','gotlek','gotunu','ibne','pezevenk','kahpe','tassak','gavat','kevase',
    'yavsak','dallama','pust','puşt','amcik','amugaa','sirkaf',
    'fuck','shit','bitch','cunt','asshole','motherfuck','bastard','nigger','nigga',
    'penis','vagina','pornhub','porno','whore','slut','dickhead','wanker'
  ];

  // Short roots that appear inside perfectly ordinary words: "beşiktaş" holds
  // "sik", "götür" holds "göt", "koyarak" holds "yarak". These match only as a
  // whole word, never as a fragment.
  const WORDS = [
    'am','sik','got','pic','oc','oç','amk','aq','mk','awk','yarak','tas','sg',
    'dick','ass','cum','sex','porn','wtf','fck'
  ];

  // The input arrives squeezed, so the list must be squeezed the same way or
  // "taşşak" and "asshole" would slip past their own entries.
  const CONTAINS_SQUEEZED = [...new Set(CONTAINS.map(squeeze))];

  function check(raw) {
    const { spaced, joined } = normalize(raw);
    if (!joined) return { ok: false, reason: 'empty' };
    for (const bad of CONTAINS_SQUEEZED) {
      if (joined.includes(bad)) return { ok: false, reason: 'blocked' };
    }
    // Whole-word roots are tested token by token AND against the whole name with
    // its separators removed, so "a.m.", "S İ K" and "a q" are not a way around
    // the list. The cost is that a student typing bare initials that happen to
    // spell one of these has to type something else.
    const tokens = spaced.split(' ').filter(Boolean);
    if (WORDS.includes(joined)) return { ok: false, reason: 'blocked' };
    for (const token of tokens) {
      if (WORDS.includes(token)) return { ok: false, reason: 'blocked' };
    }
    return { ok: true };
  }

  const api = { check, normalize, CONTAINS, WORDS };
  if (typeof window !== 'undefined') window.NAME_FILTER = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
