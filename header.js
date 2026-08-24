document.addEventListener('DOMContentLoaded', function () {
    var header = document.querySelector('.header');
    var searchInput = document.querySelector('.search-box input');
    var mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    var mobileCategoryToggle = document.querySelector('.mobile-category-toggle');
    var navLinks = document.querySelector('.nav-links');

    function isMobileNav() {
        return window.matchMedia('(max-width: 900px)').matches;
    }

    function isResponsiveHeader() {
        return window.matchMedia('(max-width: 1024px)').matches;
    }

    function updateHeaderOffset() {
        if (!header) return;
        var bottom = Math.round(header.offsetHeight) || 54;
        if (!isResponsiveHeader() && !header.classList.contains('header-hidden')) {
            var rect = header.getBoundingClientRect();
            var rectBottom = Math.round(rect.bottom);
            if (rectBottom > 0 && !isNaN(rectBottom)) bottom = rectBottom;
        }
        document.documentElement.style.setProperty('--header-bottom', bottom + 'px');
    }

    function setMobileNav(open) {
        if (!header || !mobileNavToggle) return;
        if (open) setCategoryNav(false);
        header.classList.toggle('mobile-nav-open', open);
        document.documentElement.classList.toggle('mobile-nav-lock', open);
        document.body.classList.toggle('mobile-nav-lock', open);
        mobileNavToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        mobileNavToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        updateHeaderOffset();
        if (!open) {
            document.querySelectorAll('.nav-item.is-open').forEach(function (item) {
                item.classList.remove('is-open');
            });
            document.querySelectorAll('.mega-group.is-open').forEach(function (group) {
                group.classList.remove('is-open');
                group.querySelector('.mega-group-toggle')?.setAttribute('aria-expanded', 'false');
            });
        }
    }

    mobileNavToggle?.addEventListener('click', function () {
        var isOpen = header?.classList.contains('mobile-nav-open');
        setMobileNav(!isOpen);
    });

    // Static close button (before Firebase nav loads)
    document.querySelector('.nav-panel-close')?.addEventListener('click', function () {
        setMobileNav(false);
    });
    // Dynamic close button injected by navbar-categories.js after Firebase load
    document.addEventListener('heliomed:mobile-nav-close', function () {
        setMobileNav(false);
    });
    // Also use event delegation so any .nav-panel-close works regardless of when it appears
    document.addEventListener('click', function (e) {
        if (e.target.closest('.nav-panel-close')) setMobileNav(false);
    });

    function setCategoryNav(open) {
        var categoryItem = document.querySelector('.category-nav-item');
        if (!header || !mobileCategoryToggle || !categoryItem) return;
        if (open) {
            header.classList.remove('mobile-nav-open');
            mobileNavToggle?.setAttribute('aria-expanded', 'false');
        }
        header.classList.toggle('mobile-category-open', open);
        categoryItem.classList.toggle('is-open', open);
        document.body.classList.toggle('mobile-nav-lock', open);
        mobileCategoryToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    mobileCategoryToggle?.addEventListener('click', function () {
        updateHeaderOffset();
        setCategoryNav(!header?.classList.contains('mobile-category-open'));
    });

    document.querySelector('.mobile-shop-categories')?.addEventListener('click', function (event) {
        event.preventDefault();
        setMobileNav(false);
        updateHeaderOffset();
        setCategoryNav(true);
    });

    var scrollTicking = false;
    var lastScrollY = window.scrollY || 0;
    var scrollDirection = null;
    var directionStartY = lastScrollY;
    var hideScrollDistance = 18;
    var showScrollDistance = 5;

    function shouldKeepHeaderVisible() {
        return Boolean(
            header?.classList.contains('mobile-nav-open') ||
            header?.classList.contains('mobile-category-open') ||
            document.activeElement?.closest?.('.search-box')
        );
    }

    function onScroll() {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(function () {
            var currentY = Math.max(0, window.scrollY || 0);
            var nextDirection = currentY > lastScrollY ? 'down' : currentY < lastScrollY ? 'up' : scrollDirection;

            if (nextDirection && nextDirection !== scrollDirection) {
                scrollDirection = nextDirection;
                directionStartY = lastScrollY;
            }

            updateHeaderOffset();
            header?.classList.toggle('scrolled', currentY > 80);

            if (header) {
                if (!isResponsiveHeader() || currentY < 40 || shouldKeepHeaderVisible()) {
                    header.classList.remove('header-hidden');
                    directionStartY = currentY;
                } else if (scrollDirection === 'down' && currentY > 70 && currentY - directionStartY >= hideScrollDistance) {
                    header.classList.add('header-hidden');
                    directionStartY = currentY;
                } else if (scrollDirection === 'up' && directionStartY - currentY >= showScrollDistance) {
                    header.classList.remove('header-hidden');
                    directionStartY = currentY;
                }
            }

            lastScrollY = currentY;
            scrollTicking = false;
        });
    }

    updateHeaderOffset();
    if (header && 'ResizeObserver' in window) new ResizeObserver(updateHeaderOffset).observe(header);
    window.addEventListener('scroll', onScroll, { passive: true });
    header?.addEventListener('transitionend', updateHeaderOffset);

    function setActiveCategoryTab(menu, panelId) {
        menu.querySelectorAll('.category-tab').forEach(function (tab) {
            tab.classList.toggle('is-active', tab.dataset.panel === panelId);
        });
        menu.querySelectorAll('.category-panel').forEach(function (panel) {
            panel.classList.toggle('is-active', panel.id === panelId);
        });
        var panels = menu.querySelector('.category-panels');
        if (panels) panels.scrollTop = 0;
    }

    var hoverCloseTimer = null;
    function attachHoverMenus() {
        document.querySelectorAll('.nav-links > .nav-item').forEach(function (item) {
            if (!item.querySelector('.mega-menu') || item.dataset.hoverReady === 'true') return;
            item.dataset.hoverReady = 'true';
            item.addEventListener('mouseenter', function () {
                if (!isMobileNav() && window.matchMedia('(min-width: 601px)').matches) {
                    clearTimeout(hoverCloseTimer);
                    document.querySelectorAll('.nav-item.is-open').forEach(function (openItem) {
                        if (openItem !== item) openItem.classList.remove('is-open');
                    });
                    item.classList.add('is-open');
                }
            });
            item.addEventListener('mouseleave', function () {
                if (!isMobileNav() && window.matchMedia('(min-width: 601px)').matches) {
                    clearTimeout(hoverCloseTimer);
                    hoverCloseTimer = setTimeout(function () {
                        item.classList.remove('is-open');
                    }, 400);
                }
            });
        });
    }
    attachHoverMenus();
    document.addEventListener('heliomed:navbar-categories-loaded', attachHoverMenus);

    navLinks?.addEventListener('click', function (event) {
        var closeBtn = event.target.closest('.nav-panel-close');
        if (closeBtn) {
            event.preventDefault();
            setMobileNav(false);
            return;
        }

        var tab = event.target.closest('.category-tab');
        if (tab) {
            event.preventDefault();
            var menu = tab.closest('.category-menu');
            if (menu) setActiveCategoryTab(menu, tab.dataset.panel);
            return;
        }

        if (!isMobileNav()) {
            return;
        }

        var groupToggle = event.target.closest('.mega-group-toggle');
        if (groupToggle) {
            event.preventDefault();
            event.stopPropagation();
            var group = groupToggle.closest('.mega-group');
            if (group) {
                var isOpen = group.classList.toggle('is-open');
                groupToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            }
            return;
        }

        var groupHeader = event.target.closest('.mega-group-header');
        if (groupHeader && !event.target.closest('a')) {
            event.preventDefault();
            event.stopPropagation();
            var headerGroup = groupHeader.closest('.mega-group');
            if (headerGroup) {
                var isHeaderOpen = headerGroup.classList.toggle('is-open');
                headerGroup.querySelector('.mega-group-toggle')?.setAttribute('aria-expanded', isHeaderOpen ? 'true' : 'false');
            }
            return;
        }

        var trigger = event.target.closest('.nav-trigger');
        if (!trigger) {
            var directLink = event.target.closest('a');
            if (directLink) {
                setMobileNav(false);
            }
            return;
        }

        var item = trigger.closest('.nav-item');
        var submenu = item?.querySelector('.mega-menu');
        if (!submenu) {
            setMobileNav(false);
            return;
        }
        event.preventDefault();
        var shouldOpen = !item.classList.contains('is-open');
        document.querySelectorAll('.nav-item.is-open').forEach(function (openItem) {
            if (openItem !== item) {
                openItem.classList.remove('is-open');
                openItem.querySelectorAll('.mega-group.is-open').forEach(function (g) {
                    g.classList.remove('is-open');
                    g.querySelector('.mega-group-toggle')?.setAttribute('aria-expanded', 'false');
                });
            }
        });
        item.classList.toggle('is-open', shouldOpen);
        if (!shouldOpen) {
            item.querySelectorAll('.mega-group.is-open').forEach(function (g) {
                g.classList.remove('is-open');
                g.querySelector('.mega-group-toggle')?.setAttribute('aria-expanded', 'false');
            });
        }
        if (shouldOpen && submenu.classList.contains('category-menu')) submenu.scrollTop = 0;
    });

    document.addEventListener('click', function (event) {
        if (event.target.closest('.nav-links') || event.target.closest('.mobile-nav-toggle') || event.target.closest('.mobile-category-toggle')) return;
        if (header?.classList.contains('mobile-category-open')) {
            setCategoryNav(false);
            return;
        }
        if (header?.classList.contains('mobile-nav-open')) {
            setMobileNav(false);
            return;
        }
        document.querySelectorAll('.nav-item.is-open').forEach(function (item) {
            item.classList.remove('is-open');
        });
        document.querySelectorAll('.mega-group.is-open').forEach(function (group) {
            group.classList.remove('is-open');
            group.querySelector('.mega-group-toggle')?.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        setMobileNav(false);
        setCategoryNav(false);
        document.querySelectorAll('.nav-item.is-open').forEach(function (item) {
            item.classList.remove('is-open');
        });
        document.querySelectorAll('.mega-group.is-open').forEach(function (group) {
            group.classList.remove('is-open');
            group.querySelector('.mega-group-toggle')?.setAttribute('aria-expanded', 'false');
        });
    });

    window.addEventListener('resize', function () {
        updateHeaderOffset();
        lastScrollY = window.scrollY || 0;
        header?.classList.remove('header-hidden');
        if (!isMobileNav()) {
            setMobileNav(false);
            setCategoryNav(false);
        }
    });

    if (searchInput) {
        var searchBox = searchInput.closest('.search-box');
        var searchIcon = searchBox?.querySelector('i');
        var openProductSearch = function () {
            var query = searchInput.value.trim();
            window.location.href = './search.html' + (query ? '?q=' + encodeURIComponent(query) : '');
        };
        var openSearch = function () { searchBox?.classList.add('expanded'); };
        var closeSearch = function () { searchBox?.classList.remove('expanded'); };
        var closeSearchIfEmpty = function () {
            if (!searchInput.value.trim()) closeSearch();
        };
        searchInput.addEventListener('input', function () {
            searchInput.classList.toggle('has-results', Boolean(searchInput.value.trim()));
        });
        searchBox?.addEventListener('click', function () {
            openSearch();
            searchInput.focus();
        });
        searchIcon?.addEventListener('click', function (event) {
            if (searchBox?.classList.contains('expanded') || searchInput.value.trim()) {
                event.preventDefault();
                event.stopPropagation();
                openProductSearch();
            }
        });
        searchInput.addEventListener('focus', openSearch);
        searchInput.addEventListener('blur', function () {
            window.setTimeout(closeSearchIfEmpty, 140);
        });
        searchInput.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                searchInput.value = '';
                searchInput.classList.remove('has-results');
                closeSearch();
                searchInput.blur();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                openProductSearch();
            }
        });
    }
});
