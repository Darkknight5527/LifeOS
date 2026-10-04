// Built-in food list: common Indian (incl. Kerala) and everyday foods.
// Values are typical estimates per one serving (kcal, protein, carbs, fat in g)
// from standard nutrition tables; home recipes vary, so treat them as close
// guides. Add your own foods for anything you eat often.
// [name, serving, kcal, protein, carbs, fat, tags]
const RAW = [
  // Breads & grains
  ["Chapati / roti", "1 medium (40 g)", 110, 3, 18, 3, "bread wheat"],
  ["Phulka (no ghee)", "1 small (30 g)", 80, 2.5, 15, 0.5, "roti"],
  ["Plain paratha", "1 piece", 200, 4, 26, 9, "bread"],
  ["Aloo paratha", "1 piece", 260, 5, 34, 11, "stuffed"],
  ["Naan", "1 piece", 260, 8, 45, 5, "bread"],
  ["Kerala parotta", "1 piece", 270, 5, 38, 11, "porotta malabar"],
  ["Bhatura", "1 piece", 300, 6, 40, 13, "chole"],
  ["White rice (cooked)", "1 cup (160 g)", 205, 4.3, 45, 0.4, "chawal"],
  ["Brown rice (cooked)", "1 cup (195 g)", 216, 5, 45, 1.8, "chawal"],
  ["Kerala matta rice (cooked)", "1 cup (160 g)", 210, 4.5, 46, 0.6, "red rice"],
  ["Jeera rice", "1 cup", 240, 4.5, 42, 6, "rice"],
  ["Curd rice", "1 cup (200 g)", 210, 6, 34, 5, "thayir sadam"],
  ["Lemon rice", "1 cup", 250, 4, 40, 8, "rice"],
  ["Chicken biryani", "1 plate (300 g)", 500, 25, 60, 17, "biriyani"],
  ["Veg biryani / pulao", "1 plate (250 g)", 380, 8, 58, 12, "pulav"],
  ["Khichdi", "1 cup (200 g)", 230, 8, 38, 5, "dal rice"],
  ["Fried rice", "1 plate (250 g)", 400, 9, 60, 13, "chinese"],
  ["Hakka noodles", "1 plate (250 g)", 380, 8, 55, 13, "chinese chowmein"],
  ["Maggi noodles", "1 packet (70 g)", 310, 7, 45, 12, "instant"],
  ["Oats (dry)", "40 g", 150, 5.3, 27, 2.7, "oatmeal porridge"],
  ["Muesli", "50 g", 190, 5, 34, 3.5, "cereal"],
  ["Cornflakes", "30 g", 113, 2, 25, 0.3, "cereal"],
  ["Brown bread", "1 slice", 70, 3, 12, 1, "toast"],
  ["White bread", "1 slice", 67, 2, 13, 0.8, "toast"],
  // South Indian breakfast
  ["Idli", "1 piece", 58, 2, 12, 0.2, "south"],
  ["Plain dosa", "1 piece", 170, 4, 29, 4, "south"],
  ["Masala dosa", "1 piece", 350, 7, 50, 14, "south"],
  ["Medu vada", "1 piece", 135, 4, 15, 7, "south"],
  ["Upma", "1 cup (200 g)", 250, 6, 38, 8, "rava"],
  ["Poha", "1 plate (200 g)", 270, 5, 45, 8, "aval"],
  ["Pongal", "1 cup (200 g)", 300, 8, 40, 12, "ven pongal"],
  ["Appam", "1 piece", 120, 2, 24, 1.5, "kerala"],
  ["Puttu", "1 cup (100 g)", 190, 3.5, 40, 1.5, "kerala"],
  ["Idiyappam", "2 pieces", 150, 3, 33, 0.5, "kerala string hoppers"],
  ["Uttapam", "1 piece", 210, 6, 35, 5, "south"],
  ["Dhokla", "2 pieces (60 g)", 100, 4, 15, 3, "gujarati"],
  // Dals, curries, sabzi
  ["Dal (toor / moong)", "1 katori (150 g)", 150, 8, 20, 4, "lentil"],
  ["Sambar", "1 katori (150 g)", 115, 5, 16, 3.5, "south"],
  ["Rasam", "1 katori (150 g)", 60, 2, 8, 2, "south"],
  ["Rajma", "1 katori (150 g)", 190, 8, 25, 6, "kidney beans"],
  ["Chole", "1 katori (150 g)", 210, 9, 28, 7, "chana masala"],
  ["Kadala curry", "1 katori (150 g)", 200, 9, 25, 7, "kerala black chana"],
  ["Paneer butter masala", "1 katori (150 g)", 330, 13, 12, 26, "paneer"],
  ["Palak paneer", "1 katori (150 g)", 260, 12, 9, 20, "paneer"],
  ["Aloo sabzi", "1 katori (150 g)", 160, 2.5, 22, 7, "potato"],
  ["Mixed veg sabzi", "1 katori (150 g)", 120, 3, 13, 6, "vegetable"],
  ["Thoran", "1 katori (100 g)", 110, 3, 9, 7, "kerala stir fry"],
  ["Avial", "1 katori (150 g)", 150, 3, 12, 10, "kerala"],
  ["Chicken curry", "1 katori (150 g)", 220, 20, 6, 13, "chicken"],
  ["Butter chicken", "1 katori (150 g)", 300, 20, 8, 21, "chicken"],
  ["Mutton curry", "1 katori (150 g)", 300, 22, 5, 21, "goat"],
  ["Fish curry", "1 katori (150 g)", 180, 20, 5, 9, "kerala meen"],
  ["Prawn curry", "1 katori (150 g)", 200, 20, 6, 10, "chemmeen"],
  ["Egg curry", "2 eggs + gravy", 260, 14, 8, 19, "egg"],
  // Protein
  ["Egg (boiled)", "1 large", 78, 6.3, 0.6, 5.3, "egg protein"],
  ["Egg whites", "3 whites", 51, 11, 0.7, 0.2, "egg protein"],
  ["Omelette", "2 eggs", 190, 13, 1.5, 15, "egg"],
  ["Egg bhurji", "2 eggs", 200, 13, 3, 15, "egg scrambled"],
  ["Chicken breast (cooked)", "100 g", 165, 31, 0, 3.6, "grilled protein"],
  ["Chicken tikka", "100 g", 150, 25, 3, 5, "tandoori"],
  ["Fish fry", "1 piece (100 g)", 200, 20, 4, 11, "kerala meen"],
  ["Paneer", "100 g", 265, 18, 1.2, 20, "cottage cheese"],
  ["Tofu", "100 g", 76, 8, 1.9, 4.8, "soy"],
  ["Soya chunks (dry)", "30 g", 104, 16, 10, 0.2, "soy nuggets meal maker"],
  ["Whey protein", "1 scoop (30 g)", 120, 24, 3, 1.5, "shake supplement"],
  ["Boiled chickpeas", "1 cup (164 g)", 269, 14.5, 45, 4.2, "chana"],
  ["Moong sprouts", "1 cup (100 g)", 31, 3, 6, 0.2, "salad"],
  ["Greek yogurt (low-fat)", "100 g", 73, 10, 4, 2, "hung curd"],
  // Dairy & drinks
  ["Milk (toned)", "1 glass (250 ml)", 145, 8, 12, 7.5, "doodh"],
  ["Curd / dahi", "1 katori (150 g)", 90, 5, 7, 4.5, "yogurt"],
  ["Buttermilk", "1 glass", 40, 2, 5, 1, "chaas moru"],
  ["Sweet lassi", "1 glass (250 ml)", 250, 8, 35, 7, "drink"],
  ["Tea with milk & sugar", "1 cup", 70, 2, 10, 2, "chai"],
  ["Coffee with milk & sugar", "1 cup", 80, 2, 11, 2.5, "filter coffee"],
  ["Black coffee", "1 cup", 2, 0.3, 0, 0, "americano"],
  ["Coconut water", "1 glass (240 ml)", 46, 1.7, 9, 0.5, "tender coconut"],
  ["Orange juice (fresh)", "1 glass (250 ml)", 112, 1.7, 26, 0.5, "juice"],
  ["Cola", "1 can (330 ml)", 139, 0, 35, 0, "soft drink coke pepsi"],
  ["Beer", "1 bottle (330 ml)", 150, 1.6, 13, 0, "alcohol"],
  // Fruit & veg
  ["Banana", "1 medium", 105, 1.3, 27, 0.4, "fruit"],
  ["Apple", "1 medium", 95, 0.5, 25, 0.3, "fruit"],
  ["Orange", "1 medium", 62, 1.2, 15, 0.2, "fruit"],
  ["Mango", "1 cup (165 g)", 99, 1.4, 25, 0.6, "fruit"],
  ["Papaya", "1 cup (145 g)", 62, 0.7, 16, 0.4, "fruit"],
  ["Watermelon", "1 cup (150 g)", 46, 0.9, 11.5, 0.2, "fruit"],
  ["Guava", "1 medium", 37, 1.4, 8, 0.5, "fruit"],
  ["Grapes", "1 cup (150 g)", 104, 1.1, 27, 0.2, "fruit"],
  ["Dates", "2 pieces", 45, 0.4, 12, 0, "khajoor"],
  ["Boiled potato", "1 medium (150 g)", 130, 3, 30, 0.2, "aloo"],
  ["Sweet potato (boiled)", "1 medium (150 g)", 130, 2.4, 30, 0.2, "shakarkand"],
  ["Vegetable salad", "1 bowl", 50, 2, 10, 0.3, "cucumber tomato"],
  ["Tomato soup", "1 bowl (250 ml)", 90, 2, 15, 2.5, "soup"],
  ["Chicken soup", "1 bowl (250 ml)", 100, 8, 8, 4, "soup"],
  // Nuts, fats, extras
  ["Almonds", "10 pieces", 70, 2.5, 2.5, 6, "badam nuts"],
  ["Cashews", "10 pieces", 85, 2.7, 4.5, 6.6, "kaju nuts"],
  ["Peanuts", "30 g", 170, 7.7, 4.8, 14.8, "groundnut"],
  ["Peanut butter", "1 tbsp (16 g)", 95, 3.5, 3.5, 8, "spread"],
  ["Ghee", "1 tsp", 45, 0, 0, 5, "fat"],
  ["Butter", "1 tsp", 36, 0, 0, 4, "fat"],
  ["Cooking oil", "1 tsp", 40, 0, 0, 4.5, "fat"],
  ["Sugar", "1 tsp", 16, 0, 4, 0, "sweet"],
  ["Dark chocolate", "20 g", 120, 1.5, 9, 8.5, "sweet"],
  // Snacks & sweets
  ["Samosa", "1 piece", 260, 4, 30, 14, "snack fried"],
  ["Vada pav", "1 piece", 290, 6, 40, 12, "snack mumbai"],
  ["Pav bhaji", "1 plate", 400, 10, 55, 16, "snack"],
  ["Pani puri", "6 pieces", 200, 4, 30, 7, "chaat golgappa"],
  ["Veg sandwich", "1 sandwich", 250, 7, 35, 9, "snack"],
  ["Pizza", "1 slice", 285, 12, 36, 10, "fast food"],
  ["Burger", "1 burger", 300, 15, 33, 12, "fast food"],
  ["Potato chips", "1 small pack (30 g)", 160, 2, 15, 10, "snack"],
  ["Marie biscuits", "4 biscuits", 125, 2, 21, 3.5, "snack"],
  ["Banana chips", "30 g", 160, 0.7, 17, 10, "kerala snack"],
  ["Pazham pori", "1 piece", 180, 2, 28, 7, "kerala banana fritter"],
  ["Gulab jamun", "1 piece", 150, 2, 25, 5, "sweet"],
  ["Rasgulla", "1 piece", 120, 2, 26, 1, "sweet"],
  ["Payasam / kheer", "1 cup (150 g)", 220, 6, 32, 7, "sweet"],
  ["Ladoo", "1 piece (40 g)", 180, 3, 22, 9, "sweet"],
  ["Ice cream", "1 scoop", 137, 2.3, 16, 7.3, "dessert"],
];

export const FOODS = RAW.map(([name, unit, cal, p, c, f, tags], i) => ({ id: `db-${i}`, name, unit, cal, p, c, f, tags: tags || "" }));

export function searchFoods(q, extra = []) {
  const all = [...extra, ...FOODS];
  const s = q.trim().toLowerCase();
  if (!s) return all;
  const words = s.split(/\s+/);
  return all
    .map((x) => {
      const hay = `${x.name} ${x.tags || ""}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      return { x, score: x.name.toLowerCase().startsWith(s) ? 0 : x.name.toLowerCase().includes(s) ? 1 : 2 };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.x);
}
