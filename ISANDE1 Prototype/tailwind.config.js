export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gunmetal: "#1A1611",
        panel: "#2C2A24",
        amber: "#F5A623",
        rust: "#E8542E",
        olive: "#3D6847",
        warning: "#993C1D",
      },
      fontFamily: {
        heading: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "8px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
