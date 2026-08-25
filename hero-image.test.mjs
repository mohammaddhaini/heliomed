import test from "node:test";
import assert from "node:assert/strict";

import { applyHeroImage } from "./hero-image.mjs";

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
