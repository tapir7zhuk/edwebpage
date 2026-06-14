// comments.js — викликати initComments('section', 'container-id') на кожній сторінці

async function initComments(section, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let currentUser = null;
  try {
    const r = await fetch('/api/auth/me');
    if (r.ok) currentUser = await r.json();
  } catch {}

  // ─── Завантаження та відображення ───
  async function load() {
    const res = await fetch(`/api/forum/${section}`);
    if (!res.ok) return;
    const comments = await res.json();
    render(comments);
  }

  function render(comments) {
    container.innerHTML = '';

    // Форма нового коментаря (тільки для авторизованих)
    if (currentUser) {
      container.insertAdjacentHTML('beforeend', `
        <div class="comment-form">
          <textarea id="new-text" placeholder="Ваш коментар..."></textarea>
          <button class="btn btn-primary" id="submit-btn">Надіслати</button>
          <div class="error-msg" id="submit-err"></div>
        </div>
      `);
      document.getElementById('submit-btn').addEventListener('click', submitComment);
    } else {
      container.insertAdjacentHTML('beforeend',
        `<p class="auth-hint"><a href="/login.html">Увійдіть</a>, щоб залишити коментар</p>`
      );
    }

    if (!comments.length) {
      container.insertAdjacentHTML('beforeend', '<p class="no-comments">Коментарів ще немає</p>');
      return;
    }

    comments.forEach(c => renderComment(c, container));
  }

  function renderComment(c, parent) {
    const el = document.createElement('div');
    el.className = 'comment-block';
    el.innerHTML = `
      <div class="comment-meta">${esc(c.username)} · ${formatDate(c.created_at)}</div>
      <div class="comment-text">${esc(c.text)}</div>
      ${currentUser ? `<button class="reply-toggle" data-id="${c.id}">↩ Відповісти</button>` : ''}
      <div class="reply-form" id="rf-${c.id}">
        <textarea class="reply-textarea" placeholder="Ваша відповідь..."></textarea>
        <button class="btn btn-primary btn-sm" style="font-size:0.8rem;padding:5px 12px" data-reply-to="${c.id}">Надіслати</button>
        <div class="error-msg"></div>
      </div>
      <div class="replies" id="rep-${c.id}"></div>
    `;
    parent.appendChild(el);

    // Відповіді (2-й рівень)
    const repContainer = el.querySelector(`#rep-${c.id}`);
    (c.replies || []).forEach(r => {
      const rel = document.createElement('div');
      rel.className = 'comment-block';
      rel.innerHTML = `
        <div class="comment-meta">${esc(r.username)} · ${formatDate(r.created_at)}</div>
        <div class="comment-text">${esc(r.text)}</div>
      `;
      repContainer.appendChild(rel);
    });

    // Toggle форми відповіді
    const toggle = el.querySelector('.reply-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const rf = document.getElementById(`rf-${c.id}`);
        rf.style.display = rf.style.display === 'block' ? 'none' : 'block';
      });
    }

    // Відправка відповіді
    const replyBtn = el.querySelector(`[data-reply-to="${c.id}"]`);
    if (replyBtn) {
      replyBtn.addEventListener('click', () => submitReply(c.id, el));
    }
  }

  // ─── Відправка головного коментаря ───
  async function submitComment() {
    const textarea = document.getElementById('new-text');
    const errEl    = document.getElementById('submit-err');
    const text = textarea.value.trim();
    if (!text) { errEl.textContent = 'Введіть текст'; return; }
    errEl.textContent = '';

    const res = await fetch(`/api/forum/${section}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (res.ok) {
      textarea.value = '';
      load();
    } else {
      const d = await res.json();
      errEl.textContent = d.error || 'Помилка';
    }
  }

  // ─── Відправка відповіді ───
  async function submitReply(parentId, commentEl) {
    const rf      = commentEl.querySelector('.reply-form');
    const textarea = rf.querySelector('textarea');
    const errEl   = rf.querySelector('.error-msg');
    const text = textarea.value.trim();
    if (!text) { errEl.textContent = 'Введіть текст'; return; }
    errEl.textContent = '';

    const res = await fetch(`/api/forum/${section}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, parent_id: parentId })
    });

    if (res.ok) {
      textarea.value = '';
      rf.style.display = 'none';
      load();
    } else {
      const d = await res.json();
      errEl.textContent = d.error || 'Помилка';
    }
  }

  // ─── Допоміжні функції ───
  function formatDate(s) {
    return new Date(s + 'Z').toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  load();
}
