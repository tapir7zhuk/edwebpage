// comments.js — викликати initComments('section', 'container-id') на кожній сторінці

async function initComments(section, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let currentUser = null;
  try {
    const r = await fetch('/api/auth/me');
    if (r.ok) currentUser = await r.json();
  } catch {}

  const isAdmin = currentUser && currentUser.role === 'admin';

  async function load() {
    const res = await fetch(`/api/forum/${section}`);
    if (!res.ok) return;
    const comments = await res.json();
    render(comments);
  }

  function render(comments) {
    container.innerHTML = '';

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
    const isOwner  = currentUser && currentUser.id === c.user_id;
    const isHidden = c.hidden === 1;

    const el = document.createElement('div');
    el.className = 'comment-block';
    el.id = `comment-${c.id}`;
    if (isHidden) el.style.opacity = '0.45';

    el.innerHTML = `
      <div class="comment-meta">
        ${esc(c.username)} · ${formatDate(c.created_at)}
        ${isHidden ? '<span style="color:#c00;font-size:0.75rem;margin-left:6px">[приховано]</span>' : ''}
      </div>
      <div class="comment-text" id="text-${c.id}">${esc(c.text)}</div>
      <div id="edit-form-${c.id}" style="display:none;margin-top:8px">
        <textarea class="reply-textarea" id="edit-ta-${c.id}">${esc(c.text)}</textarea>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn btn-primary" style="font-size:0.8rem;padding:5px 12px" onclick="window._saveEdit(${c.id})">Зберегти</button>
          <button class="btn" style="font-size:0.8rem;padding:5px 12px" onclick="window._cancelEdit(${c.id})">Скасувати</button>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
        ${currentUser ? `<button class="reply-toggle" data-id="${c.id}">↩ Відповісти</button>` : ''}
        ${isOwner ? `<button class="reply-toggle" onclick="window._editComment(${c.id})">Редагувати</button>` : ''}
        ${isAdmin ? `<button class="reply-toggle" onclick="window._toggleHide(${c.id}, ${isHidden})">
          ${isHidden ? 'Показати' : 'Приховати'}
        </button>` : ''}
        ${(isAdmin || isOwner) ? `<button class="reply-toggle" style="color:#c00" onclick="window._deleteComment(${c.id})">Видалити</button>` : ''}
      </div>
      <div class="reply-form" id="rf-${c.id}">
        <textarea class="reply-textarea" placeholder="Ваша відповідь..."></textarea>
        <button class="btn btn-primary btn-sm" style="font-size:0.8rem;padding:5px 12px" data-reply-to="${c.id}">Надіслати</button>
        <div class="error-msg"></div>
      </div>
      <div class="replies" id="rep-${c.id}"></div>
    `;
    parent.appendChild(el);

    const repContainer = el.querySelector(`#rep-${c.id}`);
    (c.replies || []).forEach(r => {
      const isReplyOwner  = currentUser && currentUser.id === r.user_id;
      const isReplyHidden = r.hidden === 1;
      const rel = document.createElement('div');
      rel.className = 'comment-block';
      rel.id = `comment-${r.id}`;
      if (isReplyHidden) rel.style.opacity = '0.45';
      rel.innerHTML = `
        <div class="comment-meta">
          ${esc(r.username)} · ${formatDate(r.created_at)}
          ${isReplyHidden ? '<span style="color:#c00;font-size:0.75rem;margin-left:6px">[приховано]</span>' : ''}
        </div>
        <div class="comment-text" id="text-${r.id}">${esc(r.text)}</div>
        <div id="edit-form-${r.id}" style="display:none;margin-top:8px">
          <textarea class="reply-textarea" id="edit-ta-${r.id}">${esc(r.text)}</textarea>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn btn-primary" style="font-size:0.8rem;padding:5px 12px" onclick="window._saveEdit(${r.id})">Зберегти</button>
            <button class="btn" style="font-size:0.8rem;padding:5px 12px" onclick="window._cancelEdit(${r.id})">Скасувати</button>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
          ${isReplyOwner ? `<button class="reply-toggle" onclick="window._editComment(${r.id})">Редагувати</button>` : ''}
          ${isAdmin ? `<button class="reply-toggle" onclick="window._toggleHide(${r.id}, ${isReplyHidden})">
            ${isReplyHidden ? 'Показати' : 'Приховати'}
          </button>` : ''}
          ${(isAdmin || isReplyOwner) ? `<button class="reply-toggle" style="color:#c00" onclick="window._deleteComment(${r.id})">Видалити</button>` : ''}
        </div>
      `;
      repContainer.appendChild(rel);
    });

    const toggle = el.querySelector('.reply-toggle[data-id]');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const rf = document.getElementById(`rf-${c.id}`);
        rf.style.display = rf.style.display === 'block' ? 'none' : 'block';
      });
    }

    const replyBtn = el.querySelector(`[data-reply-to="${c.id}"]`);
    if (replyBtn) {
      replyBtn.addEventListener('click', () => submitReply(c.id, el));
    }
  }

  window._editComment = function(id) {
    document.getElementById(`text-${id}`).style.display = 'none';
    document.getElementById(`edit-form-${id}`).style.display = 'block';
  };

  window._cancelEdit = function(id) {
    document.getElementById(`text-${id}`).style.display = 'block';
    document.getElementById(`edit-form-${id}`).style.display = 'none';
  };

  window._saveEdit = async function(id) {
    const text = document.getElementById(`edit-ta-${id}`).value.trim();
    if (!text) return;
    const res = await fetch(`/api/forum/comment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (res.ok) load();
  };

  window._deleteComment = async function(id) {
    if (!confirm('Видалити коментар?')) return;
    const res = await fetch(`/api/forum/comment/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  window._toggleHide = async function(id, hidden) {
    const res = await fetch(`/api/forum/comment/${id}/hide`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: !hidden })
    });
    if (res.ok) load();
  };

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

  async function submitReply(parentId, commentEl) {
    const rf       = commentEl.querySelector('.reply-form');
    const textarea = rf.querySelector('textarea');
    const errEl    = rf.querySelector('.error-msg');
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