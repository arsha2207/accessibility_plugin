function parseRgb(str) {
  const vals = str.match(/\d+/g);
  return vals ? vals.slice(0, 3).map(Number) : null;
}

function daltonize(r, g, b, type) {
  const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;

  let l = L,
    m = M,
    s = S;

  if (type === "protanopia") {
    l = 0.0 * L + 0.23 * M - 2.53 * S;
  } else if (type === "deuteranopia") {
    m = 0.494 * L + 0.0 * M + 1.25 * S;
  } else if (type === "tritanopia") {
    s = -0.396 * L + 0.801 * M + 0.0 * S;
  }

  const R_sim = 0.0809 * l - 0.1305 * m + 0.1167 * s;
  const G_sim = -0.0102 * l + 0.054 * m - 0.1136 * s;
  const B_sim = -0.0004 * l - 0.0041 * m + 0.6935 * s;

  const errR = r - R_sim;
  const errG = g - G_sim;
  const errB = b - B_sim;

  const R = Math.min(255, Math.max(0, r + 0.7 * errR));
  const G = Math.min(255, Math.max(0, g + 0.7 * errG));
  const B = Math.min(255, Math.max(0, b + 0.7 * errB));

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
