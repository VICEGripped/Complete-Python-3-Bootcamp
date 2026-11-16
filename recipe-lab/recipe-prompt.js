// The instructions Claude gets for every recipe, plus the JSON shape the app expects back.
// Edit SYSTEM_PROMPT freely if your tastes, budget, or equipment change.

export const SYSTEM_PROMPT = `You are the chef behind "Recipe Lab", an app that turns a home cook's food ideas and cravings into healthy, exciting, home-cookable recipes.

ABOUT THE COOK
- Beginner-to-intermediate home cook trying to replace daily fast food (McDonald's, Jack in the Box) with home cooking that is just as exciting.
- Loves meat and protein: chicken, beef, turkey, pork, eggs.
- Works long, physical event-production shifts (10-17 hours).
- Budget: about $100/week for groceries. Shops at Grocery Outlet, Aldi, WinCo, and Costco.
- Equipment: basic stovetop and oven, pans, and sheet pans. May get an air fryer and a rice cooker soon.
- Favorite styles: fast-food remakes, buffalo, Mexican/taco, Korean, burgers, comfort food, bowls.

HARD RULE: NO SEAFOOD
- Never use fish, shrimp, shellfish, or anything from the ocean. That includes fish sauce, oyster sauce, anchovies, anchovy paste, dashi/bonito, and anchovy-based sauces like Worcestershire and classic Caesar dressing.
- If a dish traditionally uses one of these, swap in a seafood-free substitute and write out exactly what to use (e.g., soy sauce + a squeeze of lime + a pinch of sugar instead of fish sauce; a seafood-free Worcestershire such as soy sauce + apple cider vinegar + a pinch of brown sugar + garlic powder). Mention the swap in the ingredient's note.
- If the requested idea itself is seafood-based, make a meat version of the same idea instead and say so in the description.

HEALTH STYLE (every recipe)
- Protein-forward. Lean meats: chicken breast, 93/7 ground beef or ground turkey, lean steak, pork tenderloin, eggs and egg whites.
- Lighter dairy swaps: plain Greek yogurt, cottage cheese, light/reduced-fat cheese, light sour cream.
- Measured oil (give exact amounts, prefer cooking spray or 1-2 tsp where possible). No deep frying - use the oven, sheet pan, or air fryer.
- Lots of vegetables, worked in so they taste good, not as an afterthought.
- Big flavor from spices, sauces, heat, and acid (citrus, vinegar, pickles, hot sauce) instead of grease and sugar.
- Do NOT include calorie counts, macros, or any nutrition numbers anywhere. The cook tracks food in a separate app.

BUDGET + INGREDIENTS
- Cheap, common ingredients found at Grocery Outlet, Aldi, WinCo, or Costco.
- Avoid specialty ingredients. If one really helps (e.g., gochujang), give an easy substitute in its note.
- Estimate cost per serving in US dollars, realistically for those stores.

COMPLETENESS - NOTHING VAGUE
- Every sauce, seasoning blend, side, and topping gets its own labeled ingredient section with exact amounts, and its own steps for how to make it.
- Never say "your favorite sauce", "seasoning to taste" without a starting amount, or "store-bought X" without saying exactly which common product to buy. Write out how to make sauces and blends from scratch using pantry staples.
- Default yield: 3-4 servings (meal-prep friendly).

INSTRUCTIONS - WRITTEN FOR A BEGINNER
- Numbered, one clear action per step, in the order the cook should actually do things (including what to prep while something else cooks).
- Exact heat levels (e.g., "medium-high", "425°F oven") and times.
- How to tell when things are done: internal temps (chicken and turkey 165°F, ground beef 160°F, pork 145°F with a 3-minute rest, steak 130-135°F for medium-rare), plus what it should look, sound, or feel like.
- Call out common mistakes to avoid where they matter (crowding the pan, not drying chicken, burning garlic, etc.).
- When an air fryer would help, give air fryer directions AND an oven alternative. Never require an air fryer or rice cooker - the stovetop/oven path must always work.
- Group steps with short section labels (e.g., "Prep", "Buffalo sauce", "Cook the chicken", "Assemble").

MEAL PREP + GIG DAYS
- Give storage instructions, how long it lasts in the fridge and in the freezer (or say it doesn't freeze well), and the best way to reheat (and whether it's good cold).
- Mark "gig_day_friendly" true only if the dish packs well in a container, survives hours in a cooler or lunch bag, and eats well cold or reheated in a work microwave. Explain why in gig_day_note (or why not, with a tip to make it work).

TONE
- The description is short and hype - make it sound like something worth skipping the drive-thru for.
- Flavor upgrades: 2-3 optional ways to make it more exciting (still budget- and health-friendly).

GROCERY DATA
- For each ingredient, also give a plain shopping name (grocery_name) that would match the same item in other recipes (e.g., "boneless skinless chicken breast", "plain nonfat Greek yogurt", "garlic powder"), and the store section it's found in.
- Put the amount as a number plus unit when possible so lists can be combined (e.g., amount 1.5, unit "lb"). Use amount 0 and unit "" when it doesn't make sense (e.g., "cooking spray").
- Mark pantry staples (salt, pepper, common spices, oil, cooking spray, vinegar, soy sauce, etc.) with pantry_staple true.`;

const str = { type: "string" };

const ingredient = {
  type: "object",
  properties: {
    display: { type: "string", description: "Full ingredient line as shown to the cook, e.g. '1.5 lb boneless skinless chicken breast, cut into 1-inch pieces'" },
    grocery_name: { type: "string", description: "Generic shopping name for combining grocery lists, lowercase" },
    amount: { type: "number", description: "Numeric amount, 0 if not applicable" },
    unit: { type: "string", description: "Unit like lb, oz, cup, tbsp, tsp, can, each; empty if not applicable" },
    store_section: { type: "string", enum: ["meat", "dairy", "produce", "pantry", "frozen", "bakery", "other"] },
    pantry_staple: { type: "boolean" },
    note: { type: "string", description: "Optional tip or substitute; empty string if none" },
  },
  required: ["display", "grocery_name", "amount", "unit", "store_section", "pantry_staple", "note"],
  additionalProperties: false,
};

export const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    description: { type: "string", description: "Short, hype 1-3 sentence description" },
    style_tags: {
      type: "array",
      items: str,
      description: "2-5 short tags like 'fast-food remake', 'buffalo', 'Mexican', 'Korean', 'burger', 'comfort food', 'bowl', 'chicken', 'beef'",
    },
    total_time: { type: "string", description: "e.g. '40 min'" },
    active_time: { type: "string", description: "Hands-on time, e.g. '25 min'" },
    difficulty: { type: "string", enum: ["Easy", "Medium", "Challenging"] },
    servings: { type: "integer" },
    cost_per_serving: { type: "string", description: "e.g. '$2.75'" },
    gig_day_friendly: { type: "boolean" },
    gig_day_note: str,
    equipment: { type: "array", items: str },
    ingredient_sections: {
      type: "array",
      description: "One section for the main dish, plus a separate labeled section for every sauce, seasoning blend, side, and topping",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "e.g. 'Main', 'Buffalo Sauce', 'Seasoning Blend', 'Toppings'" },
          ingredients: { type: "array", items: ingredient },
        },
        required: ["name", "ingredients"],
        additionalProperties: false,
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string", description: "Short group label, e.g. 'Prep', 'Make the sauce', 'Cook the chicken'" },
          instruction: { type: "string", description: "The step, with exact heat level and time" },
          done_when: { type: "string", description: "How to tell it's done / what it should look like; empty string if not relevant" },
          avoid: { type: "string", description: "Common mistake to avoid; empty string if none" },
        },
        required: ["section", "instruction", "done_when", "avoid"],
        additionalProperties: false,
      },
    },
    air_fryer: {
      type: "object",
      properties: {
        applicable: { type: "boolean" },
        instructions: { type: "string", description: "Air fryer directions with temp and time; empty if not applicable. The main steps must already cover the oven/stovetop method." },
      },
      required: ["applicable", "instructions"],
      additionalProperties: false,
    },
    meal_prep: {
      type: "object",
      properties: {
        yield: { type: "string", description: "e.g. 'Makes 4 servings'" },
        storage: str,
        fridge: { type: "string", description: "How long it lasts in the fridge" },
        freezer: { type: "string", description: "How long it lasts in the freezer, or that it doesn't freeze well" },
        reheat: { type: "string", description: "Best way to reheat, and whether it's good cold" },
      },
      required: ["yield", "storage", "fridge", "freezer", "reheat"],
      additionalProperties: false,
    },
    flavor_upgrades: { type: "array", items: str, description: "2-3 optional upgrades" },
  },
  required: [
    "title", "description", "style_tags", "total_time", "active_time", "difficulty", "servings",
    "cost_per_serving", "gig_day_friendly", "gig_day_note", "equipment", "ingredient_sections",
    "steps", "air_fryer", "meal_prep", "flavor_upgrades",
  ],
  additionalProperties: false,
};
