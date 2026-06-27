import type { Appearance } from "@stripe/stripe-js";

/** Stripe Elements skin that follows portal CSS variables (light/dark + brand). */
export function buildStripeAppearance(): Appearance {
  if (typeof document === "undefined") {
    return {
      theme: "stripe",
      variables: {
        fontFamily: "Hanken Grotesk, system-ui, sans-serif",
        fontSizeBase: "14px",
        borderRadius: "12px",
        colorPrimary: "#6B66C9",
      },
    };
  }

  const root = document.documentElement;
  const isDark = root.dataset.base === "dark";
  const styles = getComputedStyle(root);

  const brand = styles.getPropertyValue("--brand").trim() || "#6B66C9";
  const surface = styles.getPropertyValue("--surface").trim() || "#ffffff";
  const text = styles.getPropertyValue("--text").trim() || "#0a0a0a";
  const muted = styles.getPropertyValue("--muted").trim() || "#6c6a7e";
  const hair = styles.getPropertyValue("--hair").trim() || "rgba(10,10,10,0.08)";

  return {
    theme: isDark ? "night" : "stripe",
    variables: {
      fontFamily: "Hanken Grotesk, system-ui, sans-serif",
      fontSizeBase: "14px",
      spacingUnit: "3px",
      borderRadius: "12px",
      colorPrimary: brand,
      colorBackground: surface,
      colorText: text,
      colorTextSecondary: muted,
      colorDanger: "#ef4444",
    },
    rules: {
      ".Input": {
        border: `1px solid ${hair}`,
        boxShadow: "none",
        backgroundColor: surface,
        color: text,
      },
      ".Input:focus": {
        border: `1px solid ${brand}`,
        boxShadow: `0 0 0 1px ${brand}`,
      },
      ".Label": {
        fontWeight: "500",
        fontSize: "13px",
        color: muted,
      },
      ".Tab": {
        border: `1px solid ${hair}`,
        boxShadow: "none",
      },
      ".Tab--selected": {
        border: `1px solid ${brand}`,
        color: text,
      },
      ".Block": {
        backgroundColor: surface,
        border: `1px solid ${hair}`,
        boxShadow: "none",
      },
    },
  };
}
