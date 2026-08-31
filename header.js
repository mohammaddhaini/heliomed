document.addEventListener('DOMContentLoaded', function () {
    var header = document.querySelector('.header');
    var searchInput = document.querySelector('.search-box input');
    var mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    var mobileCategoryToggle = document.querySelector('.mobile-category-toggle');
    var navLinks = document.querySelector('.nav-links');

    function tr(key) {
        return window.HeliomedI18n && typeof window.HeliomedI18n.t === 'function' ? window.HeliomedI18n.t(key) : key;
    }

    function updateResponsiveLanguageButton() {
        var currentLang = (window.HeliomedI18n && typeof window.HeliomedI18n.currentLang === 'function')
            ? window.HeliomedI18n.currentLang()
            : (document.documentElement.lang || 'en');
        var oppositeLang = currentLang === 'ar' ? 'en' : 'ar';
        var oppositeLabel = currentLang === 'ar' ? 'EN' : 'عربي';

        document.querySelectorAll('.language-toggle-btn').forEach(function (btn) {
            btn.setAttribute('data-lang-option', oppositeLang);
            btn.textContent = oppositeLabel;
            btn.setAttribute('aria-label', tr('aria.language') + ' (' + oppositeLabel + ')');
        });
    }

    function setupLanguageSwitcher() {
        var actions = document.querySelector('.header-actions');
        if (!actions) return;
        var switcher = actions.querySelector('.language-switcher');
        if (!switcher) {
            switcher = document.createElement('div');
            switcher.className = 'language-switcher';
            switcher.setAttribute('aria-label', tr('aria.language'));
            switcher.setAttribute('data-i18n-aria', 'aria.language');
            switcher.innerHTML = [
                '<div class="language-desktop">',
                '    <button type="button" data-lang-option="en" aria-pressed="false">EN</button>',
                '    <span class="language-divider" aria-hidden="true">|</span>',
                '    <button type="button" data-lang-option="ar" aria-pressed="false">عربي</button>',
                '</div>',
                '<button type="button" class="language-toggle-btn" aria-label="' + tr('aria.language') + '"></button>'
            ].join('');
            var icons = actions.querySelector('.header-icons');
            actions.insertBefore(switcher, icons || null);
        } else {
            if (!switcher.querySelector('.language-toggle-btn')) {
                var desktopWrapper = switcher.querySelector('.language-desktop');
                if (!desktopWrapper) {
                    desktopWrapper = document.createElement('div');
                    desktopWrapper.className = 'language-desktop';
                    while (switcher.firstChild) {
                        desktopWrapper.appendChild(switcher.firstChild);
                    }
                    switcher.appendChild(desktopWrapper);
                }
                var toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'language-toggle-btn';
                toggleBtn.setAttribute('aria-label', tr('aria.language'));
                switcher.appendChild(toggleBtn);
            }
        }
        updateResponsiveLanguageButton();
        if (window.HeliomedI18n && typeof window.HeliomedI18n.translate === 'function') {
            window.HeliomedI18n.translate(switcher);
        }
    }

    function injectResponsiveSearchButton() {
        var actions = document.querySelector('.header-actions');
        if (!actions || actions.querySelector('.header-search-btn')) return;
        var searchBtn = document.createElement('button');
        searchBtn.type = 'button';
        searchBtn.className = 'header-search-btn';
        searchBtn.setAttribute('aria-label', tr('aria.openSearch'));
        searchBtn.setAttribute('data-i18n-aria-label', 'aria.openSearch');
        searchBtn.innerHTML = '<i class="fas fa-search" aria-hidden="true"></i>';

        var icons = actions.querySelector('.header-icons');
        actions.insertBefore(searchBtn, icons || null);
    }

    function ensureSearchSlideBar() {
        var drawer = document.getElementById('search-slide-bar');
        if (drawer) return drawer;

        drawer = document.createElement('div');
        drawer.id = 'search-slide-bar';
        drawer.className = 'search-slide-bar';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-label', tr('aria.openSearch'));

        drawer.innerHTML = [
            '<div class="search-slide-overlay" data-search-slide-close></div>',
            '<div class="search-slide-panel">',
            '    <div class="search-slide-header">',
            '        <div class="search-slide-title-wrap">',
            '            <i class="fas fa-search search-slide-title-icon" aria-hidden="true"></i>',
            '            <span class="search-slide-title" data-i18n="search.searchProducts">' + tr('search.searchProducts') + '</span>',
            '        </div>',
            '        <button type="button" class="search-slide-close-btn" data-search-slide-close aria-label="' + tr('aria.closeSearch') + '" data-i18n-aria-label="aria.closeSearch">',
            '            <i class="fas fa-times" aria-hidden="true"></i>',
            '        </button>',
            '    </div>',
            '    <form class="search-slide-form" action="./search.html" method="get" role="search">',
            '        <div class="search-slide-input-wrap">',
            '            <i class="fas fa-search search-slide-input-icon" aria-hidden="true"></i>',
            '            <input type="text" name="q" class="search-slide-input" placeholder="' + tr('search.placeholder') + '" autocomplete="off" autocapitalize="off" spellcheck="false" data-i18n-placeholder="search.placeholder">',
            '            <button type="button" class="search-slide-clear-btn" aria-label="' + tr('search.clearSearch') + '" data-i18n-aria-label="search.clearSearch" style="display: none;">',
            '                <i class="fas fa-times-circle" aria-hidden="true"></i>',
            '            </button>',
            '        </div>',
            '        <button type="submit" class="search-slide-submit-btn" data-i18n="search.termLabel">' + tr('search.termLabel') + '</button>',
            '    </form>',
            '    <div class="search-slide-quick">',
            '        <span class="search-slide-quick-label" data-i18n="search.popularSearches">' + tr('search.popularSearches') + '</span>',
            '        <div class="search-slide-tags">',
            '            <a href="./collection.html?collection=Paraparapharmacy" class="search-slide-tag" data-i18n="nav.parapharmacy">' + tr('nav.parapharmacy') + '</a>',
            '            <a href="./collection.html?collection=medical-supplies" class="search-slide-tag" data-i18n="nav.medicalSupplies">' + tr('nav.medicalSupplies') + '</a>',
            '            <a href="./collection.html?collection=skin-care" class="search-slide-tag" data-i18n="nav.skinCare">' + tr('nav.skinCare') + '</a>',
            '            <a href="./collection.html?collection=organic" class="search-slide-tag" data-i18n="nav.organic">' + tr('nav.organic') + '</a>',
            '            <a href="./collection.html?collection=offers" class="search-slide-tag" data-i18n="nav.offers">' + tr('nav.offers') + '</a>',
            '        </div>',
            '    </div>',
            '    <div class="search-slide-results" id="searchSlideResults"></div>',
            '</div>'
        ].join('');

        document.body.appendChild(drawer);

        if (window.HeliomedI18n && typeof window.HeliomedI18n.translate === 'function') {
            window.HeliomedI18n.translate(drawer);
        }

        var form = drawer.querySelector('.search-slide-form');
        var input = drawer.querySelector('.search-slide-input');
        var clearBtn = drawer.querySelector('.search-slide-clear-btn');

        if (input && clearBtn) {
            input.addEventListener('input', function () {
                clearBtn.style.display = input.value.trim().length > 0 ? 'inline-flex' : 'none';
            });
            clearBtn.addEventListener('click', function () {
                input.value = '';
                clearBtn.style.display = 'none';
                input.focus();
            });
        }

        if (form) {
            form.addEventListener('submit', function (e) {
                var val = (input?.value || '').trim();
                e.preventDefault();
                closeSearchSlideBar();
                window.location.href = './search.html' + (val ? '?q=' + encodeURIComponent(val) : '');
            });
        }

        return drawer;
    }

    function openSearchSlideBar() {
        var drawer = ensureSearchSlideBar();
        setMobileNav(false);
        setCategoryNav(false);
        if (window.HeliomedCart && typeof window.HeliomedCart.closeDrawer === 'function') {
            window.HeliomedCart.closeDrawer();
        }

        drawer.classList.add('is-open');
        document.documentElement.classList.add('search-slide-lock');
        document.body.classList.add('search-slide-lock');

        var input = drawer.querySelector('.search-slide-input');
        if (input) {
            setTimeout(function () {
                input.focus();
            }, 120);
        }
    }

    function closeSearchSlideBar() {
        var drawer = document.getElementById('search-slide-bar');
        if (!drawer) return;

        drawer.classList.remove('is-open');
        document.documentElement.classList.remove('search-slide-lock');
        document.body.classList.remove('search-slide-lock');
    }

    window.HeliomedSearch = {
        open: openSearchSlideBar,
        close: closeSearchSlideBar
    };

    function updateMobileMenuLabel(open) {
        if (!mobileNavToggle) return;
        var key = open ? 'aria.closeMenu' : 'aria.openMenu';
        mobileNavToggle.setAttribute('aria-label', tr(key));
        mobileNavToggle.setAttribute('data-i18n-aria', key);
    }

    setupLanguageSwitcher();
    injectResponsiveSearchButton();

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
        if (open) {
            setCategoryNav(false);
            closeSearchSlideBar();
            if (window.HeliomedCart && typeof window.HeliomedCart.closeDrawer === 'function') {
                window.HeliomedCart.closeDrawer();
            }
        }
        header.classList.toggle('mobile-nav-open', open);
        document.documentElement.classList.toggle('mobile-nav-lock', open);
        document.body.classList.toggle('mobile-nav-lock', open);
        mobileNavToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        updateMobileMenuLabel(open);
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
    document.addEventListener('heliomed:close-header-nav', function () {
        setMobileNav(false);
        setCategoryNav(false);
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
            closeSearchSlideBar();
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
            if (currentY > 30) {
                header?.classList.add('is-scrolled');
                header?.classList.add('scrolled');
            } else if (currentY < 12) {
                header?.classList.remove('is-scrolled');
                header?.classList.remove('scrolled');
            }

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
        if (event.target.closest('[data-search-slide-close]')) {
            event.preventDefault();
            closeSearchSlideBar();
            return;
        }

        var searchTrigger = event.target.closest('.header-search-btn');
        if (searchTrigger) {
            event.preventDefault();
            var searchDrawer = document.getElementById('search-slide-bar');
            if (searchDrawer && searchDrawer.classList.contains('is-open')) {
                closeSearchSlideBar();
            } else {
                openSearchSlideBar();
            }
            return;
        }

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
        closeSearchSlideBar();
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
            closeSearchSlideBar();
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

    function attachCartListeners() {
        document.querySelectorAll('.cart-icon-wrapper[href*="cart.html"], .header-cart-btn, [data-open-cart]').forEach(function (btn) {
            if (btn.dataset.cartDrawerBound === 'true' || btn.closest('#cart-drawer')) return;
            btn.dataset.cartDrawerBound = 'true';
            btn.addEventListener('click', function (event) {
                event.preventDefault();
                setMobileNav(false);
                setCategoryNav(false);
                closeSearchSlideBar();
                if (window.HeliomedCart && typeof window.HeliomedCart.openDrawer === 'function') {
                    window.HeliomedCart.openDrawer();
                }
            });
        });
    }
    attachCartListeners();
    document.addEventListener('heliomed:navbar-categories-loaded', attachCartListeners);
    window.addEventListener('heliomed:language-change', function () {
        updateMobileMenuLabel(header?.classList.contains('mobile-nav-open'));
        updateResponsiveLanguageButton();
        var searchDrawer = document.getElementById('search-slide-bar');
        if (searchDrawer && window.HeliomedI18n && typeof window.HeliomedI18n.translate === 'function') {
            window.HeliomedI18n.translate(searchDrawer);
        }
        if (window.HeliomedI18n && typeof window.HeliomedI18n.translate === 'function') {
            window.HeliomedI18n.translate(document);
        }
    });
});
