export function applyHeroImage(image, slide = {}) {
    if (!image) return;

    const imageUrl = String(slide.imageUrl || "").trim();
    image.alt = slide.headline || "Hero slide";
    image.hidden = !imageUrl;

    if (imageUrl) image.src = imageUrl;
    else image.removeAttribute("src");
}

export function applyHeroAspectRatio(heroEl, image) {
    if (!heroEl || !image) return;

    function sync() {
        const width = Number(image.naturalWidth || image.width || 0);
        const height = Number(image.naturalHeight || image.height || 0);
        if (width > 0 && height > 0) {
            const ratio = `${width} / ${height}`;
            if (typeof heroEl.style?.setProperty === "function") {
                heroEl.style.setProperty("--hero-aspect-ratio", ratio);
            }
            if (heroEl.classList?.contains?.("hero-text-hidden") && heroEl.style) {
                heroEl.style.aspectRatio = ratio;
            }
        }
    }

    if (image.complete && (image.naturalWidth || image.width)) {
        sync();
    } else if (typeof image.addEventListener === "function") {
        image.addEventListener("load", sync, { once: true });
    }
}

