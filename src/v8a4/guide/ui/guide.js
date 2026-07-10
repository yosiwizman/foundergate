// V8-A4 Project Guide — chat panel (read-only). Renders answers from /api/guide/ask.
// Untrusted file excerpts are rendered VERBATIM inside a quoted block, never as HTML
// and never as instructions. Drafts render as copyable cards. Nothing is ever sent.
"use strict";

const chat = document.getElementById("chat");
const form = document.getElementById("ask");
const input = document.getElementById("q");
const chips = document.getElementById("chips");

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text; // textContent — never innerHTML (no injection)
  return e;
}

function badge(dataClass) {
  const safe = dataClass === "PUBLIC_SAFE" || dataClass === "PROJECT_INTERNAL";
  const b = el("span", "badge " + (safe ? "ok" : "lock"), dataClass);
  return b;
}

function addMe(text) {
  chat.appendChild(el("div", "msg me", text));
  chat.scrollTop = chat.scrollHeight;
}

function addGuide(reply) {
  const kind = reply.kind === "refusal" ? "refusal" : reply.blocked ? "blocked" : "";
  const box = el("div", "msg guide " + kind);
  box.appendChild(el("div", "text", reply.text));

  // data-class badge when the reply is about a specific file
  if (reply.data_class) box.querySelector(".text").appendChild(badge(reply.data_class));

  // untrusted file excerpt — shown verbatim, clearly labelled, never executed
  if (reply.quoted && reply.quoted.content) {
    const q = el("div", "quote");
    q.appendChild(el("div", "qhead", "Quoted from the file — shown exactly, not acted on:"));
    const pre = el("pre", null, reply.quoted.content + (reply.quoted.truncated ? "\n…(shortened)" : ""));
    q.appendChild(pre);
    box.appendChild(q);
  }

  // draft card — copyable, never sent or routed
  if (reply.card) {
    const d = el("div", "draft");
    const head = el("div", "dhead");
    head.appendChild(el("span", null, reply.card.title + " · draft only, not sent"));
    const copy = el("button", "copy", "Copy");
    copy.addEventListener("click", () => {
      navigator.clipboard && navigator.clipboard.writeText(reply.card.body);
      copy.textContent = "Copied";
      setTimeout(() => (copy.textContent = "Copy"), 1200);
    });
    head.appendChild(copy);
    d.appendChild(head);
    d.appendChild(el("pre", null, reply.card.body));
    box.appendChild(d);
  }

  // citations — where the answer came from (honest sourcing)
  if (reply.citations && reply.citations.length) {
    const c = el("div", "cite");
    c.appendChild(el("b", null, "Source: "));
    c.appendChild(document.createTextNode(reply.citations.join(" · ")));
    box.appendChild(c);
  }

  chat.appendChild(box);
  chat.dataset.ready = "1";
  // smoke/test stability hooks: how many guide replies, and the last reply's kind.
  document.body.dataset.replies = String(chat.querySelectorAll(".msg.guide").length);
  document.body.dataset.lastKind = reply.kind === "refusal" ? "refusal" : reply.blocked ? "blocked" : reply.card ? "draft" : "explain";
  chat.scrollTop = chat.scrollHeight;
}

async function ask(question) {
  addMe(question);
  try {
    const r = await fetch("/api/guide/ask", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    });
    addGuide(await r.json());
  } catch (e) {
    addGuide({ kind: "explain", text: "I couldn't reach the project just now. Nothing changed.", citations: [] });
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  ask(q);
});

// capability chips
fetch("/api/guide/capabilities").then((r) => r.json()).then((d) => {
  for (const c of (d.capabilities || [])) {
    const chip = el("button", "chip", c.label);
    chip.type = "button";
    chip.addEventListener("click", () => ask(c.label));
    chips.appendChild(chip);
  }
}).catch(() => {});
