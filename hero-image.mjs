export function applyHeroImage(image, slide = {}) {
    if (!image) return;

    const imageUrl = String(slide.imageUrl || "").trim();
    image.alt = slide.headline || "Hero slide";
    image.hidden = !imageUrl;

    if (imageUrl) image.src = imageUrl;
    else image.removeAttribute("src");
}
