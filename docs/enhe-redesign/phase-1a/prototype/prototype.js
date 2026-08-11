(() => {
  const doc = document;
  const root = document.documentElement;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = reduceQuery.matches;
  const cssMilliseconds = (name, fallback) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || fallback;
  const reviewInterval = cssMilliseconds('--motion-review', 5000);
  const reviewResumeDelay = cssMilliseconds('--motion-resume', 6000);
  const mobilePolishQuery = window.matchMedia('(max-width: 767px)');

  const syncBrandLabels = () => {
    doc.querySelectorAll('[data-brand-label="header"]').forEach(label => {
      label.hidden = mobilePolishQuery.matches;
      label.setAttribute('aria-hidden', String(mobilePolishQuery.matches));
    });
    doc.querySelectorAll('[data-brand-label="hero"]').forEach(label => {
      label.hidden = !mobilePolishQuery.matches;
      label.setAttribute('aria-hidden', String(!mobilePolishQuery.matches));
    });
  };
  mobilePolishQuery.addEventListener?.('change', syncBrandLabels);
  syncBrandLabels();

  doc.querySelectorAll('[data-product-media]').forEach(image => {
    const showFallback = () => {
      image.hidden = true;
      image.closest('.product-cover, .card-cover')?.classList.add('media-failed');
    };
    image.addEventListener('error', showFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) showFallback();
  });

  doc.querySelectorAll('[data-horizontal-cards]').forEach(scroller => {
    scroller.addEventListener('keydown', event => {
      if (!mobilePolishQuery.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      scroller.scrollBy({ left: direction * Math.max(240, scroller.clientWidth * .8), behavior: 'auto' });
    });
  });

  const menuButton = doc.querySelector('[data-menu-button]');
  const mobileMenu = doc.querySelector('[data-mobile-menu]');
  const closeMenu = () => { mobileMenu?.classList.remove('open'); menuButton?.setAttribute('aria-expanded', 'false'); };
  menuButton?.addEventListener('click', () => { const open = !mobileMenu?.classList.contains('open'); mobileMenu?.classList.toggle('open', open); menuButton.setAttribute('aria-expanded', String(open)); });
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  const productPanels = [...doc.querySelectorAll('[data-product-panel]')];
  const productCounter = doc.querySelector('[data-product-counter]');
  const previousProducts = [...doc.querySelectorAll('[data-product-prev]')];
  const nextProducts = [...doc.querySelectorAll('[data-product-next]')];
  let productIndex = 0;
  const showProduct = index => {
    if (!productPanels.length) return;
    productIndex = (index + productPanels.length) % productPanels.length;
    productPanels.forEach((panel, i) => { panel.hidden = i !== productIndex; panel.setAttribute('aria-hidden', String(i !== productIndex)); });
    if (productCounter) productCounter.textContent = `${String(productIndex + 1).padStart(2, '0')} / ${String(productPanels.length).padStart(2, '0')}`;
  };
  const moveProduct = delta => showProduct(productIndex + delta);
  previousProducts.forEach(button => button.addEventListener('click', () => moveProduct(-1)));
  nextProducts.forEach(button => button.addEventListener('click', () => moveProduct(1)));
  doc.querySelector('[data-product-carousel]')?.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') { event.preventDefault(); moveProduct(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); moveProduct(1); } });
  const productTouch = doc.querySelector('[data-product-carousel]');
  let productTouchStart = 0;
  productTouch?.addEventListener('touchstart', event => { productTouchStart = event.changedTouches[0].clientX; }, { passive: true });
  productTouch?.addEventListener('touchend', event => { const delta = event.changedTouches[0].clientX - productTouchStart; if (Math.abs(delta) > 40) moveProduct(delta < 0 ? 1 : -1); }, { passive: true });
  showProduct(0);

  const reviewCards = [...doc.querySelectorAll('[data-review-card]')];
  const reviewWindow = doc.querySelector('.reviews-window');
  const reviewTrack = doc.querySelector('[data-review-track]');
  const reviewPrevious = doc.querySelector('[data-review-prev]');
  const reviewNext = doc.querySelector('[data-review-next]');
  const reviewShell = doc.querySelector('[data-reviews]');
  let reviewIndex = 2;
  let reviewTimer = null;
  let reviewResumeTimer = null;
  let reviewHover = false;
  let reviewFocus = false;
  let reviewPointer = false;
  let reviewDragStart = null;
  const stopReviewTimer = () => { if (reviewTimer !== null) { window.clearInterval(reviewTimer); reviewTimer = null; } };
  const canRunReviewTimer = () => !reduced && !document.hidden && !reviewHover && !reviewFocus && !reviewPointer;
  const positionReviews = () => {
    if (!reviewTrack || !reviewCards.length) return;
    reviewCards.forEach((card, i) => card.classList.toggle('active', i === reviewIndex));
    const cardWidth = reviewCards[0].offsetWidth;
    const gap = 18;
    const viewportWidth = reviewWindow?.getBoundingClientRect().width ?? window.innerWidth;
    const centerOffset = Math.max(0, (viewportWidth - cardWidth) / 2);
    reviewTrack.style.transform = `translateX(${centerOffset - reviewIndex * (cardWidth + gap)}px)`;
  };
  const moveReview = delta => { if (!reviewCards.length) return; reviewIndex = (reviewIndex + delta + reviewCards.length) % reviewCards.length; positionReviews(); };
  const startReviewTimer = () => { stopReviewTimer(); if (!canRunReviewTimer() || reviewCards.length < 2) return; reviewTimer = window.setInterval(() => moveReview(1), reviewInterval); };
  const scheduleManualResume = () => { stopReviewTimer(); if (reduced) return; if (reviewResumeTimer !== null) window.clearTimeout(reviewResumeTimer); reviewResumeTimer = window.setTimeout(() => { reviewResumeTimer = null; if (!reduced) startReviewTimer(); }, reviewResumeDelay); };
  const resumeReviewIfAllowed = () => { if (reviewResumeTimer === null) startReviewTimer(); };
  // Keep the JavaScript timer in sync when the OS/browser preference changes
  // while the page is open. A pending manual-resume timeout must not fire after
  // reduced motion is enabled, and the interval may restart only when all
  // existing visibility/interaction guards allow it.
  reduceQuery.addEventListener?.('change', event => {
    reduced = event.matches;
    if (reduced) {
      stopReviewTimer();
      if (reviewResumeTimer !== null) {
        window.clearTimeout(reviewResumeTimer);
        reviewResumeTimer = null;
      }
      return;
    }
    if (reviewResumeTimer === null) startReviewTimer();
  });
  const pauseForPointer = () => { reviewPointer = true; stopReviewTimer(); };
  const releasePointer = () => { reviewPointer = false; if (!reviewHover && !reviewFocus && reviewResumeTimer === null) startReviewTimer(); };
  reviewPrevious?.addEventListener('click', () => { moveReview(-1); scheduleManualResume(); });
  reviewNext?.addEventListener('click', () => { moveReview(1); scheduleManualResume(); });
  reviewShell?.addEventListener('mouseenter', () => { reviewHover = true; stopReviewTimer(); });
  reviewShell?.addEventListener('mouseleave', () => { reviewHover = false; resumeReviewIfAllowed(); });
  reviewShell?.addEventListener('focusin', () => { reviewFocus = true; stopReviewTimer(); });
  reviewShell?.addEventListener('focusout', event => { if (!reviewShell.contains(event.relatedTarget)) { reviewFocus = false; resumeReviewIfAllowed(); } });
  reviewShell?.addEventListener('pointerdown', event => { pauseForPointer(); reviewDragStart = event.clientX; });
  reviewShell?.addEventListener('pointerup', event => { if (reviewDragStart !== null && Math.abs(event.clientX - reviewDragStart) > 35) { moveReview(event.clientX < reviewDragStart ? 1 : -1); scheduleManualResume(); } reviewDragStart = null; releasePointer(); });
  reviewShell?.addEventListener('pointercancel', () => { reviewDragStart = null; releasePointer(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopReviewTimer(); else resumeReviewIfAllowed(); });
  window.addEventListener('resize', positionReviews);
  doc.querySelector('[data-reviews]')?.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') { event.preventDefault(); moveReview(-1); scheduleManualResume(); } if (event.key === 'ArrowRight') { event.preventDefault(); moveReview(1); scheduleManualResume(); } });
  reviewTrack?.style.setProperty('transition', 'none', 'important');
  positionReviews();
  if (reviewTrack) void reviewTrack.offsetWidth;
  window.requestAnimationFrame(() => reviewTrack?.style.removeProperty('transition'));
  startReviewTimer();

  const categoryTrigger = doc.querySelector('[data-category-trigger]');
  const categoryLayer = doc.querySelector('[data-category-layer]');
  const categoryOptions = [...doc.querySelectorAll('[data-category-option]')];
  const catalogCards = [...doc.querySelectorAll('[data-catalog-card]')];
  let categoryIndex = 0;
  let categoryTouchStart = null;
  const closeCategories = () => { categoryLayer?.classList.remove('open'); categoryTrigger?.setAttribute('aria-expanded', 'false'); };
  const applyCategory = value => catalogCards.forEach(card => { card.hidden = value !== 'all' && card.dataset.category !== value; });
  const selectCategory = index => { if (!categoryOptions.length) return; categoryIndex = (index + categoryOptions.length) % categoryOptions.length; categoryOptions.forEach((option, i) => option.setAttribute('aria-selected', String(i === categoryIndex))); const value = categoryOptions[categoryIndex].dataset.categoryOption; applyCategory(value); categoryTrigger.textContent = categoryOptions[categoryIndex].textContent.trim() + '⌄'; closeCategories(); };
  categoryTrigger?.addEventListener('click', () => { const open = !categoryLayer?.classList.contains('open'); categoryLayer?.classList.toggle('open', open); categoryTrigger.setAttribute('aria-expanded', String(open)); if (open) categoryOptions[categoryIndex]?.focus(); });
  categoryOptions.forEach((option, i) => { option.addEventListener('click', () => selectCategory(i)); option.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); categoryOptions[(i + 1) % categoryOptions.length].focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); categoryOptions[(i - 1 + categoryOptions.length) % categoryOptions.length].focus(); } if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectCategory(i); } }); });
  categoryLayer?.addEventListener('touchstart', event => { categoryTouchStart = event.changedTouches[0].clientY; }, { passive: true });
  categoryLayer?.addEventListener('touchend', event => { if (categoryTouchStart !== null && event.changedTouches[0].clientY - categoryTouchStart > 40 && window.matchMedia('(max-width: 800px)').matches) closeCategories(); categoryTouchStart = null; }, { passive: true });
  document.addEventListener('click', event => { if (categoryLayer?.classList.contains('open') && !categoryLayer.contains(event.target) && event.target !== categoryTrigger) closeCategories(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeCategories(); closeMenu(); } });
  doc.querySelectorAll('[data-extra-card]').forEach(card => { card.hidden = false; });
  const loadMore = doc.querySelector('[data-load-more]');
  loadMore?.addEventListener('click', () => { doc.querySelectorAll('[data-extra-card]').forEach(card => card.hidden = false); loadMore.hidden = true; });
})();
