/* CampusResolve classification engine.
   Transparent, deterministic baseline. No external API or paid model required. */
(function (root) {
  "use strict";

  const DEPARTMENTS = ["Plumbing", "Electrical", "Wi-Fi", "Mess", "Academic", "Other"];
  const LEXICON = {
    "Plumbing": {
      strong: ["tap", "leak", "leaking", "leakage", "pipe", "plumber", "flush", "drain", "drainage", "nali", "nal", "basin", "shower", "water motor", "paani supply", "water supply", "toilet seat", "commode", "sewer", "sewage"],
      medium: ["water", "paani", "washroom", "bathroom", "toilet", "sink", "tank", "motor", "geiser", "geyser", "shower", "pipeline", "overflow", "faucet"],
      phrases: ["tap is dripping", "tap is leaking", "paani nahi aa raha", "pani nahi aa raha", "paani nhi aa raha", "water nahi aa raha", "water supply band", "flush nahi ho raha", "flush nhi ho raha", "pipe toot gaya", "pipe tut gaya"]
    },
    "Electrical": {
      strong: ["electricity", "electrical", "electrician", "bijli", "wiring", "wire", "socket", "short circuit", "short-circuit", "sparks", "spark", "shock", "fuse", "mcb", "switchboard", "power outage"],
      medium: ["light", "bulb", "fan", "switch", "plug", "current", "power", "ac", "air conditioner", "charger point", "tube light", "inverter", "voltage"],
      phrases: ["light nahi chal rahi", "light nhi chal rahi", "fan nahi chal raha", "fan nhi chal raha", "bijli nahi hai", "bijli nhi aa rahi", "power cut", "current lag raha", "switch kaam nahi kar raha"]
    },
    "Wi-Fi": {
      strong: ["wifi", "wi-fi", "internet", "router", "broadband", "ethernet", "hotspot", "lan", "network outage"],
      medium: ["network", "signal", "connection", "connectivity", "bandwidth", "online", "data"],
      phrases: ["net nahi chal raha", "net nhi chal raha", "internet nahi chal raha", "internet nhi chal raha", "wifi down", "wifi slow", "wifi password", "no internet", "connection drop", "not connecting"]
    },
    "Mess": {
      strong: ["mess", "canteen", "food poisoning", "stale", "rotten", "undercooked", "raw food", "insect", "cockroach", "hygiene", "contamination"],
      medium: ["food", "khana", "khaana", "roti", "sabzi", "dal", "daal", "breakfast", "lunch", "dinner", "meal", "menu", "taste", "thanda", "cold food", "plate", "water cooler"],
      phrases: ["khana thanda", "khana kharab", "food quality", "food is cold", "less quantity", "mess timing", "mess food", "khaane mein", "khane me"]
    },
    "Academic": {
      strong: ["attendance", "marks", "result", "examination", "exam", "grade", "revaluation", "reappear", "backlog", "internals", "internal marks", "registration", "course registration", "timetable", "syllabus", "scholarship", "transcript"],
      medium: ["faculty", "teacher", "professor", "class", "lecture", "assignment", "course", "subject", "portal", "semester", "schedule", "evaluation", "certificate", "fee receipt"],
      phrases: ["attendance galat", "marks galat", "result not updated", "result nahi aaya", "result nhi aaya", "teacher did not", "class cancelled", "assignment submission", "exam form"]
    }
  };

  const HIGH = ["urgent", "emergency", "immediately", "asap", "danger", "dangerous", "fire", "smoke", "electric shock", "shock lag", "sparks", "flood", "flooding", "overflowing", "injury", "unsafe", "critical", "jaldi", "turant", "abhi", "right now", "cannot use", "unusable", "burst pipe"];
  const MEDIUM = ["since yesterday", "3 days", "three days", "2 days", "two days", "kal se", "parso se", "teen din", "3 din", "not working", "band hai", "broken", "problem", "issue", "leak", "nahi chal", "nhi chal", "not available", "slow", "missing", "leaking", "thanda", "kharab", "cold food", "bad quality", "disconnecting", "keeps disconnecting"];
  const LOW = ["suggestion", "request", "please check", "when possible", "minor", "feedback", "improve", "improvement", "query", "information"];

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[\u200b-\u200d]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }
  function containsTerm(text, term) {
    const hay = " " + normalize(text) + " ";
    const needle = " " + normalize(term) + " ";
    return hay.includes(needle);
  }
  function countMatches(text, terms, weight) {
    let score = 0, hits = [];
    for (const term of terms) {
      if (containsTerm(text, term)) { score += weight; hits.push(term); }
    }
    return { score, hits };
  }
  function extractLocation(text) {
    const s = String(text || "").replace(/\s+/g, " ");
    let block = (s.match(/\b([a-z])\s*[-]?\s*block\b/i) || [])[1];
    if (!block) block = (s.match(/\b(?:block|blk)\s*[-:#]?\s*([a-z0-9][a-z0-9-]*)\b/i) || [])[1];
    if (block && /^\d+(st|nd|rd|th)$/i.test(block)) block = undefined;
    let floor = (s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:floor|flr|floar|manzil)\b/i) || [])[1];
    if (!floor) floor = (s.match(/\b(?:floor|flr|floar|manzil)\s*[-:#]?\s*(\d{1,2})\b/i) || [])[1];
    const room = (s.match(/\b(?:room|rm|kamra)\s*[-:#]?\s*([a-z]?\d+[a-z]?)\b/i) || [])[1];
    return {
      block: block ? "Block " + block.toUpperCase() : "Not specified",
      floor: floor ? "Floor " + floor : "Not specified",
      room: room ? "Room " + room.toUpperCase() : "Not specified"
    };
  }
  function detectUrgency(text) {
    if (HIGH.some(t => containsTerm(text, t))) return "High";
    if (MEDIUM.some(t => containsTerm(text, t))) return "Medium";
    if (LOW.some(t => containsTerm(text, t))) return "Low";
    return "Low";
  }
  function classify(text) {
    const raw = String(text || "").trim();
    const scores = {}, evidence = {};
    for (const dept of DEPARTMENTS) {
      scores[dept] = 0; evidence[dept] = [];
      if (!LEXICON[dept]) continue;
      const a = countMatches(raw, LEXICON[dept].strong, 4);
      const b = countMatches(raw, LEXICON[dept].medium, 1.5);
      const c = countMatches(raw, LEXICON[dept].phrases, 3);
      scores[dept] = a.score + b.score + c.score;
      evidence[dept] = [...a.hits, ...b.hits, ...c.hits];
    }

    // Phrase-level contextual boosts reduce common cross-category confusion.
    const n = normalize(raw);
    if (/\b(washroom|bathroom|toilet)\b/.test(n) && /\b(tap|flush|pipe|leak|water|paani|pani|drain)\b/.test(n)) scores.Plumbing += 3;
    if (/\b(fan|light|bulb|switch)\b/.test(n) && /\b(not working|nahi|nhi|band|flicker|spark)\b/.test(n)) scores.Electrical += 2;
    if (/\b(wifi|internet|net)\b/.test(n) && /\b(slow|down|not working|nahi|nhi|disconnect)\b/.test(n)) scores["Wi-Fi"] += 3;
    if (/\b(food|khana|khaana|mess)\b/.test(n) && /\b(cold|thanda|stale|kharab|quality|taste|dirty)\b/.test(n)) scores.Mess += 2;
    if (/\b(attendance|marks|result|exam)\b/.test(n) && /\b(wrong|galat|missing|update|not showing)\b/.test(n)) scores.Academic += 2;

    // Negation can reverse a keyword ("no issue with Wi-Fi, but tap is leaking").
    // Do not blindly award the department score when its keyword is explicitly negated.
    const negations = ["no", "not", "never", "nahi", "nhi", "na"];
    for (const dept of DEPARTMENTS) {
      if (!LEXICON[dept]) continue;
      const terms = [...LEXICON[dept].strong, ...LEXICON[dept].medium];
      let penalty = 0;
      for (const term of terms) {
        const t = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp("\\b(?:" + negations.join("|") + ")\\s+(?:\\w+\\s+){0,2}" + t + "\\b");
        if (re.test(n)) penalty += 2;
      }
      scores[dept] = Math.max(0, scores[dept] - penalty);
    }

    const ranked = Object.entries(scores).sort((a,b) => b[1]-a[1]);
    const best = ranked[0], second = ranked[1];
    const total = ranked.reduce((sum, x) => sum + x[1], 0);
    const margin = best[1] - second[1];
    let department = best[1] === 0 ? "Other" : best[0];
    // Conservative confidence: ambiguous or weak matches are reviewed.:)
    let confidence = best[1] === 0 ? 35 :
      Math.round(Math.min(96, 42 + Math.min(best[1], 12) * 3.2 + Math.max(0, margin) * 2.2));
    if (best[1] > 0 && margin <= 1) confidence = Math.min(confidence, 58);
    if (best[1] <= 2) confidence = Math.min(confidence, 55);
    if (department === "Other") confidence = 35;
    return {
      department, confidence, scores, evidence: evidence[department] || [],
      urgency: detectUrgency(raw), location: extractLocation(raw),
      needsReview: confidence < 65,
      method: "transparent-rule-engine"
    };
  }

  const api = { DEPARTMENTS, classify, extractLocation, detectUrgency, normalize };
  root.CampusClassifier = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
