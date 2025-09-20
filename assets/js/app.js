const backend = window.mockBackend || null;

const state = {
  currentUser: null, // Will be set when backend loads
  filters: {
    category: "all",
    tag: null
  }
};

const storageKeys = {
  theme: "aqala-theme"
};

const applyTheme = (theme) => {
  if (!theme) return;
  const supported = ["theme-light", "theme-dark", "theme-sepia"];
  const normalized = theme.startsWith("theme-") ? theme : `theme-${theme}`;
  const resolved = supported.includes(normalized) ? normalized : "theme-light";
  document.body.classList.remove(...supported);
  document.body.classList.add(resolved);
  try {
    window.localStorage.setItem(storageKeys.theme, resolved);
  } catch (error) {
    /* ignore */
  }
};

const initThemeToggle = () => {
  let stored = "theme-light";
  try {
    stored = window.localStorage.getItem(storageKeys.theme) || stored;
  } catch (error) {
    stored = "theme-light";
  }
  applyTheme(stored);

  document
    .querySelectorAll("#themeToggle, #articleThemeToggle, #adminThemeToggle")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const isDark = document.body.classList.contains("theme-dark");
        applyTheme(isDark ? "theme-light" : "theme-dark");
      });
    });
};

const serializeFormToJSON = (form) => {
  const formData = new FormData(form);
  const payload = {};
  formData.forEach((value, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const current = payload[key];
      if (Array.isArray(current)) {
        current.push(value);
      } else {
        payload[key] = [current, value];
      }
    } else {
      payload[key] = value;
    }
  });
  return payload;
};

const ensureStatusElement = (form) => {
  let status = form.querySelector(".form-status");
  if (!status) {
    status = document.createElement("p");
    status.className = "form-status";
    status.hidden = true;
    form.appendChild(status);
  }
  return status;
};

const showFormStatus = (form, message = "", type = "success") => {
  const status = ensureStatusElement(form);
  if (!message) {
    status.hidden = true;
    status.textContent = "";
    status.classList.remove("is-success", "is-error");
    return;
  }
  status.hidden = false;
  status.textContent = message;
  status.classList.toggle("is-success", type === "success");
  status.classList.toggle("is-error", type === "error");
};

const toggleButtonState = (button, loading) => {
  if (!button) return;
  if (!button.dataset.original) {
    button.dataset.original = button.textContent.trim();
  }
  if (loading) {
    button.disabled = true;
    button.classList.add("is-loading");
    if (button.dataset.loading) {
      button.textContent = button.dataset.loading;
    }
  } else {
    button.disabled = false;
    button.classList.remove("is-loading");
    button.textContent = button.dataset.original;
  }
};

const popupManager = (() => {
  let activeId = null;

  const setVisibility = (id, show) => {
    const popup = document.getElementById(id);
    if (!popup) return;
    popup.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) {
      activeId = id;
      popup.querySelector("input, textarea, button")?.focus({ preventScroll: true });
    } else if (activeId === id) {
      activeId = null;
    }
  };

  document.addEventListener("click", (event) => {
    if (event.target.classList?.contains("popup")) {
      setVisibility(event.target.id, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeId) {
      setVisibility(activeId, false);
    }
  });

  return {
    open: (id) => setVisibility(id, true),
    close: (id) => setVisibility(id, false)
  };
})();

const updateAuthState = () => {
  state.currentUser = window.mockBackend ? window.mockBackend.getCurrentUser() : null;
};

const requireAuth = () => {
  if (state.currentUser) return true;
  popupManager.open("authPopup");
  const status = document.querySelector("#authPopup .form-status");
  if (status) {
    status.textContent = "يرجى تسجيل الدخول للوصول إلى لوحة التحكم";
    status.classList.add("is-error");
    status.hidden = false;
  }
  return false;
};

const handleFormSubmission = async (form) => {
  const endpoint = form.dataset.endpoint || form.getAttribute("action") || "";
  const method = (form.dataset.method || form.getAttribute("method") || "POST").toUpperCase();
  const encoding = (form.dataset.encoding || "json").toLowerCase();
  const payload = encoding === "form-data" ? new FormData(form) : serializeFormToJSON(form);

  const invokeBackend = () => {
    if (!window.mockBackend || !endpoint.startsWith("/")) {
      throw new Error("تعذّر الاتصال بالخادم المحلي");
    }
    const plainPayload = payload instanceof FormData ? Object.fromEntries(payload) : payload;
    return window.mockBackend.processRequest(endpoint, method, plainPayload);
  };

  if (!endpoint) {
    throw new Error("لم يتم تحديد مسار الإرسال");
  }

  if (backend && endpoint.startsWith("/")) {
    return Promise.resolve(invokeBackend());
  }

  const options = {
    method,
    headers: {
      Accept: "application/json, text/plain, */*"
    }
  };

  if (payload instanceof FormData) {
    options.body = payload;
  } else {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(endpoint, options);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const error = new Error(data?.message || "تعذّر إتمام الطلب");
      error.payload = data;
      throw error;
    }
    return data;
  } catch (error) {
    if (backend && endpoint.startsWith("/")) {
      return Promise.resolve(invokeBackend());
    }
    if (error.message === "Failed to fetch") {
      throw new Error("تعذّر الاتصال بالخادم. تأكد من تشغيله أو جرّب إعادة تحميل الصفحة.");
    }
    throw error;
  }
};
  if (payload instanceof FormData) {
    options.body = payload;
  } else {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(endpoint, options);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(data?.message || "تعذّر إتمام الطلب");
    error.payload = data;
    throw error;
  }
  return data;
};

const updateAuthUI = () => {
  const authButtons = Array.from(document.querySelectorAll(".auth-btn"));
  const logoutButtons = document.querySelectorAll("[data-action='logout']");
  const adminLabel = document.querySelector(".admin-user span");

  authButtons
    .filter((btn) => !btn.closest(".admin-user"))
    .forEach((btn) => {
      if (state.currentUser) {
        btn.textContent = "لوحة التحكم";
        btn.dataset.action = "open-dashboard";
        btn.removeAttribute("data-popup-target");
      } else {
        btn.textContent = "دخول / تسجيل";
        btn.dataset.action = "open-dashboard";
      }
    });

  if (state.currentUser) {
    logoutButtons.forEach((btn) => btn.removeAttribute("hidden"));
    if (adminLabel) {
      adminLabel.textContent = `مرحباً، ${state.currentUser.name} (${state.currentUser.role === "admin" ? "مدير" : state.currentUser.role})`;
    }
  } else {
    logoutButtons.forEach((btn) => btn.setAttribute("hidden", "hidden"));
    if (adminLabel) {
      adminLabel.textContent = "يرجى تسجيل الدخول";
    }
  }
};
const renderArticleCard = (article) => {
  const published = new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(article.publishedAt));
  const commentsLabel = article.comments === 1 ? "تعليق" : "تعليقات";
  return `
    <article class="article-card" data-category="${article.category}" data-tags="${(article.tags || []).join(",")}">
      <img src="${article.cardImage}" alt="${article.title}" class="article-image" loading="lazy">
      <div class="article-content">
        <h3 class="article-title">${article.title}</h3>
        <p class="article-meta">بقلم: ${article.author} • ${published} • ${article.comments} ${commentsLabel}</p>
        <p class="article-excerpt">${article.excerpt}</p>
        <div class="article-footer">
          <span class="tag-badge">#${article.tags?.[0] || "الفكر"}</span>
          <a href="article.html?slug=${article.slug}" class="read-link">اقرأ المقال</a>
        </div>
      </div>
    </article>
  `;
};

const getFilteredPosts = () => {
  if (!window.mockBackend) return [];
  const { category, tag } = state.filters;
  return window.mockBackend.getPosts({ category, tag });
};

const renderSidebarList = (selector, items) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = items
    .map(
      (item) => `
        <li>
          <img src="${item.cardImage}" alt="${item.title}">
          <span>${item.title}</span>
        </li>
      `
    )
    .join("");
};

const renderHomePage = () => {
  if (!document.body.classList.contains("home-page")) return;
  const grid = document.getElementById("articleGrid");
  const results = document.querySelector(".results-count");
  const posts = getFilteredPosts();
  if (grid) {
    grid.innerHTML = posts.length
      ? posts.map(renderArticleCard).join("")
      : '<p class="empty-state">لا توجد مقالات مطابقة حالياً.</p>';
  }
  if (results) {
    const label = posts.length === 1 ? "مقالة" : "مقالات";
    results.textContent = `${posts.length} ${label}`;
  }

  if (window.mockBackend) {
    const trending = window.mockBackend
      .getPosts({})
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 3);
    const recommended = window.mockBackend
      .getPosts({})
      .sort((a, b) => b.recommendedScore - a.recommendedScore)
      .slice(0, 3);
    renderSidebarList("#trendingList", trending);
    renderSidebarList("#recommendedList", recommended);
  }
};

const renderArticlePage = () => {
  if (!document.body.classList.contains("article-page") || !backend) return;
  const urlSlug = new URLSearchParams(window.location.search).get("slug");
  const fallbackSlug = document.body.dataset.articleId;
  const slug = urlSlug || fallbackSlug;
  if (!slug) return;
  const article = backend.getPostBySlug(slug);
  const container = document.querySelector(".article-detail");
  if (!article || !container) {
    if (container) {
      container.innerHTML = '<div class="empty-state">تعذر العثور على المقال المطلوب.</div>';
    }
    return;
  }

  const categoryLabel = container.querySelector(".category-label");
  if (categoryLabel) {
    categoryLabel.textContent = categoryLabels[article.category] || article.category;
  }
  const heading = container.querySelector("h1");
  if (heading) heading.textContent = article.title;

  const info = container.querySelector(".article-info");
  if (info) {
    const formattedDate = new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date(article.publishedAt));
    info.innerHTML = `<span>${article.author}</span><span>${formattedDate}</span><span>${article.comments} تعليقاً</span>`;
  }

  const heroImg = container.querySelector(".article-hero img");
  if (heroImg) {
    heroImg.src = article.heroImage;
    heroImg.alt = article.title;
  }

  const body = container.querySelector(".article-body");
  if (body) {
    body.innerHTML = article.body;
  }

  const ratingForm = document.querySelector(".rating-form");
  if (ratingForm) {
    ratingForm.dataset.endpoint = `/articles/${article.slug}/rating`;
  }
};

const renderAdminPage = () => {
  if (!document.body.classList.contains("admin-page")) return;
  const gate = document.getElementById("adminAuthGate");
  const metrics = document.querySelector(".metrics");
  const panels = document.querySelector(".admin-panels");
  const headerUser = document.querySelector(".admin-user span");
  const loginBtn = document.querySelector(".admin-user .auth-btn");
  const logoutBtn = document.querySelector("[data-action='logout']");

  const setLocked = (locked) => {
    if (gate) gate.setAttribute("aria-hidden", locked ? "false" : "true");
    [metrics, panels].forEach((section) => {
      if (section) section.classList.toggle("is-blurred", locked);
    });
    if (loginBtn) loginBtn.hidden = !locked;
    if (logoutBtn) logoutBtn.hidden = locked;
    if (headerUser) {
      headerUser.textContent = locked ? "يرجى تسجيل الدخول" : `مرحباً، ${state.currentUser.name}`;
    }
  };

  if (!state.currentUser) {
    setLocked(true);
    return;
  }

  setLocked(false);

  const tableBody = document.getElementById("adminArticlesTable");
  if (tableBody && backend) {
    const posts = backend.getPosts({});
    const formatter = new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    tableBody.innerHTML = posts
      .map((post) => `
          <tr>
            <td>${post.title}</td>
            <td>${categoryLabels[post.category] || post.category}</td>
            <td><span class="status ${post.status === "draft" ? "draft" : "published"}">${post.status === "draft" ? "مسودة" : "منشور"}</span></td>
            <td>${formatter.format(new Date(post.publishedAt))}</td>
            <td class="actions">
              <button class="icon-btn" data-action="preview-article" data-article="${post.slug}" title="عرض">👁</button>
              <button class="icon-btn" data-action="copy-link" data-article="${post.slug}" title="نسخ الرابط">🔗</button>
            </td>
          </tr>
        `)
      .join("");
  }
};
const renderPollResults = (results) => {
  const pollResults = document.getElementById("pollResults");
  if (!pollResults || !results) return;
  const totalNode = pollResults.querySelector("[data-role='total-votes']");
  if (totalNode) {
    totalNode.textContent = results.totalVotes ? `${results.totalVotes} مصوّت` : "لم تسجل أصوات بعد";
    totalNode.hidden = !results.totalVotes;
  }
  pollResults.querySelectorAll(".result-bar").forEach((bar) => {
    const value = bar.dataset.value;
    const match = results.options.find((option) => option.value === value);
    bar.classList.toggle("selected", results.selectedOption === value);
    const fill = bar.querySelector(".bar span");
    const percentNode = bar.querySelector(".percent");
    if (match) {
      if (fill) fill.style.width = `${match.percent}%`;
      if (percentNode) percentNode.textContent = `${match.percent}%`;
    }
  });
};

const initPoll = () => {
  const pollForm = document.getElementById("pollForm");
  const pollResults = document.getElementById("pollResults");
  if (!pollForm || !pollResults || !backend) return;
  const pollId = pollForm.querySelector("[name='pollId']")?.value || "homepage-theme";
  try {
    const initial = backend.pollResults(pollId);
    renderPollResults(initial);
    if (initial.hasVoted) {
      pollForm.hidden = true;
      pollResults.hidden = false;
    }
  } catch (error) {
    // ignore initial failure
  }

  pollForm.addEventListener("form:success", (event) => {
    const response = event.detail?.response;
    if (response?.options) {
      renderPollResults(response);
      pollForm.hidden = true;
      pollResults.hidden = false;
    }
  });

  pollForm.addEventListener("form:error", () => {
    pollForm.hidden = false;
  });
};

const initFilterBar = () => {
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
      state.filters.category = categoryFilter.value;
      renderHomePage();
    });
  }
  document.querySelectorAll(".filter-group.tags .tag").forEach((tagBtn) => {
    tagBtn.addEventListener("click", () => {
      state.filters.tag = state.filters.tag === tagBtn.dataset.tag ? null : tagBtn.dataset.tag;
      document.querySelectorAll(".filter-group.tags .tag").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tag === state.filters.tag);
      });
      renderHomePage();
    });
  });
};

const initNavFilters = () => {
  document.querySelectorAll(".main-nav [data-filter]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const category = link.dataset.filter;
      if (!category) return;
      event.preventDefault();
      state.filters.category = category;
      state.filters.tag = null;
      const select = document.getElementById("categoryFilter");
      if (select) select.value = category;
      document.querySelectorAll(".filter-group.tags .tag").forEach((btn) => btn.classList.remove("active"));
      renderHomePage();
      document.querySelector(link.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
};

const initTagCloudShortcuts = () => {
  document.querySelectorAll(".tags-cloud .tag-badge[data-tag]").forEach((badge) => {
    badge.addEventListener("click", (event) => {
      const tag = badge.dataset.tag;
      if (!tag) return;
      event.preventDefault();
      state.filters.tag = tag;
      state.filters.category = "all";
      const select = document.getElementById("categoryFilter");
      if (select) select.value = "all";
      document.querySelectorAll(".filter-group.tags .tag").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tag === tag);
      });
      renderHomePage();
      document.getElementById("articles")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
};

const initCarouselControls = () => {
  document.querySelectorAll(".carousel-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.carousel;
      const track = document.querySelector(`[data-carousel-track="${key}"]`);
      if (!track) return;
      const direction = btn.classList.contains("next") ? 1 : -1;
      track.scrollBy({
        left: direction * (track.clientWidth * 0.9),
        behavior: "smooth"
      });
    });
  });
};

const initPopups = () => {
  document.querySelectorAll("[data-popup-target]").forEach((trigger) => {
    trigger.addEventListener("click", function () {
      const targetId = this.dataset.popupTarget;
      if (!targetId) return;
      if (this.dataset.requiresAuth === "true" && !requireAuth()) {
        return;
      }
      popupManager.open(targetId);
    });
  });

  document.querySelectorAll("[data-popup-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const popup = btn.closest(".popup");
      if (popup?.id) popupManager.close(popup.id);
    });
  });
};

const initForms = () => {
  document.querySelectorAll("form[data-endpoint]").forEach((form) => {
    showFormStatus(form, "");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector("[type='submit']");
      toggleButtonState(submitBtn, true);
      showFormStatus(form, "");
      try {
        const response = await handleFormSubmission(form);
        const successMessage = response?.message || form.dataset.success || "✓ تم الحفظ";
        showFormStatus(form, successMessage, "success");
        form.dispatchEvent(new CustomEvent("form:success", { detail: { response }, bubbles: true }));

        if (form.dataset.closeOnSuccess === "true") {
          const popup = form.closest(".popup");
          if (popup?.id) {
            window.setTimeout(() => popupManager.close(popup.id), 400);
          }
        }

        if (form.dataset.resetOnSuccess !== "false") {
          form.reset();
        }

        if (form.dataset.endpoint === "/auth/login") {
          updateAuthState();
          updateAuthUI();
          renderAdminPage();
          if (document.body.classList.contains("login-page")) {
            const adminRole = state.currentUser?.role === "admin" || state.currentUser?.role === "editor";
            const destination = adminRole ? "admin.html" : "index.html";
            setTimeout(() => (window.location.href = destination), 800);
          }
        }

        if (form.dataset.endpoint === "/auth/register") {
          updateAuthState();
          updateAuthUI();
          renderAdminPage();
          if (document.body.classList.contains("signup-page")) {
            setTimeout(() => (window.location.href = "index.html"), 1200);
          }
        }

        if (form.dataset.endpoint === "/admin/articles") {
          document.dispatchEvent(new CustomEvent("aqala:posts-updated"));
        }
      } catch (error) {
        const message = error.message || form.dataset.error || "تعذّر إتمام الطلب";
        showFormStatus(form, message, "error");
        form.dispatchEvent(new CustomEvent("form:error", { detail: { error }, bubbles: true }));
      } finally {
        toggleButtonState(submitBtn, false);
      }
    });
  });
};

const initAuthActions = () => {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "open-dashboard") {
      event.preventDefault();
      if (!requireAuth()) return;
      window.location.href = "admin.html";
    }

    if (action === "logout") {
      event.preventDefault();
      try {
        backend?.logout();
      } catch (error) {
        /* ignore */
      }
      updateAuthState();
      updateAuthUI();
      renderAdminPage();
    }

    if (action === "preview-article") {
      const slug = target.dataset.article;
      if (slug) window.open(`article.html?slug=${slug}`, "_blank");
    }

    if (action === "copy-link") {
      const slug = target.dataset.article;
      if (!slug || !navigator.clipboard) return;
      navigator.clipboard
        .writeText(new URL(`article.html?slug=${slug}`, window.location.href).toString())
        .then(() => {
          target.textContent = "✓";
          setTimeout(() => (target.textContent = "🔗"), 1200);
        })
        .catch(() => {
          target.textContent = "✕";
          setTimeout(() => (target.textContent = "🔗"), 1200);
        });
    }
  });
};

const initArticleRating = () => {
  const form = document.querySelector(".rating-form");
  if (!form) return;
  form.addEventListener("form:success", () => {
    const status = form.querySelector(".form-status");
    if (status) status.textContent = "شكراً لتقييمك";
  });
};

const init = () => {
  initThemeToggle();
  initPopups();
  initForms();
  initCarouselControls();
  initAuthActions();
  initPoll();
  initFilterBar();
  initNavFilters();
  initTagCloudShortcuts();
  initArticleRating();
  updateAuthUI();
  renderHomePage();
  renderArticlePage();
  renderAdminPage();

  document.addEventListener("aqala:posts-updated", () => {
    renderHomePage();
    renderAdminPage();
  });
};

document.addEventListener("DOMContentLoaded", init);












