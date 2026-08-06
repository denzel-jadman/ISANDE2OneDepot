export const categoryGroups = [
  {
    label: "Guns",
    categories: ["Airsoft Rifles", "Airsoft Pistols", "Airsoft Parts & Internals"],
  },
  {
    label: "Accessories",
    categories: ["Gun Attachments", "Batteries & Chargers", "Gas & Ammunition", "Storage & Carry"],
  },
  {
    label: "Gear & Apparel",
    categories: ["Protective Gear", "Clothing", "Knives & Utilities"],
  },
];

export const productCategories = categoryGroups.flatMap((group) => group.categories);
