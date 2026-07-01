/**
 * js/chat-widget.js - Crystal Cosmetics on-site AI assistant (floating widget)
 *
 * Talks to /api/chat (Vercel serverless function). Chat history lives only
 * in memory for this page view - nothing persisted client-side. When the
 * assistant decides booking is the next step, it shows a "Book Now" button
 * that opens Crystal's real Timely booking page in a new tab - this widget
 * never creates a booking itself.
 */
(function () {
  var STATE = { open: false, sending: false, history: [] };

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function injectStyles() {
    var css = ''
      + '.cc-chat-launcher{position:fixed;right:22px;bottom:22px;z-index:9999;width:60px;height:60px;border-radius:50%;'
      + 'background:linear-gradient(135deg,var(--rose,#C08B7A),var(--gold,#BFA07A));border:none;cursor:pointer;'
      + 'box-shadow:0 6px 20px rgba(28,20,16,.28);display:flex;align-items:center;justify-content:center;transition:transform .18s ease;}'
      + '.cc-chat-launcher:hover{transform:scale(1.06);}'
      + '.cc-chat-launcher svg{width:26px;height:26px;fill:#fff;}'
      + '.cc-chat-panel{position:fixed;right:22px;bottom:94px;z-index:9999;width:340px;max-width:calc(100vw - 32px);'
      + 'height:460px;max-height:calc(100vh - 140px);background:var(--ivory,#FAF8F4);border-radius:16px;'
      + 'box-shadow:0 16px 48px rgba(28,20,16,.32);display:none;flex-direction:column;overflow:hidden;'
      + 'font-family:inherit;border:1px solid rgba(191,160,122,.35);}'
      + '.cc-chat-panel.cc-open{display:flex;}'
      + '.cc-chat-head{background:var(--charcoal,#2A2118);color:var(--ivory,#FAF8F4);padding:14px 16px;'
      + 'display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}'
      + '.cc-chat-head strong{font-size:14px;letter-spacing:.02em;}'
      + '.cc-chat-head span{display:block;font-size:11px;opacity:.7;margin-top:2px;}'
      + '.cc-chat-close{background:none;border:none;color:var(--ivory,#FAF8F4);opacity:.7;cursor:pointer;font-size:18px;line-height:1;padding:4px;}'
      + '.cc-chat-close:hover{opacity:1;}'
      + '.cc-chat-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--cream,#F2EBE0);}'
      + '.cc-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;}'
      + '.cc-msg-bot{align-self:flex-start;background:#fff;color:var(--charcoal,#2A2118);border-bottom-left-radius:4px;'
      + 'box-shadow:0 1px 3px rgba(28,20,16,.08);}'
      + '.cc-msg-user{align-self:flex-end;background:var(--rose,#C08B7A);color:#fff;border-bottom-right-radius:4px;}'
      + '.cc-book-btn{align-self:flex-start;display:inline-block;margin-top:2px;background:var(--gold,#BFA07A);color:#fff;'
      + 'text-decoration:none;font-size:12.5px;font-weight:600;letter-spacing:.02em;padding:8px 14px;border-radius:20px;}'
      + '.cc-book-btn:hover{opacity:.9;}'
      + '.cc-chat-typing{align-self:flex-start;font-size:12px;color:var(--mid,#6B5C50);padding:2px 4px;}'
      + '.cc-chat-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(191,160,122,.3);background:#fff;flex-shrink:0;}'
      + '.cc-chat-input{flex:1;border:1px solid rgba(107,92,80,.25);border-radius:20px;padding:9px 14px;font-size:13.5px;'
      + 'outline:none;font-family:inherit;}'
      + '.cc-chat-input:focus{border-color:var(--rose,#C08B7A);}'
      + '.cc-chat-send{background:var(--charcoal,#2A2118);color:#fff;border:none;border-radius:50%;width:36px;height:36px;'
      + 'flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;}'
      + '.cc-chat-send:disabled{opacity:.5;cursor:default;}'
      + '.cc-chat-send svg{width:16px;height:16px;fill:#fff;}'
      + '@media (max-width:420px){.cc-chat-panel{right:16px;left:16px;width:auto;}}';
    document.head.appendChild(el('style', { html: css }));
  }

  function scrollToBottom(body) { body.scrollTop = body.scrollHeight; }

  function addMessage(body, text, who) {
    var msg = el('div', { class: 'cc-msg ' + (who === 'user' ? 'cc-msg-user' : 'cc-msg-bot') });
    msg.textContent = text;
    body.appendChild(msg);
    scrollToBottom(body);
    return msg;
  }

  function addBookButton(body, service, url) {
    var link = el('a', {
      class: 'cc-book-btn',
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      html: 'Book ' + service + ' →',
    });
    body.appendChild(link);
    scrollToBottom(body);
  }

  async function sendMessage(text, body) {
    STATE.history.push({ role: 'user', content: text });
    addMessage(body, text, 'user');

    var typing = el('div', { class: 'cc-chat-typing' });
    typing.textContent = 'Typing…';
    body.appendChild(typing);
    scrollToBottom(body);

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: STATE.history }),
      });
      var data = await res.json();
      typing.remove();

      if (!res.ok || data.error) {
        addMessage(body, data.error || "Sorry, something went wrong. Please try again shortly.", 'bot');
        return;
      }
      STATE.history.push({ role: 'assistant', content: data.reply });
      addMessage(body, data.reply, 'bot');
      if (data.bookService && data.bookingUrl) {
        addBookButton(body, data.bookService, data.bookingUrl);
      }
    } catch (err) {
      typing.remove();
      addMessage(body, "Sorry, I'm having trouble connecting. Please try again, or call 0499 453 555.", 'bot');
    }
  }

  function build() {
    injectStyles();

    var launcher = el('button', {
      class: 'cc-chat-launcher',
      'aria-label': 'Chat with Crystal Cosmetics',
      html: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
    });

    var body = el('div', { class: 'cc-chat-body' });
    var input = el('input', {
      class: 'cc-chat-input',
      type: 'text',
      placeholder: 'Ask a question or say what you’d like to book…',
      'aria-label': 'Message',
    });
    var sendBtn = el('button', {
      class: 'cc-chat-send',
      'aria-label': 'Send',
      html: '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>',
    });

    var panel = el('div', { class: 'cc-chat-panel' }, [
      el('div', { class: 'cc-chat-head' }, [
        el('div', {}, [
          el('strong', { html: 'Crystal Cosmetics' }),
          el('span', { html: 'AI assistant · usually replies instantly' }),
        ]),
        el('button', { class: 'cc-chat-close', 'aria-label': 'Close chat', html: '✕' }),
      ]),
      body,
      el('div', { class: 'cc-chat-foot' }, [input, sendBtn]),
    ]);

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    addMessage(
      body,
      "Hi! I'm Crystal Cosmetics' assistant. Ask me about lip blushing, powder brows, training, pricing, or anything else — I can also help you find the right service to book.",
      'bot'
    );

    function toggle(open) {
      STATE.open = open;
      panel.classList.toggle('cc-open', open);
      if (open) setTimeout(function () { input.focus(); }, 50);
    }

    launcher.addEventListener('click', function () { toggle(!STATE.open); });
    panel.querySelector('.cc-chat-close').addEventListener('click', function () { toggle(false); });

    function submit() {
      var text = input.value.trim();
      if (!text || STATE.sending) return;
      input.value = '';
      STATE.sending = true;
      sendBtn.disabled = true;
      sendMessage(text, body).finally(function () {
        STATE.sending = false;
        sendBtn.disabled = false;
      });
    }

    sendBtn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') toggle(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
