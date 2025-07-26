function parseRgb(str) {
  const vals = str.match(/\d+/g);
  if (!vals || vals.length < 3) return null;
  return vals.slice(0, 3).map(Number);
}

function daltonize(r, g, b, type) {
  // Convert to LMS space
  const L = 0.299 * r + 0.587 * g + 0.114 * b;
  const M = 0.3 * r + 0.59 * g + 0.11 * b;
  const S = 0.01 * r + 0.05 * g + 0.94 * b;

  let L_blind = L,
    M_blind = M,
    S_blind = S;

  // Simulate CVD (desaturate affected cone)
  if (type === "protanopia") L_blind = 0;
  else if (type === "deuteranopia") M_blind = 0;
  else if (type === "tritanopia") S_blind = 0;

  // Back to RGB
  const r_blind = 1.0 * L_blind + 0.0 * M_blind + 0.0 * S_blind;
  const g_blind = 0.0 * L_blind + 1.0 * M_blind + 0.0 * S_blind;
  const b_blind = 0.0 * L_blind + 0.0 * M_blind + 1.0 * S_blind;

  // Error between normal and simulated
  const errR = r - r_blind;
  const errG = g - g_blind;
  const errB = b - b_blind;

  // Corrected color
  const R = Math.min(255, Math.max(0, r + 2 * errR));
  const G = Math.min(255, Math.max(0, g + 2 * errG));
  const B = Math.min(255, Math.max(0, b + 2 * errB));

  return [Math.round(R), Math.round(G), Math.round(B)];
}

function luminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(rgb1, rgb2) {
  if (!rgb1 || !rgb2) return 0; // prevent crash on invalid values

  const lum1 = luminance(...rgb1);
  const lum2 = luminance(...rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function getBestContrastTextColor(bgRgb) {
  const black = [0, 0, 0];
  const white = [255, 255, 255];
  return contrastRatio(bgRgb, white) > contrastRatio(bgRgb, black)
    ? "rgb(255,255,255)"
    : "rgb(0,0,0)";
}

function updateColors(mode) {
  const colorProps = [
    "color",
    "backgroundColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
  ];

  document.querySelectorAll("*").forEach((el) => {
    const computed = getComputedStyle(el);
    let backgroundColor = null;
    let textColor = null;

    colorProps.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && value.includes("rgb")) {
        const rgb = parseRgb(value);
        if (!rgb) return;

        // Save original once
        el.dataset[`original${prop}`] ??= value;

        if (mode === "normal") {
          const original = el.dataset[`original${prop}`];
          if (original) el.style.setProperty(prop, original, "important");
        } else {
          const [r, g, b] = rgb;
          const [R, G, B] = daltonize(r, g, b, mode);
          const newColor = `rgb(${R}, ${G}, ${B})`;
          el.style.setProperty(prop, newColor, "important");

          // Store for contrast check
          if (prop === "backgroundColor") backgroundColor = [R, G, B];
          if (prop === "color") textColor = [R, G, B];
        }
      }
    });

    // Apply best readable text color if contrast is too low
    if (contrastRatio(backgroundColor, textColor) < 4.5) {
      el.style.setProperty(
        "color",
        getBestContrastTextColor(backgroundColor),
        "important"
      );
    }

    if (mode !== "normal" && backgroundColor && textColor) {
      const ratio = contrastRatio(backgroundColor, textColor);
      if (ratio < 4.5) {
        const betterColor = getBestContrastTextColor(backgroundColor);
        el.style.setProperty("color", betterColor, "important");
      }
    }
  });

  // Image handling
  document.querySelectorAll("img").forEach((img) => {
    if (!img.dataset.originalSrc) {
      img.dataset.originalSrc = img.src;
    }

    if (mode === "normal") {
      img.src = img.dataset.originalSrc;
    } else {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          const [R, G, B] = daltonize(r, g, b, mode);
          [data[i], data[i + 1], data[i + 2]] = [R, G, B];
        }
        ctx.putImageData(imageData, 0, 0);
        img.src = canvas.toDataURL();
      };
      image.src = img.dataset.originalSrc;
    }
  });
}

// document.addEventListener("DOMContentLoaded", () => {
// const select = document.getElementById("cb-mode");
// if (select) {
// select.addEventListener("change", e => {
// updateColors(e.target.value);
// });
function applyColorBlindMode(mode) {
  updateColors(mode);
}
