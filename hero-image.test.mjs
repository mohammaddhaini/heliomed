import test from "node:test";
import assert from "node:assert/strict";

import { applyHeroImage, applyHeroAspectRatio } from "./hero-image.mjs";

function fakeImage(src = "") {
    return {
        src,
        alt: "",
        hidden: false,
        removeAttribute(name) {
            if (name === "src") this.src = "";
        }
    };
}

test("applyHeroImage clears the previous slide image when the next slide is empty", () => {
    const image = fakeImage("https://example.com/first.jpg");

    applyHeroImage(image, { headline: "Second slide", imageUrl: "" });

    assert.equal(image.src, "");
    assert.equal(image.hidden, true);
    assert.equal(image.alt, "Second slide");
});

test("applyHeroImage shows each slide's own image", () => {
    const image = fakeImage();

    applyHeroImage(image, { headline: "First slide", imageUrl: " https://example.com/first.jpg " });

    assert.equal(image.src, "https://example.com/first.jpg");
    assert.equal(image.hidden, false);
    assert.equal(image.alt, "First slide");
});

test("applyHeroAspectRatio sets aspect ratio immediately if image is complete", () => {
    const props = {};
    const heroEl = {
        style: {
            aspectRatio: "",
            setProperty(k, v) { props[k] = v; }
        },
        classList: {
            contains(cls) { return cls === "hero-text-hidden"; }
        }
    };
    const image = {
        complete: true,
        naturalWidth: 1920,
        naturalHeight: 600
    };

    applyHeroAspectRatio(heroEl, image);

    assert.equal(props["--hero-aspect-ratio"], "1920 / 600");
    assert.equal(heroEl.style.aspectRatio, "1920 / 600");
});

test("applyHeroAspectRatio listens for load event when image is not yet complete", () => {
    const props = {};
    const heroEl = {
        style: {
            aspectRatio: "",
            setProperty(k, v) { props[k] = v; }
        },
        classList: {
            contains() { return false; }
        }
    };
    let loadHandler = null;
    const image = {
        complete: false,
        naturalWidth: 0,
        naturalHeight: 0,
        addEventListener(event, handler) {
            if (event === "load") loadHandler = handler;
        }
    };

    applyHeroAspectRatio(heroEl, image);
    assert.equal(typeof loadHandler, "function");

    image.naturalWidth = 1200;
    image.naturalHeight = 630;
    loadHandler();

    assert.equal(props["--hero-aspect-ratio"], "1200 / 630");
});

