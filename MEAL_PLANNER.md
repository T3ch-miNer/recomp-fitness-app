# Recomp recipes & weekly meal planner

Open **Nutrition → Recipes & weekly plan → Open planner**. It works offline after the app shell has updated.

## What is included

- **Recipe book**: Seven editable starter recipes, plus the ability to add, edit and delete recipes.
- **Cooking instructions**: Each recipe has a method, cooking time and ingredients for one **four-serving batch**.
- **Dinner-to-lunch schedule**: Pick a dinner for each weekday. Tomorrow's lunch is derived automatically from yesterday's dinner, including Sunday's dinner for the following Monday.
- **Two portion sizes**: One batch covers two dinners and two next-day lunches. The household preference divides each two-person meal between Rahul (57% initially) and Nivedita (43% initially). Change the percentage to reflect your own portions.
- **Ingredient filters**: Default exclusions are tomato, citrus, coffee, tofu and soya. Avoided ingredients are checked against recipe ingredient names, not recipe titles. Filters are **not** medical safety certification. Review every dish and packet.
- **Shopping list**: Totals ingredient weights and counts from seven planned dinners, converting kilograms to grams and litres to millilitres. Tick items already in your pantry, then copy what remains.
- **Nutrition diary**: Enter **all five** estimated full-batch nutrition values (kcal, protein, carbohydrates, fat and fibre) to enable a one-tap log of your dinner and next-day lunch. Only the selected diary owner's share is logged.
- **Local-first storage**: Recipes, weekly assignments, pantry marks and preferences are saved as part of Recomp's existing app state, so app-state exports and optional cloud snapshots include them.

## Adding a recipe

Under **Recipes → + Add recipe**, use an ingredient on each line, for example:

    700 g chicken breast
    260 g dry rice
    350 g carrots
    8 pcs eggs

Supported units are g, kg, ml, l, pcs, tbsp and tsp. Use a consistent name for each ingredient across recipes to combine quantities in the grocery list.

Write cooking instructions and, if available, enter estimated **full-batch** nutrition. The seed recipes are illustrative estimates, not verified nutritional analyses.

Under **Week**, assign a recipe to each dinner. The next day's lunch is shown automatically. Use **Groceries** to see what you need. Use **Preferences** to adjust avoided ingredients, portion shares and whose food diary receives logs.

## Known limitations

- This is one shared meal plan feeding **one existing Recomp food diary**. The planner can calculate either person's portion, but the current app does **not** provide separate user profiles or dietary dashboards.
- Editing a logged recipe does not retroactively change historical diary entries. Remove and log them again if needed.
- Recipe nutrition is based on manually entered batch estimates and will differ with product brands, cooking oils, yields and ingredient changes.
- A planner week starts on Monday. Its Monday lunch depends on the preceding Sunday's plan and may show "Not planned" for your very first week.
- For food safety, cool cooked rice promptly, store it chilled and reheat it only once. Follow the use-by dates for fish and meat.

## Checks

Run: node --test meal-planner.test.mjs

The planner intentionally has no external recipe service dependency and can be used without internet access.
