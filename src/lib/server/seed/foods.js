// Curated starter food database with common Japanese/konbini staples.
// basis '100g' → macros per 100 g; basis 'unit' → macros per 1 unit (unit_label).
// Approximate values; editable/expandable in-app.
export const FOODS = [
  // --- Carbs / staples ---
  { name: 'White rice (cooked)', name_ja: '白米 ごはん', basis: '100g', kcal: 156, protein: 2.5, fat: 0.3, carbs: 37.1, fibre: 1.5, tags: 'carb,staple' },
  { name: 'Genmai brown rice (cooked)', name_ja: '玄米 ごはん', basis: '100g', kcal: 152, protein: 2.8, fat: 1.0, carbs: 35.6, fibre: 1.4, tags: 'carb,staple' },
  { name: 'White/genmai rice mix (cooked)', name_ja: '白米・玄米ミックス ごはん', basis: '100g', kcal: 154, protein: 2.7, fat: 0.7, carbs: 36.4, fibre: 1.5, tags: 'carb,staple' },
  { name: 'Onigiri (konbini)', name_ja: 'おにぎり', basis: 'unit', unit_label: '1 onigiri', kcal: 175, protein: 3.5, fat: 0.5, carbs: 39, fibre: 0.5, tags: 'carb,konbini' },
  { name: '7-Eleven grilled salmon onigiri', name_ja: '手巻おにぎり 炭火焼銀しゃけ', brand: '7-Eleven', basis: 'unit', unit_label: '1 onigiri', kcal: 182, protein: 4.5, fat: 2.7, carbs: 35.9, fibre: 1.9, tags: 'carb,protein,konbini,7-eleven,lunch' },
  { name: 'Rice cake', name_ja: 'ライスケーキ', basis: 'unit', unit_label: '1 cake', kcal: 35, protein: 0.7, fat: 0.3, carbs: 7, fibre: 0.3, tags: 'carb,snack' },
  { name: 'Sweet potato (cooked)', name_ja: 'さつまいも', basis: '100g', kcal: 90, protein: 2, fat: 0.1, carbs: 21, fibre: 3.3, tags: 'carb' },

  // --- Protein ---
  { name: 'Chicken breast (cooked, skinless)', name_ja: '鶏むね肉', basis: '100g', kcal: 165, protein: 31, fat: 3.6, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Salada chicken (konbini)', name_ja: 'サラダチキン', basis: 'unit', unit_label: '1 pack (~115g)', kcal: 115, protein: 25, fat: 1.5, carbs: 0.5, fibre: 0, tags: 'protein,konbini' },
  { name: 'Salmon (cooked)', name_ja: '鮭', basis: '100g', kcal: 208, protein: 22, fat: 13, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Grilled salmon (konbini)', name_ja: '焼き鮭', basis: 'unit', unit_label: '1 pack (~80g)', kcal: 160, protein: 20, fat: 9, carbs: 0.2, fibre: 0, tags: 'protein,konbini,fish' },
  { name: 'Lean beef (cooked, ~90/10)', name_ja: '牛赤身肉', basis: '100g', kcal: 217, protein: 26.1, fat: 11.8, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Egg (large)', name_ja: '卵', basis: 'unit', unit_label: '1 egg', kcal: 72, protein: 6.3, fat: 4.8, carbs: 0.4, fibre: 0, tags: 'protein' },
  { name: 'Boiled egg (konbini)', name_ja: '味付けたまご', basis: 'unit', unit_label: '1 egg', kcal: 70, protein: 6, fat: 5, carbs: 0.5, fibre: 0, tags: 'protein,konbini' },
  { name: 'Greek yogurt (0–2% fat)', name_ja: 'ギリシャヨーグルト', basis: '100g', kcal: 60, protein: 10, fat: 0.4, carbs: 3.6, fibre: 0, tags: 'protein,dairy,yoghurt' },
  { name: 'Firm tofu (momen)', name_ja: '木綿豆腐', basis: '100g', kcal: 76, protein: 8, fat: 4.8, carbs: 1.9, fibre: 0.4, tags: 'protein,veg' },
  { name: 'Whey protein', name_ja: 'ホエイプロテイン', basis: 'unit', unit_label: '1 scoop (~30g)', kcal: 120, protein: 24, fat: 1.5, carbs: 3, fibre: 0, tags: 'protein,supplement' },

  // --- Veg / soup / fruit ---
  { name: 'Miso soup', name_ja: '味噌汁', basis: 'unit', unit_label: '1 bowl', kcal: 35, protein: 3, fat: 1, carbs: 4, fibre: 1, tags: 'veg,soup' },
  { name: 'Broccoli (cooked)', name_ja: 'ブロッコリー', basis: '100g', kcal: 35, protein: 2.4, fat: 0.4, carbs: 7, fibre: 3.3, tags: 'veg' },
  { name: 'Mixed vegetables (cooked)', name_ja: '温野菜', basis: '100g', kcal: 42, protein: 2, fat: 0.3, carbs: 8, fibre: 3, tags: 'veg' },
  { name: 'Cabbage (raw)', name_ja: 'キャベツ', basis: '100g', kcal: 25, protein: 1.3, fat: 0.1, carbs: 6, fibre: 2.5, tags: 'veg' },
  { name: 'Spinach (cooked)', name_ja: 'ほうれん草', basis: '100g', kcal: 23, protein: 3, fat: 0.4, carbs: 3.8, fibre: 2.4, tags: 'veg' },
  { name: 'Banana', name_ja: 'バナナ', basis: 'unit', unit_label: '1 medium', kcal: 105, protein: 1.3, fat: 0.4, carbs: 27, fibre: 3.1, tags: 'fruit' },
  { name: 'Apple', name_ja: 'りんご', basis: 'unit', unit_label: '1 medium', kcal: 95, protein: 0.5, fat: 0.3, carbs: 25, fibre: 4.4, tags: 'fruit' },
  { name: 'Mikan (mandarin)', name_ja: 'みかん', basis: 'unit', unit_label: '1 fruit', kcal: 45, protein: 0.7, fat: 0.2, carbs: 11, fibre: 1.4, tags: 'fruit' },

  // --- Fats / extras ---
  { name: 'Olive oil', name_ja: 'オリーブオイル', basis: 'unit', unit_label: '1 tbsp', kcal: 119, protein: 0, fat: 13.5, carbs: 0, fibre: 0, tags: 'fat' },
  { name: 'Rapeseed/canola oil', name_ja: 'キャノーラ油', basis: 'unit', unit_label: '1 tbsp', kcal: 124, protein: 0, fat: 14, carbs: 0, fibre: 0, tags: 'fat' },

  // --- Prepared meals / bento (macros ESTIMATED from typical chain & konbini portions) ---
  { name: 'Gyumeshi bento (regular)', name_ja: '牛めし弁当 並盛', basis: 'unit', unit_label: '1 bento (~350 g)', kcal: 650, protein: 21, fat: 20, carbs: 95, fibre: 2, tags: 'meal,bento,konbini,estimated' },
  { name: 'Gyumeshi bento (large)', name_ja: '牛めし弁当 大盛', basis: 'unit', unit_label: '1 bento (~470 g)', kcal: 880, protein: 27, fat: 26, carbs: 132, fibre: 2.5, tags: 'meal,bento,konbini,estimated' },
  { name: 'Katsu sando (konbini)', name_ja: 'カツサンド', basis: 'unit', unit_label: '1 pack (2 pieces)', kcal: 470, protein: 17, fat: 22, carbs: 51, fibre: 2, tags: 'meal,konbini,estimated' },

  // --- Home-cooked (recipe ESTIMATES — see comment for the batch they assume) ---
  // Chili: 500 g raw 85/15 beef mince (fat not drained) + 240 g drained canned kidney beans
  // + 300 g onion + 400 g canned tomatoes + chili powder. Batch ≈ 1570 kcal / 118 P / 79 F / 97 C,
  // cooking down from 1450 g raw to ~1200 g finished. Add ~120 kcal + 14 g fat to the batch if
  // fried in a tbsp of oil; drop ~195 kcal and 25 g fat if using 90/10 mince or draining the fat.
  { name: 'Chili con carne (home-made)', name_ja: 'チリコンカン', basis: '100g', kcal: 131, protein: 9.8, fat: 6.6, carbs: 8.1, fibre: 2.3, tags: 'meal,home-cooked,protein,estimated' },

  // --- Treats ---
  { name: 'Snickers (fun-size)', name_ja: 'スニッカーズ ミニ', basis: 'unit', unit_label: '1 fun-size', kcal: 96, protein: 1.7, fat: 4.8, carbs: 11.6, fibre: 0.3, tags: 'treat' },
  { name: 'Snickers (full bar)', name_ja: 'スニッカーズ', basis: 'unit', unit_label: '1 bar', kcal: 250, protein: 4, fat: 12, carbs: 33, fibre: 1, tags: 'treat' },
  { name: 'Red wine', name_ja: '赤ワイン', basis: 'unit', unit_label: '1 glass (150ml)', kcal: 125, protein: 0, fat: 0, carbs: 4, fibre: 0, tags: 'treat,alcohol' },
  { name: 'Black coffee', name_ja: 'ブラックコーヒー', basis: 'unit', unit_label: '1 cup', kcal: 5, protein: 0.3, fat: 0, carbs: 0, fibre: 0, tags: 'drink' }
  ,

  // ===========================================================================
  // Expansion — general-purpose tracker coverage.
  // Per-100g values are for the food AS EATEN (cooked where that's how it's served).
  // Unit entries use a realistic serving so common foods are one tap, not a weighing job.
  // ===========================================================================

  // --- Bread & baked ---
  { name: 'Shokupan (Japanese white bread), 6-slice loaf', name_ja: '食パン 6枚切り', basis: 'unit', unit_label: '1 slice (~60g)', kcal: 156, protein: 5.4, fat: 2.5, carbs: 28, fibre: 1.4, tags: 'carb,bread,staple,toast' },
  { name: 'Shokupan (Japanese white bread), 8-slice loaf', name_ja: '食パン 8枚切り', basis: 'unit', unit_label: '1 slice (~45g)', kcal: 117, protein: 4.1, fat: 1.9, carbs: 21, fibre: 1.0, tags: 'carb,bread,staple,toast' },
  { name: 'White bread', name_ja: '白パン', basis: '100g', kcal: 290, protein: 9, fat: 3.6, carbs: 49, fibre: 2.7, tags: 'carb,bread,staple,toast' },
  { name: 'White bread slice', name_ja: '白パン 1枚', basis: 'unit', unit_label: '1 slice (~40g)', kcal: 116, protein: 3.6, fat: 1.4, carbs: 19.6, fibre: 1.1, tags: 'carb,bread,staple,toast' },
  { name: 'Wholemeal bread', name_ja: '全粒粉パン', basis: '100g', kcal: 247, protein: 13, fat: 4.2, carbs: 41, fibre: 7, tags: 'carb,bread,staple,toast,wholewheat' },
  { name: 'Wholemeal bread slice', name_ja: '全粒粉パン 1枚', basis: 'unit', unit_label: '1 slice (~40g)', kcal: 99, protein: 5.2, fat: 1.4, carbs: 16.4, fibre: 2.8, tags: 'carb,bread,staple,toast,wholewheat' },
  { name: 'Bread roll', name_ja: 'ロールパン', basis: 'unit', unit_label: '1 roll (~50g)', kcal: 145, protein: 5, fat: 2.5, carbs: 26, fibre: 1.2, tags: 'carb,bread,bun' },
  { name: 'Bagel', name_ja: 'ベーグル', basis: 'unit', unit_label: '1 bagel (~90g)', kcal: 231, protein: 9, fat: 1.5, carbs: 48, fibre: 2, tags: 'carb,bread' },
  { name: 'Croissant', name_ja: 'クロワッサン', basis: 'unit', unit_label: '1 croissant (~60g)', kcal: 240, protein: 5, fat: 12, carbs: 27, fibre: 1.5, tags: 'carb,bread,treat' },
  { name: 'Pitta bread', name_ja: 'ピタパン', basis: 'unit', unit_label: '1 pitta (~60g)', kcal: 165, protein: 5.5, fat: 0.7, carbs: 33, fibre: 1.3, tags: 'carb,bread' },
  { name: 'Tortilla wrap', name_ja: 'トルティーヤ', basis: 'unit', unit_label: '1 wrap (~62g)', kcal: 190, protein: 5, fat: 4.5, carbs: 32, fibre: 2, tags: 'carb,bread,burrito,fajita' },
  { name: 'Naan', name_ja: 'ナン', basis: 'unit', unit_label: '1 naan (~90g)', kcal: 262, protein: 8, fat: 5, carbs: 45, fibre: 2, tags: 'carb,bread' },

  // --- Noodles, pasta, grains, cereal ---
  { name: 'Pasta (cooked)', name_ja: 'パスタ', basis: '100g', kcal: 158, protein: 5.8, fat: 0.9, carbs: 30, fibre: 1.8, tags: 'carb,staple,spaghetti,penne,macaroni,fusilli,linguine,tagliatelle,rigatoni,farfalle,lasagne,pasta' },
  { name: 'Wholewheat pasta (cooked)', name_ja: '全粒粉パスタ', basis: '100g', kcal: 149, protein: 5.3, fat: 1.1, carbs: 30, fibre: 4.5, tags: 'carb,staple,spaghetti,penne,macaroni,fusilli,linguine,wholemeal' },
  { name: 'Udon (cooked)', name_ja: 'うどん', basis: '100g', kcal: 105, protein: 2.6, fat: 0.4, carbs: 21.6, fibre: 0.8, tags: 'carb,noodle,staple' },
  { name: 'Soba (cooked)', name_ja: 'そば', basis: '100g', kcal: 99, protein: 4.8, fat: 0.1, carbs: 22, fibre: 1.5, tags: 'carb,noodle,staple' },
  { name: 'Ramen noodles (fresh, cooked)', name_ja: '中華麺', basis: '100g', kcal: 149, protein: 4.9, fat: 1, carbs: 29, fibre: 1.5, tags: 'carb,noodle' },
  { name: 'Instant ramen (1 pack)', name_ja: 'インスタントラーメン', basis: 'unit', unit_label: '1 pack', kcal: 450, protein: 10, fat: 19, carbs: 60, fibre: 2, tags: 'carb,noodle,convenience' },
  { name: 'Oats (dry)', name_ja: 'オートミール', basis: '100g', kcal: 379, protein: 13.2, fat: 6.5, carbs: 67.7, fibre: 10.1, tags: 'carb,breakfast,staple' },
  { name: 'Porridge (made with water)', name_ja: 'オートミール粥', basis: '100g', kcal: 71, protein: 2.5, fat: 1.5, carbs: 12, fibre: 1.7, tags: 'carb,breakfast' },
  { name: 'Cornflakes', name_ja: 'コーンフレーク', basis: '100g', kcal: 357, protein: 8, fat: 0.4, carbs: 84, fibre: 3, tags: 'carb,breakfast' },
  { name: 'Granola', name_ja: 'グラノーラ', basis: '100g', kcal: 470, protein: 10, fat: 20, carbs: 60, fibre: 7, tags: 'carb,breakfast' },
  { name: 'Quinoa (cooked)', name_ja: 'キヌア', basis: '100g', kcal: 120, protein: 4.4, fat: 1.9, carbs: 21, fibre: 2.8, tags: 'carb,staple' },
  { name: 'Couscous (cooked)', name_ja: 'クスクス', basis: '100g', kcal: 112, protein: 3.8, fat: 0.2, carbs: 23, fibre: 1.4, tags: 'carb,staple' },
  { name: 'Mochi', name_ja: '餅', basis: 'unit', unit_label: '1 piece (~50g)', kcal: 117, protein: 2, fat: 0.3, carbs: 25, fibre: 0.3, tags: 'carb' },

  // --- Potato & starches ---
  { name: 'Potato (boiled)', name_ja: 'じゃがいも 茹で', basis: '100g', kcal: 87, protein: 2, fat: 0.1, carbs: 20, fibre: 1.8, tags: 'carb,veg,staple' },
  { name: 'Potato (baked)', name_ja: 'じゃがいも 焼き', basis: '100g', kcal: 93, protein: 2.5, fat: 0.1, carbs: 21, fibre: 2.2, tags: 'carb,veg,staple' },
  { name: 'Chips / french fries', name_ja: 'フライドポテト', basis: '100g', kcal: 312, protein: 3.4, fat: 15, carbs: 41, fibre: 3.8, tags: 'carb,treat' },

  // --- Meat & poultry ---
  { name: 'Chicken thigh (cooked, skinless)', name_ja: '鶏もも肉 皮なし', basis: '100g', kcal: 179, protein: 24.8, fat: 8.2, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Chicken thigh (cooked, with skin)', name_ja: '鶏もも肉 皮つき', basis: '100g', kcal: 247, protein: 24, fat: 16, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Chicken mince (cooked)', name_ja: '鶏ひき肉', basis: '100g', kcal: 189, protein: 23, fat: 10, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Pork loin (cooked)', name_ja: '豚ロース', basis: '100g', kcal: 180, protein: 26.8, fat: 7.3, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Pork belly (cooked)', name_ja: '豚バラ', basis: '100g', kcal: 518, protein: 9.3, fat: 53, carbs: 0, fibre: 0, tags: 'protein,fat' },
  { name: 'Pork mince (cooked)', name_ja: '豚ひき肉', basis: '100g', kcal: 297, protein: 26, fat: 21, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Beef mince (cooked, ~80/20)', name_ja: '牛ひき肉', basis: '100g', kcal: 272, protein: 26, fat: 18, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Sirloin steak (cooked)', name_ja: 'サーロインステーキ', basis: '100g', kcal: 244, protein: 27, fat: 15, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Bacon (cooked)', name_ja: 'ベーコン', basis: '100g', kcal: 541, protein: 37, fat: 42, carbs: 1.4, fibre: 0, tags: 'protein,fat' },
  { name: 'Ham (sliced)', name_ja: 'ハム', basis: '100g', kcal: 145, protein: 18, fat: 7.7, carbs: 1.5, fibre: 0, tags: 'protein' },
  { name: 'Sausage', name_ja: 'ソーセージ', basis: 'unit', unit_label: '1 sausage (~60g)', kcal: 170, protein: 8, fat: 14, carbs: 2, fibre: 0, tags: 'protein,fat' },
  { name: 'Karaage (fried chicken)', name_ja: '唐揚げ', basis: '100g', kcal: 290, protein: 16, fat: 18, carbs: 13, fibre: 0.5, tags: 'protein,japanese,treat' },
  { name: 'Yakitori skewer', name_ja: '焼き鳥', basis: 'unit', unit_label: '1 skewer', kcal: 80, protein: 8, fat: 4, carbs: 3, fibre: 0, tags: 'protein,japanese' },

  // --- Fish & seafood ---
  { name: 'Tuna (canned in water, drained)', name_ja: 'ツナ缶 水煮', basis: '100g', kcal: 116, protein: 25.5, fat: 0.8, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Tuna (canned in oil, drained)', name_ja: 'ツナ缶 油漬け', basis: '100g', kcal: 198, protein: 29, fat: 8.2, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Maguro sashimi (tuna)', name_ja: 'まぐろ 刺身', basis: '100g', kcal: 125, protein: 26, fat: 1.4, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Saba (mackerel, grilled)', name_ja: '焼き鯖', basis: '100g', kcal: 262, protein: 24, fat: 17, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'White fish (cod, cooked)', name_ja: 'たら', basis: '100g', kcal: 105, protein: 23, fat: 0.9, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Prawns / shrimp (cooked)', name_ja: 'えび', basis: '100g', kcal: 99, protein: 24, fat: 0.3, carbs: 0.2, fibre: 0, tags: 'protein,fish' },
  { name: 'Sardines (canned)', name_ja: 'いわし缶', basis: '100g', kcal: 208, protein: 25, fat: 11, carbs: 0, fibre: 0, tags: 'protein,fish' },

  // --- Eggs & dairy ---
  { name: 'Egg white', name_ja: '卵白', basis: 'unit', unit_label: '1 white', kcal: 17, protein: 3.6, fat: 0.1, carbs: 0.2, fibre: 0, tags: 'protein' },
  { name: 'Tamagoyaki', name_ja: '卵焼き', basis: '100g', kcal: 146, protein: 11, fat: 9, carbs: 6, fibre: 0, tags: 'protein,japanese' },
  { name: 'Milk (whole)', name_ja: '牛乳', basis: 'ml', kcal: 64, protein: 3.4, fat: 3.6, carbs: 4.7, fibre: 0, tags: 'protein,dairy,drink' },
  { name: 'Milk (semi-skimmed)', name_ja: '低脂肪牛乳', basis: 'ml', kcal: 46, protein: 3.5, fat: 1.7, carbs: 4.8, fibre: 0, tags: 'protein,dairy,drink' },
  { name: 'Milk (skimmed)', name_ja: '無脂肪牛乳', basis: 'ml', kcal: 35, protein: 3.5, fat: 0.1, carbs: 5, fibre: 0, tags: 'protein,dairy,drink' },
  { name: 'Soy milk (unsweetened)', name_ja: '無調整豆乳', basis: 'ml', kcal: 44, protein: 3.6, fat: 2.2, carbs: 1.5, fibre: 0.4, tags: 'protein,drink' },
  { name: 'Greek yogurt (full fat)', name_ja: 'ギリシャヨーグルト 全脂', basis: '100g', kcal: 97, protein: 9, fat: 5, carbs: 4, fibre: 0, tags: 'protein,dairy,yoghurt' },
  { name: 'Plain yogurt (whole)', name_ja: 'プレーンヨーグルト', basis: '100g', kcal: 61, protein: 3.5, fat: 3.3, carbs: 4.7, fibre: 0, tags: 'protein,dairy,yoghurt' },
  { name: 'Cottage cheese', name_ja: 'カッテージチーズ', basis: '100g', kcal: 98, protein: 11, fat: 4.3, carbs: 3.4, fibre: 0, tags: 'protein,dairy,cheese' },
  { name: 'Cheddar cheese', name_ja: 'チェダーチーズ', basis: '100g', kcal: 402, protein: 25, fat: 33, carbs: 1.3, fibre: 0, tags: 'protein,dairy,fat,cheese' },
  { name: 'Mozzarella', name_ja: 'モッツァレラ', basis: '100g', kcal: 280, protein: 22, fat: 22, carbs: 2.2, fibre: 0, tags: 'protein,dairy,fat,cheese' },
  { name: 'Cream cheese', name_ja: 'クリームチーズ', basis: '100g', kcal: 342, protein: 6, fat: 34, carbs: 4, fibre: 0, tags: 'dairy,fat,cheese' },
  { name: 'Butter', name_ja: 'バター', basis: 'unit', unit_label: '1 tsp (~5g)', kcal: 36, protein: 0, fat: 4, carbs: 0, fibre: 0, tags: 'fat,oil' },

  // --- Plant protein & pulses ---
  { name: 'Silken tofu (kinugoshi)', name_ja: '絹ごし豆腐', basis: '100g', kcal: 55, protein: 4.8, fat: 2.7, carbs: 2, fibre: 0.3, tags: 'protein,veg' },
  { name: 'Atsuage (fried tofu)', name_ja: '厚揚げ', basis: '100g', kcal: 150, protein: 10.7, fat: 11, carbs: 0.9, fibre: 0.7, tags: 'protein,veg,japanese' },
  { name: 'Natto', name_ja: '納豆', basis: '100g', kcal: 190, protein: 16.5, fat: 10, carbs: 12, fibre: 6.7, tags: 'protein,veg,japanese,beans' },
  { name: 'Edamame (shelled, cooked)', name_ja: '枝豆', basis: '100g', kcal: 122, protein: 11, fat: 5, carbs: 10, fibre: 5, tags: 'protein,veg,japanese,beans' },
  { name: 'Chickpeas (cooked)', name_ja: 'ひよこ豆', basis: '100g', kcal: 164, protein: 8.9, fat: 2.6, carbs: 27, fibre: 7.6, tags: 'protein,veg,beans' },
  { name: 'Lentils (cooked)', name_ja: 'レンズ豆', basis: '100g', kcal: 116, protein: 9, fat: 0.4, carbs: 20, fibre: 8, tags: 'protein,veg,beans' },
  { name: 'Kidney beans (cooked)', name_ja: '赤いんげん豆', basis: '100g', kcal: 127, protein: 8.7, fat: 0.5, carbs: 23, fibre: 6.4, tags: 'protein,veg' },

  // --- Nuts, seeds & added fats ---
  { name: 'Almonds', name_ja: 'アーモンド', basis: '100g', kcal: 579, protein: 21, fat: 50, carbs: 22, fibre: 12.5, tags: 'fat,snack,nuts' },
  { name: 'Walnuts', name_ja: 'くるみ', basis: '100g', kcal: 654, protein: 15, fat: 65, carbs: 14, fibre: 6.7, tags: 'fat,snack,nuts' },
  { name: 'Peanuts', name_ja: 'ピーナッツ', basis: '100g', kcal: 567, protein: 26, fat: 49, carbs: 16, fibre: 8.5, tags: 'fat,snack,nuts' },
  { name: 'Peanut butter', name_ja: 'ピーナッツバター', basis: 'unit', unit_label: '1 tbsp (~16g)', kcal: 94, protein: 4, fat: 8, carbs: 3.2, fibre: 1, tags: 'fat,spread' },
  { name: 'Avocado', name_ja: 'アボカド', basis: 'unit', unit_label: '1/2 avocado (~100g)', kcal: 160, protein: 2, fat: 15, carbs: 9, fibre: 7, tags: 'fat,veg' },
  { name: 'Sesame oil', name_ja: 'ごま油', basis: 'unit', unit_label: '1 tbsp', kcal: 120, protein: 0, fat: 14, carbs: 0, fibre: 0, tags: 'fat' },
  { name: 'Mayonnaise', name_ja: 'マヨネーズ', basis: 'unit', unit_label: '1 tbsp (~14g)', kcal: 94, protein: 0.1, fat: 10, carbs: 0.6, fibre: 0, tags: 'fat,condiment' },

  // --- Vegetables ---
  { name: 'Carrot', name_ja: 'にんじん', basis: '100g', kcal: 41, protein: 0.9, fat: 0.2, carbs: 10, fibre: 2.8, tags: 'veg' },
  { name: 'Onion', name_ja: 'たまねぎ', basis: '100g', kcal: 40, protein: 1.1, fat: 0.1, carbs: 9, fibre: 1.7, tags: 'veg' },
  { name: 'Bell pepper', name_ja: 'パプリカ', basis: '100g', kcal: 31, protein: 1, fat: 0.3, carbs: 6, fibre: 2.1, tags: 'veg' },
  { name: 'Mushrooms', name_ja: 'マッシュルーム', basis: '100g', kcal: 22, protein: 3.1, fat: 0.3, carbs: 3.3, fibre: 1, tags: 'veg' },
  { name: 'Shiitake mushrooms', name_ja: 'しいたけ', basis: '100g', kcal: 34, protein: 2.2, fat: 0.5, carbs: 6.8, fibre: 2.5, tags: 'veg,japanese' },
  { name: 'Tomato', name_ja: 'トマト', basis: '100g', kcal: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fibre: 1.2, tags: 'veg' },
  { name: 'Cucumber', name_ja: 'きゅうり', basis: '100g', kcal: 15, protein: 0.7, fat: 0.1, carbs: 3.6, fibre: 0.5, tags: 'veg' },
  { name: 'Lettuce', name_ja: 'レタス', basis: '100g', kcal: 15, protein: 1.4, fat: 0.2, carbs: 2.9, fibre: 1.3, tags: 'veg' },
  { name: 'Aubergine / nasu', name_ja: 'なす', basis: '100g', kcal: 35, protein: 0.8, fat: 0.2, carbs: 9, fibre: 2.5, tags: 'veg,japanese' },
  { name: 'Courgette / zucchini', name_ja: 'ズッキーニ', basis: '100g', kcal: 17, protein: 1.2, fat: 0.3, carbs: 3.1, fibre: 1, tags: 'veg' },
  { name: 'Green beans', name_ja: 'いんげん', basis: '100g', kcal: 31, protein: 1.8, fat: 0.2, carbs: 7, fibre: 2.7, tags: 'veg' },
  { name: 'Daikon', name_ja: '大根', basis: '100g', kcal: 18, protein: 0.6, fat: 0.1, carbs: 4.1, fibre: 1.6, tags: 'veg,japanese' },
  { name: 'Bean sprouts (moyashi)', name_ja: 'もやし', basis: '100g', kcal: 30, protein: 3, fat: 0.2, carbs: 6, fibre: 1.8, tags: 'veg,japanese' },
  { name: 'Sweetcorn', name_ja: 'とうもろこし', basis: '100g', kcal: 86, protein: 3.3, fat: 1.2, carbs: 19, fibre: 2, tags: 'veg,carb' },
  { name: 'Kimchi', name_ja: 'キムチ', basis: '100g', kcal: 33, protein: 1.7, fat: 0.5, carbs: 6, fibre: 1.6, tags: 'veg' },
  { name: 'Nori sheet', name_ja: '海苔', basis: 'unit', unit_label: '1 sheet (~3g)', kcal: 10, protein: 1.2, fat: 0.1, carbs: 1.3, fibre: 1, tags: 'veg,japanese' },
  { name: 'Wakame (rehydrated)', name_ja: 'わかめ', basis: '100g', kcal: 45, protein: 3, fat: 0.6, carbs: 9, fibre: 0.5, tags: 'veg,japanese' },
  { name: 'Salad pack (leaves)', name_ja: 'サラダ', basis: 'unit', unit_label: '1 pack (~100g)', kcal: 20, protein: 1.5, fat: 0.2, carbs: 3.5, fibre: 1.5, tags: 'veg' },

  // --- Fruit ---
  { name: 'Orange', name_ja: 'オレンジ', basis: 'unit', unit_label: '1 medium', kcal: 62, protein: 1.2, fat: 0.2, carbs: 15, fibre: 3, tags: 'fruit' },
  { name: 'Strawberries', name_ja: 'いちご', basis: '100g', kcal: 32, protein: 0.7, fat: 0.3, carbs: 7.7, fibre: 2, tags: 'fruit' },
  { name: 'Blueberries', name_ja: 'ブルーベリー', basis: '100g', kcal: 57, protein: 0.7, fat: 0.3, carbs: 14, fibre: 2.4, tags: 'fruit' },
  { name: 'Grapes', name_ja: 'ぶどう', basis: '100g', kcal: 69, protein: 0.7, fat: 0.2, carbs: 18, fibre: 0.9, tags: 'fruit' },
  { name: 'Kiwi', name_ja: 'キウイ', basis: 'unit', unit_label: '1 fruit', kcal: 42, protein: 0.8, fat: 0.4, carbs: 10, fibre: 2, tags: 'fruit' },
  { name: 'Pineapple', name_ja: 'パイナップル', basis: '100g', kcal: 50, protein: 0.5, fat: 0.1, carbs: 13, fibre: 1.4, tags: 'fruit' },
  { name: 'Pear', name_ja: '洋なし', basis: 'unit', unit_label: '1 medium', kcal: 101, protein: 0.6, fat: 0.2, carbs: 27, fibre: 5.5, tags: 'fruit' },
  { name: 'Nashi pear', name_ja: '梨', basis: 'unit', unit_label: '1 fruit', kcal: 100, protein: 0.5, fat: 0.3, carbs: 26, fibre: 3, tags: 'fruit,japanese' },
  { name: 'Persimmon (kaki)', name_ja: '柿', basis: 'unit', unit_label: '1 fruit', kcal: 118, protein: 1, fat: 0.3, carbs: 31, fibre: 6, tags: 'fruit,japanese' },
  { name: 'Peach', name_ja: 'もも', basis: 'unit', unit_label: '1 medium', kcal: 59, protein: 1.4, fat: 0.4, carbs: 14, fibre: 2.3, tags: 'fruit' },
  { name: 'Melon', name_ja: 'メロン', basis: '100g', kcal: 34, protein: 0.8, fat: 0.2, carbs: 8, fibre: 0.9, tags: 'fruit' },
  { name: 'Watermelon', name_ja: 'すいか', basis: '100g', kcal: 30, protein: 0.6, fat: 0.2, carbs: 7.6, fibre: 0.4, tags: 'fruit' },
  { name: 'Raisins', name_ja: 'レーズン', basis: '100g', kcal: 299, protein: 3.1, fat: 0.5, carbs: 79, fibre: 3.7, tags: 'fruit,snack' },

  // --- Condiments & sauces ---
  { name: 'Soy sauce', name_ja: '醤油', basis: 'unit', unit_label: '1 tbsp', kcal: 9, protein: 1.3, fat: 0, carbs: 0.8, fibre: 0, tags: 'condiment,japanese' },
  { name: 'Mirin', name_ja: 'みりん', basis: 'unit', unit_label: '1 tbsp', kcal: 43, protein: 0.1, fat: 0, carbs: 8, fibre: 0, tags: 'condiment,japanese' },
  { name: 'Ponzu', name_ja: 'ポン酢', basis: 'unit', unit_label: '1 tbsp', kcal: 10, protein: 0.5, fat: 0, carbs: 1.8, fibre: 0, tags: 'condiment,japanese' },
  { name: 'Tonkatsu sauce', name_ja: 'とんかつソース', basis: 'unit', unit_label: '1 tbsp', kcal: 26, protein: 0.2, fat: 0, carbs: 6, fibre: 0, tags: 'condiment,japanese' },
  { name: 'Ketchup', name_ja: 'ケチャップ', basis: 'unit', unit_label: '1 tbsp', kcal: 17, protein: 0.2, fat: 0, carbs: 4.5, fibre: 0, tags: 'condiment' },
  { name: 'Salad dressing (oil-based)', name_ja: 'ドレッシング', basis: 'unit', unit_label: '1 tbsp', kcal: 60, protein: 0.1, fat: 6, carbs: 1.5, fibre: 0, tags: 'condiment,fat' },
  { name: 'Miso paste', name_ja: '味噌', basis: '100g', kcal: 199, protein: 12, fat: 6, carbs: 26, fibre: 5, tags: 'condiment,japanese' },
  { name: 'Curry roux block', name_ja: 'カレールー', basis: 'unit', unit_label: '1 block (~20g)', kcal: 100, protein: 1.3, fat: 6, carbs: 10, fibre: 0.7, tags: 'condiment,japanese' },
  { name: 'Sugar', name_ja: '砂糖', basis: 'unit', unit_label: '1 tsp', kcal: 16, protein: 0, fat: 0, carbs: 4, fibre: 0, tags: 'condiment' },
  { name: 'Honey', name_ja: 'はちみつ', basis: 'unit', unit_label: '1 tbsp', kcal: 64, protein: 0.1, fat: 0, carbs: 17, fibre: 0, tags: 'condiment' },

  // --- Drinks (incl. alcohol) ---
  { name: 'Coffee with milk', name_ja: 'カフェオレ', basis: 'unit', unit_label: '1 cup', kcal: 30, protein: 1.6, fat: 1.6, carbs: 2.3, fibre: 0, tags: 'drink' },
  { name: 'Latte', name_ja: 'カフェラテ', basis: 'unit', unit_label: '1 regular (~350ml)', kcal: 190, protein: 10, fat: 7, carbs: 19, fibre: 0, tags: 'drink' },
  { name: 'Green tea', name_ja: '緑茶', basis: 'unit', unit_label: '1 cup', kcal: 2, protein: 0, fat: 0, carbs: 0, fibre: 0, tags: 'drink,japanese' },
  { name: 'Beer', name_ja: 'ビール', basis: 'unit', unit_label: '1 can (350ml)', kcal: 145, protein: 1.1, fat: 0, carbs: 11, fibre: 0, tags: 'drink,alcohol,treat' },
  { name: 'Beer (pint)', name_ja: 'ビール パイント', basis: 'unit', unit_label: '1 pint (500ml)', kcal: 208, protein: 1.6, fat: 0, carbs: 16, fibre: 0, tags: 'drink,alcohol,treat' },
  { name: 'Highball', name_ja: 'ハイボール', basis: 'unit', unit_label: '1 glass', kcal: 100, protein: 0, fat: 0, carbs: 0, fibre: 0, tags: 'drink,alcohol,treat' },
  { name: 'Sake', name_ja: '日本酒', basis: 'unit', unit_label: '1 glass (180ml)', kcal: 195, protein: 0.7, fat: 0, carbs: 6.5, fibre: 0, tags: 'drink,alcohol,treat,japanese' },
  { name: 'Shochu', name_ja: '焼酎', basis: 'unit', unit_label: '1 serving (90ml)', kcal: 130, protein: 0, fat: 0, carbs: 0, fibre: 0, tags: 'drink,alcohol,treat,japanese' },
  { name: 'Whisky', name_ja: 'ウイスキー', basis: 'unit', unit_label: '1 shot (30ml)', kcal: 70, protein: 0, fat: 0, carbs: 0, fibre: 0, tags: 'drink,alcohol,treat' },
  { name: 'White wine', name_ja: '白ワイン', basis: 'unit', unit_label: '1 glass (150ml)', kcal: 120, protein: 0.1, fat: 0, carbs: 3.8, fibre: 0, tags: 'drink,alcohol,treat' },
  { name: 'Orange juice', name_ja: 'オレンジジュース', basis: 'ml', kcal: 45, protein: 0.7, fat: 0.2, carbs: 10, fibre: 0.2, tags: 'drink' },
  { name: 'Cola', name_ja: 'コーラ', basis: 'ml', kcal: 42, protein: 0, fat: 0, carbs: 10.6, fibre: 0, tags: 'drink,treat,coke' },
  { name: 'Diet cola', name_ja: 'ダイエットコーラ', basis: 'unit', unit_label: '1 can (350ml)', kcal: 1, protein: 0, fat: 0, carbs: 0, fibre: 0, tags: 'drink,coke,zero' },
  { name: 'Sports drink (Pocari)', name_ja: 'ポカリスエット', basis: 'ml', kcal: 25, protein: 0, fat: 0, carbs: 6.2, fibre: 0, tags: 'drink,japanese' },

  // --- Japanese dishes & konbini ---
  { name: 'Curry rice', name_ja: 'カレーライス', basis: 'unit', unit_label: '1 plate', kcal: 700, protein: 18, fat: 23, carbs: 105, fibre: 5, tags: 'meal,japanese' },
  { name: 'Gyoza', name_ja: '餃子', basis: 'unit', unit_label: '1 piece', kcal: 45, protein: 2, fat: 2, carbs: 4.5, fibre: 0.3, tags: 'japanese' },
  { name: 'Tonkatsu', name_ja: 'とんかつ', basis: '100g', kcal: 330, protein: 20, fat: 22, carbs: 13, fibre: 0.7, tags: 'protein,japanese,treat' },
  { name: 'Ramen (shoyu, 1 bowl)', name_ja: 'ラーメン 醤油', basis: 'unit', unit_label: '1 bowl', kcal: 500, protein: 22, fat: 15, carbs: 68, fibre: 4, tags: 'meal,japanese' },
  { name: 'Yakisoba', name_ja: '焼きそば', basis: 'unit', unit_label: '1 plate', kcal: 550, protein: 16, fat: 20, carbs: 75, fibre: 5, tags: 'meal,japanese,noodle' },
  { name: 'Oyakodon', name_ja: '親子丼', basis: 'unit', unit_label: '1 bowl', kcal: 620, protein: 30, fat: 15, carbs: 90, fibre: 3, tags: 'meal,japanese' },
  { name: 'Sushi nigiri', name_ja: '握り寿司', basis: 'unit', unit_label: '1 piece', kcal: 45, protein: 3, fat: 0.5, carbs: 7, fibre: 0.1, tags: 'japanese' },
  { name: 'Prawn tempura', name_ja: 'えび天', basis: 'unit', unit_label: '1 piece', kcal: 75, protein: 4, fat: 4, carbs: 6, fibre: 0.2, tags: 'japanese,treat' },
  { name: 'Oden (assorted piece)', name_ja: 'おでん', basis: 'unit', unit_label: '1 piece', kcal: 40, protein: 3, fat: 1.5, carbs: 3.5, fibre: 0.3, tags: 'japanese,konbini' },
  { name: 'Chawanmushi', name_ja: '茶碗蒸し', basis: 'unit', unit_label: '1 cup', kcal: 80, protein: 7, fat: 4, carbs: 3, fibre: 0.1, tags: 'japanese' },
  { name: 'Miso soup with tofu', name_ja: '豆腐の味噌汁', basis: 'unit', unit_label: '1 bowl', kcal: 45, protein: 3.5, fat: 1.8, carbs: 4, fibre: 0.8, tags: 'veg,soup,japanese' },

  // --- Snacks & treats ---
  { name: 'Dark chocolate (70%)', name_ja: 'ダークチョコレート', basis: '100g', kcal: 546, protein: 5, fat: 31, carbs: 61, fibre: 7, tags: 'treat' },
  { name: 'Milk chocolate', name_ja: 'ミルクチョコレート', basis: '100g', kcal: 535, protein: 7.7, fat: 30, carbs: 59, fibre: 3.4, tags: 'treat' },
  { name: 'Potato crisps', name_ja: 'ポテトチップス', basis: '100g', kcal: 536, protein: 7, fat: 35, carbs: 53, fibre: 4.8, tags: 'treat,snack' },
  { name: 'Ice cream (vanilla)', name_ja: 'アイスクリーム', basis: '100g', kcal: 207, protein: 3.5, fat: 11, carbs: 24, fibre: 0.7, tags: 'treat' },
  { name: 'Protein bar', name_ja: 'プロテインバー', basis: 'unit', unit_label: '1 bar', kcal: 200, protein: 20, fat: 7, carbs: 20, fibre: 3, tags: 'protein,snack' },
  { name: 'Biscuit / cookie', name_ja: 'ビスケット', basis: 'unit', unit_label: '1 biscuit', kcal: 50, protein: 0.6, fat: 2.3, carbs: 7, fibre: 0.2, tags: 'treat,snack' },
  { name: 'Senbei rice cracker', name_ja: 'せんべい', basis: 'unit', unit_label: '1 cracker', kcal: 40, protein: 0.7, fat: 0.3, carbs: 9, fibre: 0.2, tags: 'treat,snack,japanese' },
  { name: 'Melon pan', name_ja: 'メロンパン', basis: 'unit', unit_label: '1 bun', kcal: 350, protein: 7, fat: 12, carbs: 53, fibre: 1.6, tags: 'treat,japanese' },
  { name: 'Anpan', name_ja: 'あんぱん', basis: 'unit', unit_label: '1 bun', kcal: 280, protein: 7, fat: 5, carbs: 52, fibre: 2.5, tags: 'treat,japanese' }
  ,

  // --- Batch 3: filling gaps against a USDA-referenced macro table ---

  // Meat / fish
  { name: 'Turkey breast (cooked, skinless)', name_ja: '七面鳥 むね肉', basis: '100g', kcal: 135, protein: 30, fat: 1, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Lamb leg (lean, cooked)', name_ja: 'ラム もも肉', basis: '100g', kcal: 178, protein: 26, fat: 7.7, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Tilapia (cooked)', name_ja: 'ティラピア', basis: '100g', kcal: 129, protein: 26, fat: 2.7, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Trout (cooked)', name_ja: 'ます', basis: '100g', kcal: 168, protein: 24, fat: 6.6, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Squid / ika (cooked)', name_ja: 'いか', basis: '100g', kcal: 92, protein: 18, fat: 1.4, carbs: 3, fibre: 0, tags: 'protein,fish,japanese' },

  // Plant protein
  { name: 'Tempeh', name_ja: 'テンペ', basis: '100g', kcal: 192, protein: 19, fat: 11, carbs: 9.4, fibre: 6, tags: 'protein,veg' },
  { name: 'Seitan', name_ja: 'セイタン', basis: '100g', kcal: 170, protein: 25, fat: 2, carbs: 14, fibre: 1, tags: 'protein,veg' },
  { name: 'Black beans (cooked)', name_ja: '黒豆', basis: '100g', kcal: 132, protein: 8.9, fat: 0.5, carbs: 24, fibre: 8.7, tags: 'protein,veg' },
  { name: 'Pinto beans (cooked)', name_ja: 'ピント豆', basis: '100g', kcal: 143, protein: 9, fat: 0.7, carbs: 26, fibre: 9, tags: 'protein,veg' },
  { name: 'Green peas (cooked)', name_ja: 'グリーンピース', basis: '100g', kcal: 84, protein: 5.4, fat: 0.2, carbs: 16, fibre: 5.5, tags: 'veg,protein' },
  { name: 'Hummus', name_ja: 'フムス', basis: '100g', kcal: 177, protein: 7.9, fat: 10, carbs: 14, fibre: 6, tags: 'protein,veg,spread' },
  { name: 'Casein protein powder', name_ja: 'カゼインプロテイン', basis: 'unit', unit_label: '1 scoop (~30g)', kcal: 116, protein: 24, fat: 0.6, carbs: 2.7, fibre: 0, tags: 'protein,supplement' },
  { name: 'Whey protein isolate', name_ja: 'ホエイアイソレート', basis: 'unit', unit_label: '1 scoop (~30g)', kcal: 114, protein: 27, fat: 0.3, carbs: 1.2, fibre: 0, tags: 'protein,supplement' },

  // Grains
  { name: 'Rye bread', name_ja: 'ライ麦パン', basis: '100g', kcal: 259, protein: 8.5, fat: 3.3, carbs: 48, fibre: 5.8, tags: 'carb,bread' },
  { name: 'Sourdough bread', name_ja: 'サワードウ', basis: '100g', kcal: 231, protein: 9, fat: 2, carbs: 45, fibre: 2.4, tags: 'carb,bread' },
  { name: 'Buckwheat (cooked)', name_ja: 'そば米', basis: '100g', kcal: 92, protein: 3.4, fat: 0.6, carbs: 20, fibre: 2.7, tags: 'carb,staple' },
  { name: 'Bulgur wheat (cooked)', name_ja: 'ブルグア', basis: '100g', kcal: 83, protein: 3.1, fat: 0.2, carbs: 19, fibre: 4.5, tags: 'carb,staple' },
  { name: 'Pearl barley (cooked)', name_ja: '押し麦', basis: '100g', kcal: 123, protein: 2.3, fat: 0.4, carbs: 28, fibre: 3.8, tags: 'carb,staple' },
  { name: 'Corn tortilla', name_ja: 'コーントルティーヤ', basis: 'unit', unit_label: '1 tortilla (~26g)', kcal: 57, protein: 1.5, fat: 0.8, carbs: 12, fibre: 1.5, tags: 'carb,bread' },

  // Vegetables
  { name: 'Cauliflower', name_ja: 'カリフラワー', basis: '100g', kcal: 25, protein: 1.9, fat: 0.3, carbs: 5, fibre: 2, tags: 'veg' },
  { name: 'Brussels sprouts', name_ja: '芽キャベツ', basis: '100g', kcal: 43, protein: 3.4, fat: 0.3, carbs: 9, fibre: 3.8, tags: 'veg' },
  { name: 'Kale', name_ja: 'ケール', basis: '100g', kcal: 49, protein: 4.3, fat: 0.9, carbs: 9, fibre: 3.6, tags: 'veg' },
  { name: 'Asparagus', name_ja: 'アスパラガス', basis: '100g', kcal: 20, protein: 2.2, fat: 0.1, carbs: 3.9, fibre: 2.1, tags: 'veg' },
  { name: 'Bok choy', name_ja: 'チンゲン菜', basis: '100g', kcal: 13, protein: 1.5, fat: 0.2, carbs: 2.2, fibre: 1, tags: 'veg,japanese' },
  { name: 'Beetroot (cooked)', name_ja: 'ビーツ', basis: '100g', kcal: 44, protein: 1.7, fat: 0.2, carbs: 10, fibre: 2, tags: 'veg' },
  { name: 'Garlic', name_ja: 'にんにく', basis: '100g', kcal: 149, protein: 6.4, fat: 0.5, carbs: 33, fibre: 2.1, tags: 'veg,condiment' },
  { name: 'Rocket / arugula', name_ja: 'ルッコラ', basis: '100g', kcal: 25, protein: 2.6, fat: 0.7, carbs: 3.7, fibre: 1.6, tags: 'veg' },

  // Fruit
  { name: 'Mango', name_ja: 'マンゴー', basis: '100g', kcal: 60, protein: 0.8, fat: 0.4, carbs: 15, fibre: 1.6, tags: 'fruit' },
  { name: 'Grapefruit', name_ja: 'グレープフルーツ', basis: '100g', kcal: 42, protein: 0.8, fat: 0.1, carbs: 11, fibre: 1.6, tags: 'fruit' },
  { name: 'Raspberries', name_ja: 'ラズベリー', basis: '100g', kcal: 52, protein: 1.2, fat: 0.7, carbs: 12, fibre: 6.5, tags: 'fruit' },
  { name: 'Blackberries', name_ja: 'ブラックベリー', basis: '100g', kcal: 43, protein: 1.4, fat: 0.5, carbs: 10, fibre: 5.3, tags: 'fruit' },
  { name: 'Cherries', name_ja: 'さくらんぼ', basis: '100g', kcal: 63, protein: 1.1, fat: 0.2, carbs: 16, fibre: 2.1, tags: 'fruit' },
  { name: 'Medjool dates', name_ja: 'デーツ', basis: '100g', kcal: 277, protein: 1.8, fat: 0.2, carbs: 75, fibre: 6.7, tags: 'fruit,snack' },

  // Nuts & seeds
  { name: 'Cashews', name_ja: 'カシューナッツ', basis: '100g', kcal: 553, protein: 18, fat: 44, carbs: 30, fibre: 3.3, tags: 'fat,snack,nuts' },
  { name: 'Pistachios', name_ja: 'ピスタチオ', basis: '100g', kcal: 560, protein: 20, fat: 45, carbs: 28, fibre: 10, tags: 'fat,snack,nuts' },
  { name: 'Pecans', name_ja: 'ピーカンナッツ', basis: '100g', kcal: 691, protein: 9.2, fat: 72, carbs: 14, fibre: 9.6, tags: 'fat,snack,nuts' },
  { name: 'Hazelnuts', name_ja: 'ヘーゼルナッツ', basis: '100g', kcal: 628, protein: 15, fat: 61, carbs: 17, fibre: 9.7, tags: 'fat,snack,nuts' },
  { name: 'Brazil nuts', name_ja: 'ブラジルナッツ', basis: '100g', kcal: 656, protein: 14, fat: 66, carbs: 12, fibre: 7.5, tags: 'fat,snack,nuts' },
  { name: 'Sunflower seeds', name_ja: 'ひまわりの種', basis: '100g', kcal: 584, protein: 21, fat: 51, carbs: 20, fibre: 8.6, tags: 'fat,snack' },
  { name: 'Pumpkin seeds', name_ja: 'かぼちゃの種', basis: '100g', kcal: 559, protein: 30, fat: 49, carbs: 11, fibre: 6, tags: 'fat,snack' },
  { name: 'Sesame seeds', name_ja: 'ごま', basis: '100g', kcal: 573, protein: 18, fat: 50, carbs: 23, fibre: 12, tags: 'fat,japanese' },
  { name: 'Chia seeds', name_ja: 'チアシード', basis: '100g', kcal: 486, protein: 17, fat: 31, carbs: 42, fibre: 34, tags: 'fat,snack' },
  { name: 'Ground flaxseed', name_ja: '亜麻仁', basis: '100g', kcal: 534, protein: 18, fat: 42, carbs: 29, fibre: 27, tags: 'fat' },
  { name: 'Hemp seeds', name_ja: 'ヘンプシード', basis: '100g', kcal: 553, protein: 31, fat: 49, carbs: 9, fibre: 4, tags: 'fat,protein' },
  { name: 'Almond butter', name_ja: 'アーモンドバター', basis: 'unit', unit_label: '1 tbsp (~16g)', kcal: 98, protein: 3.4, fat: 9, carbs: 3, fibre: 1.6, tags: 'fat,spread' },
  { name: 'Tahini', name_ja: 'タヒニ', basis: '100g', kcal: 595, protein: 17, fat: 54, carbs: 21, fibre: 9.3, tags: 'fat,spread' },
  { name: 'Desiccated coconut (unsweetened)', name_ja: 'ココナッツフレーク', basis: '100g', kcal: 660, protein: 7.5, fat: 64, carbs: 24, fibre: 16, tags: 'fat,snack' },

  // Oils & fats
  { name: 'Coconut oil', name_ja: 'ココナッツオイル', basis: 'unit', unit_label: '1 tbsp', kcal: 117, protein: 0, fat: 13.6, carbs: 0, fibre: 0, tags: 'fat' },
  { name: 'Ghee', name_ja: 'ギー', basis: 'unit', unit_label: '1 tbsp', kcal: 122, protein: 0, fat: 13.6, carbs: 0, fibre: 0, tags: 'fat,oil' },

  // Condiments & extras
  { name: 'Mustard', name_ja: 'マスタード', basis: 'unit', unit_label: '1 tsp (~5g)', kcal: 3, protein: 0.2, fat: 0.2, carbs: 0.3, fibre: 0.1, tags: 'condiment' },
  { name: 'Balsamic vinegar', name_ja: 'バルサミコ酢', basis: 'unit', unit_label: '1 tbsp (~16g)', kcal: 14, protein: 0.1, fat: 0, carbs: 2.7, fibre: 0, tags: 'condiment' },
  { name: 'Hot sauce', name_ja: 'ホットソース', basis: 'unit', unit_label: '1 tsp', kcal: 1, protein: 0.1, fat: 0.1, carbs: 0.1, fibre: 0, tags: 'condiment' },
  { name: 'Salsa', name_ja: 'サルサ', basis: '100g', kcal: 36, protein: 1.5, fat: 0.4, carbs: 7, fibre: 1.8, tags: 'condiment,veg' },
  { name: 'Guacamole', name_ja: 'ワカモレ', basis: '100g', kcal: 150, protein: 1.8, fat: 13, carbs: 7, fibre: 5, tags: 'fat,veg' },
  { name: 'Pesto', name_ja: 'ペスト', basis: '100g', kcal: 418, protein: 6, fat: 39, carbs: 7, fibre: 2, tags: 'condiment,fat' },
  { name: 'Nutritional yeast', name_ja: '栄養酵母', basis: '100g', kcal: 375, protein: 50, fat: 5, carbs: 36, fibre: 21, tags: 'condiment,protein' },
  { name: 'Maple syrup', name_ja: 'メープルシロップ', basis: 'unit', unit_label: '1 tbsp (~20g)', kcal: 52, protein: 0, fat: 0, carbs: 13, fibre: 0, tags: 'condiment' },

  // Drinks
  { name: 'Almond milk (unsweetened)', name_ja: 'アーモンドミルク', basis: 'ml', kcal: 13, protein: 0.4, fat: 1.1, carbs: 0.6, fibre: 0.3, tags: 'drink' },
  { name: 'Oat milk (unsweetened)', name_ja: 'オーツミルク', basis: 'ml', kcal: 50, protein: 1.2, fat: 2.1, carbs: 6.7, fibre: 0.8, tags: 'drink' },
  { name: 'Coconut water', name_ja: 'ココナッツウォーター', basis: 'ml', kcal: 19, protein: 0.7, fat: 0.2, carbs: 3.7, fibre: 1.1, tags: 'drink' },
  { name: 'Apple juice', name_ja: 'りんごジュース', basis: 'ml', kcal: 46, protein: 0.1, fat: 0.1, carbs: 11, fibre: 0.2, tags: 'drink' }
  ,

  // --- Batch 4: gaps found against noahsnutrition.com's tables.
  // Cooking state is stated on EVERY entry: that source mixes dry and cooked in one table
  // (white rice 374 kcal/100g dry next to brown rice 123 cooked), which is the single easiest
  // way to log 3x your actual intake. Everything here is cooked/as-eaten unless it says dry. ---

  // Beef cuts (cooked)
  { name: 'Beef mince (cooked, 95% lean)', name_ja: '牛ひき肉 赤身', basis: '100g', kcal: 164, protein: 26, fat: 6, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Eye of round (cooked, lean)', name_ja: '牛もも肉', basis: '100g', kcal: 143, protein: 27, fat: 3.5, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Top round roast (cooked, lean)', name_ja: '牛うちもも', basis: '100g', kcal: 160, protein: 29, fat: 4, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Fillet steak (cooked)', name_ja: 'ヒレステーキ', basis: '100g', kcal: 200, protein: 28, fat: 9, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'T-bone steak (cooked)', name_ja: 'Tボーンステーキ', basis: '100g', kcal: 205, protein: 27, fat: 10, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'New York strip steak (cooked)', name_ja: 'ニューヨークストリップ', basis: '100g', kcal: 220, protein: 27, fat: 12, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Ribeye steak (cooked)', name_ja: 'リブアイステーキ', basis: '100g', kcal: 271, protein: 24, fat: 18, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Beef liver (cooked)', name_ja: '牛レバー', basis: '100g', kcal: 175, protein: 27, fat: 4.8, carbs: 5.1, fibre: 0, tags: 'protein' },

  // Pork & poultry (cooked)
  { name: 'Pork tenderloin (cooked)', name_ja: '豚ヒレ', basis: '100g', kcal: 143, protein: 26, fat: 4, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Pork shoulder (cooked)', name_ja: '豚肩肉', basis: '100g', kcal: 269, protein: 24, fat: 19, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Turkey mince (cooked, 93% lean)', name_ja: '七面鳥ひき肉', basis: '100g', kcal: 176, protein: 27, fat: 8, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Chicken breast (cooked, with skin)', name_ja: '鶏むね肉 皮つき', basis: '100g', kcal: 197, protein: 30, fat: 8, carbs: 0, fibre: 0, tags: 'protein' },

  // Fish & shellfish (cooked)
  { name: 'Halibut (cooked)', name_ja: 'おひょう', basis: '100g', kcal: 140, protein: 27, fat: 2.3, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Red snapper (cooked)', name_ja: '鯛', basis: '100g', kcal: 128, protein: 26, fat: 1.7, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Flounder / karei (cooked)', name_ja: 'かれい', basis: '100g', kcal: 117, protein: 24, fat: 1.5, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Mahi-mahi (cooked)', name_ja: 'シイラ', basis: '100g', kcal: 109, protein: 24, fat: 0.9, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Crab (cooked)', name_ja: 'かに', basis: '100g', kcal: 97, protein: 20, fat: 1.5, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Lobster (cooked)', name_ja: 'ロブスター', basis: '100g', kcal: 89, protein: 19, fat: 0.9, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Scallops (cooked)', name_ja: 'ほたて', basis: '100g', kcal: 137, protein: 24, fat: 1, carbs: 5.4, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Herring (cooked)', name_ja: 'にしん', basis: '100g', kcal: 217, protein: 25, fat: 12, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Anchovies (canned)', name_ja: 'アンチョビ', basis: '100g', kcal: 210, protein: 29, fat: 10, carbs: 0, fibre: 0, tags: 'protein,fish' },

  // Dairy
  { name: 'Parmesan (grated)', name_ja: 'パルメザン', basis: '100g', kcal: 431, protein: 38, fat: 29, carbs: 4, fibre: 0, tags: 'protein,dairy,fat,cheese' },
  { name: 'Feta cheese', name_ja: 'フェタチーズ', basis: '100g', kcal: 264, protein: 14, fat: 21, carbs: 4.1, fibre: 0, tags: 'protein,dairy,fat,cheese' },
  { name: 'Ricotta (part-skim)', name_ja: 'リコッタ', basis: '100g', kcal: 138, protein: 11, fat: 8, carbs: 5, fibre: 0, tags: 'protein,dairy,cheese' },
  { name: 'Heavy cream', name_ja: '生クリーム', basis: 'unit', unit_label: '1 tbsp (~14g)', kcal: 51, protein: 0.3, fat: 5.5, carbs: 0.4, fibre: 0, tags: 'fat,dairy' },

  // Pulses (cooked)
  { name: 'Lima beans (cooked)', name_ja: 'ライマ豆', basis: '100g', kcal: 115, protein: 7.8, fat: 0.4, carbs: 20, fibre: 7, tags: 'protein,veg' },
  { name: 'Navy beans (cooked)', name_ja: '白いんげん豆', basis: '100g', kcal: 140, protein: 8.2, fat: 0.6, carbs: 26, fibre: 10.5, tags: 'protein,veg' },
  { name: 'Split peas (cooked)', name_ja: '割りえんどう', basis: '100g', kcal: 118, protein: 8.3, fat: 0.4, carbs: 21, fibre: 8.3, tags: 'protein,veg' },
  { name: 'Soybeans (cooked)', name_ja: '大豆 茹で', basis: '100g', kcal: 173, protein: 16.6, fat: 9, carbs: 10, fibre: 6, tags: 'protein,veg,japanese' },
  { name: 'Pea protein powder', name_ja: 'ピープロテイン', basis: 'unit', unit_label: '1 scoop (~30g)', kcal: 107, protein: 23, fat: 2, carbs: 1, fibre: 0, tags: 'protein,supplement' },

  // Staples — DRY weights, explicitly labelled (log these only if you weighed before cooking)
  { name: 'White rice (dry, uncooked)', name_ja: '精白米 うるち米 生', basis: '100g', kcal: 342, protein: 6.1, fat: 0.9, carbs: 77.6, fibre: 0.5, tags: 'carb,staple,dry' },
  { name: 'Pasta (dry, uncooked)', name_ja: 'パスタ 乾麺', basis: '100g', kcal: 371, protein: 13, fat: 1.5, carbs: 75, fibre: 3.2, tags: 'carb,staple,dry,spaghetti,penne,macaroni,fusilli,linguine,lasagne' },
  { name: 'Basmati rice (cooked)', name_ja: 'バスマティライス', basis: '100g', kcal: 121, protein: 3.5, fat: 0.5, carbs: 25, fibre: 0.7, tags: 'carb,staple' },
  { name: 'Wild rice (cooked)', name_ja: 'ワイルドライス', basis: '100g', kcal: 101, protein: 4, fat: 0.3, carbs: 21, fibre: 1.8, tags: 'carb,staple' },
  { name: 'Wholewheat tortilla', name_ja: '全粒粉トルティーヤ', basis: 'unit', unit_label: '1 wrap (~45g)', kcal: 130, protein: 4.4, fat: 3.2, carbs: 21, fibre: 3.4, tags: 'carb,bread' },

  // Vegetables & starches
  { name: 'Yam (raw)', name_ja: 'ヤムイモ', basis: '100g', kcal: 118, protein: 1.5, fat: 0.2, carbs: 28, fibre: 4.1, tags: 'carb,veg' },

  // Fruit
  { name: 'Apricot', name_ja: 'あんず', basis: '100g', kcal: 48, protein: 1.4, fat: 0.4, carbs: 11, fibre: 2, tags: 'fruit' },
  { name: 'Clementine', name_ja: 'クレメンタイン', basis: '100g', kcal: 47, protein: 0.8, fat: 0.1, carbs: 12, fibre: 1.7, tags: 'fruit' },
  { name: 'Cranberries', name_ja: 'クランベリー', basis: '100g', kcal: 46, protein: 0.4, fat: 0.1, carbs: 12, fibre: 4.6, tags: 'fruit' },
  { name: 'Figs', name_ja: 'いちじく', basis: '100g', kcal: 74, protein: 0.8, fat: 0.3, carbs: 19, fibre: 2.9, tags: 'fruit' },
  { name: 'Guava', name_ja: 'グアバ', basis: '100g', kcal: 68, protein: 2.6, fat: 1, carbs: 14, fibre: 5.4, tags: 'fruit' },
  { name: 'Jackfruit', name_ja: 'ジャックフルーツ', basis: '100g', kcal: 95, protein: 1.7, fat: 0.6, carbs: 23, fibre: 1.5, tags: 'fruit' },
  { name: 'Lemon', name_ja: 'レモン', basis: '100g', kcal: 29, protein: 1.1, fat: 0.3, carbs: 9, fibre: 2.8, tags: 'fruit' },
  { name: 'Lime', name_ja: 'ライム', basis: '100g', kcal: 30, protein: 0.7, fat: 0.2, carbs: 11, fibre: 2.8, tags: 'fruit' },
  { name: 'Nectarine', name_ja: 'ネクタリン', basis: '100g', kcal: 44, protein: 1.1, fat: 0.3, carbs: 11, fibre: 1.7, tags: 'fruit' },
  { name: 'Papaya', name_ja: 'パパイヤ', basis: '100g', kcal: 43, protein: 0.5, fat: 0.3, carbs: 11, fibre: 1.7, tags: 'fruit' },
  { name: 'Passionfruit', name_ja: 'パッションフルーツ', basis: '100g', kcal: 97, protein: 2.2, fat: 0.7, carbs: 23, fibre: 10, tags: 'fruit' },
  { name: 'Plum', name_ja: 'プラム', basis: '100g', kcal: 46, protein: 0.7, fat: 0.3, carbs: 11, fibre: 1.4, tags: 'fruit' },
  { name: 'Pomegranate', name_ja: 'ざくろ', basis: '100g', kcal: 83, protein: 1.7, fat: 1.2, carbs: 19, fibre: 4, tags: 'fruit' },
  { name: 'Prunes', name_ja: 'プルーン', basis: '100g', kcal: 240, protein: 2.2, fat: 0.4, carbs: 64, fibre: 7.1, tags: 'fruit,snack' },

  // Oils
  { name: 'Sunflower oil', name_ja: 'ひまわり油', basis: 'unit', unit_label: '1 tbsp', kcal: 120, protein: 0, fat: 13.6, carbs: 0, fibre: 0, tags: 'fat' },
  { name: 'Palm oil', name_ja: 'パーム油', basis: 'unit', unit_label: '1 tbsp', kcal: 120, protein: 0, fat: 13.6, carbs: 0, fibre: 0, tags: 'fat' }
  ,

  // --- Batch 5: everyday Japanese foods, values taken verbatim from 日本食品標準成分表2020年版(八訂)
  // (MEXT official tables, fooddb.mext.go.jp). name_ja follows the MEXT food name for traceability. ---
  // Not to be confused with 生揚げ（厚揚げ）, the Atsuage row above: aburaage is the thin deep-fried
  // sheet (inari, miso soup) and is far denser.
  { name: 'Aburaage (thin fried tofu)', name_ja: '油揚げ 生', basis: '100g', kcal: 377, protein: 23.4, fat: 34.4, carbs: 0.4, fibre: 1.3, tags: 'protein,veg,japanese,inari' },
  { name: 'Konnyaku', name_ja: 'こんにゃく', basis: '100g', kcal: 5, protein: 0.1, fat: 0, carbs: 2.3, fibre: 2.2, tags: 'veg,japanese' },
  { name: 'Shirataki noodles', name_ja: 'しらたき', basis: '100g', kcal: 7, protein: 0.2, fat: 0, carbs: 3, fibre: 2.9, tags: 'veg,noodle,japanese' },
  // MEXT lists fibre 3.7 > carbs 3.4 (carbs are by-difference, fibre is measured); capped for consistency.
  { name: 'Hijiki (rehydrated, boiled)', name_ja: 'ひじき ゆで', basis: '100g', kcal: 11, protein: 0.7, fat: 0.3, carbs: 3.4, fibre: 3.4, tags: 'veg,japanese' },
  { name: 'Kiriboshi daikon (boiled)', name_ja: '切干し大根 ゆで', basis: '100g', kcal: 13, protein: 0.9, fat: 0.1, carbs: 4.1, fibre: 3.7, tags: 'veg,japanese' },
  { name: 'Chikuwa', name_ja: '焼き竹輪', basis: '100g', kcal: 119, protein: 12.2, fat: 2, carbs: 13.5, fibre: 0, tags: 'protein,japanese' },
  { name: 'Kamaboko (steamed)', name_ja: '蒸しかまぼこ', basis: '100g', kcal: 93, protein: 12, fat: 0.9, carbs: 9.7, fibre: 0, tags: 'protein,japanese' },
  { name: 'Hanpen', name_ja: 'はんぺん', basis: '100g', kcal: 179, protein: 23.1, fat: 10.9, carbs: 0.2, fibre: 0, tags: 'protein,japanese' },
  { name: 'Satsuma-age', name_ja: 'さつま揚げ', basis: '100g', kcal: 135, protein: 12.5, fat: 3.7, carbs: 13.9, fibre: 0, tags: 'protein,japanese' },
  { name: 'Tarako (cod roe)', name_ja: 'たらこ 生', basis: '100g', kcal: 131, protein: 24, fat: 4.7, carbs: 0.4, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Umeboshi', name_ja: '梅干し', basis: '100g', kcal: 29, protein: 0.9, fat: 0.7, carbs: 8.6, fibre: 3.3, tags: 'condiment,japanese' },
  { name: 'Takuan', name_ja: 'たくあん漬', basis: '100g', kcal: 43, protein: 0.6, fat: 0.3, carbs: 10.8, fibre: 2.3, tags: 'veg,japanese' },
  { name: 'Gobo / burdock (boiled)', name_ja: 'ごぼう ゆで', basis: '100g', kcal: 50, protein: 1.5, fat: 0.2, carbs: 13.7, fibre: 6.1, tags: 'veg,japanese' },
  { name: 'Renkon / lotus root (boiled)', name_ja: 'れんこん ゆで', basis: '100g', kcal: 66, protein: 1.3, fat: 0.1, carbs: 16.1, fibre: 2.3, tags: 'veg,japanese' },
  { name: 'Kabocha (boiled)', name_ja: '日本かぼちゃ ゆで', basis: '100g', kcal: 50, protein: 1.9, fat: 0.1, carbs: 13.3, fibre: 3.6, tags: 'veg,japanese' },
  { name: 'Komatsuna (boiled)', name_ja: 'こまつな ゆで', basis: '100g', kcal: 14, protein: 1.6, fat: 0.1, carbs: 3, fibre: 2.4, tags: 'veg,japanese' },
  { name: 'Hakusai / napa cabbage (boiled)', name_ja: 'はくさい ゆで', basis: '100g', kcal: 13, protein: 0.9, fat: 0.1, carbs: 2.9, fibre: 1.4, tags: 'veg,japanese' },
  { name: 'Negi / spring onion (boiled)', name_ja: '根深ねぎ ゆで', basis: '100g', kcal: 29, protein: 1.9, fat: 0.3, carbs: 6.5, fibre: 3.2, tags: 'veg,japanese' },
  { name: 'Nira / garlic chives (boiled)', name_ja: 'にら ゆで', basis: '100g', kcal: 27, protein: 2.6, fat: 0.5, carbs: 5.7, fibre: 4.3, tags: 'veg,japanese' },
  { name: 'Okra (boiled)', name_ja: 'オクラ ゆで', basis: '100g', kcal: 29, protein: 2.1, fat: 0.1, carbs: 7.6, fibre: 5.2, tags: 'veg,japanese' },
  { name: 'Satoimo / taro (simmered)', name_ja: 'さといも 水煮', basis: '100g', kcal: 52, protein: 1.5, fat: 0.1, carbs: 13.4, fibre: 2.4, tags: 'carb,veg,japanese' },
  { name: 'Nagaimo / yam (raw)', name_ja: 'ながいも 生', basis: '100g', kcal: 64, protein: 2.2, fat: 0.3, carbs: 13.9, fibre: 1, tags: 'carb,veg,japanese' },
  { name: 'Somen / hiyamugi (boiled)', name_ja: 'そうめん ゆで', basis: '100g', kcal: 114, protein: 3.5, fat: 0.4, carbs: 25.8, fibre: 0.9, tags: 'carb,noodle,japanese' },
  // The boiled values (緑豆はるさめ ゆで), which is what actually gets eaten — not MEXT's 乾 (dry)
  // figures (346 kcal / 86.6 g carbs), which would badly overstate a ゆで entry.
  { name: 'Harusame glass noodles (boiled)', name_ja: '緑豆はるさめ ゆで', basis: '100g', kcal: 78, protein: 0, fat: 0.1, carbs: 20.6, fibre: 1.5, tags: 'carb,noodle,japanese,harusame' },
  { name: 'Buri / yellowtail (grilled)', name_ja: 'ぶり 焼き', basis: '100g', kcal: 260, protein: 26.2, fat: 20.4, carbs: 0.3, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Aji / horse mackerel (grilled)', name_ja: 'まあじ 焼き', basis: '100g', kcal: 136, protein: 22.4, fat: 5.9, carbs: 0.1, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Sanma / pacific saury (grilled)', name_ja: 'さんま 焼き', basis: '100g', kcal: 281, protein: 23.3, fat: 22.8, carbs: 0.2, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Unagi kabayaki', name_ja: 'うなぎ かば焼', basis: '100g', kcal: 285, protein: 23, fat: 21, carbs: 3.1, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Hokke (dried, grilled)', name_ja: 'ほっけ 開き干し 焼き', basis: '100g', kcal: 161, protein: 20.6, fat: 9.4, carbs: 0.1, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Shimeji mushrooms (boiled)', name_ja: 'ぶなしめじ ゆで', basis: '100g', kcal: 22, protein: 2.7, fat: 0.2, carbs: 5.2, fibre: 4.2, tags: 'veg,japanese' },
  { name: 'Enoki mushrooms (boiled)', name_ja: 'えのきたけ ゆで', basis: '100g', kcal: 34, protein: 2.8, fat: 0.1, carbs: 7.8, fibre: 4.5, tags: 'veg,japanese' },
  { name: 'Maitake mushrooms (boiled)', name_ja: 'まいたけ ゆで', basis: '100g', kcal: 27, protein: 1.6, fat: 0.5, carbs: 6.4, fibre: 4.3, tags: 'veg,japanese' },
  { name: 'Katsuobushi', name_ja: 'かつお節', basis: '100g', kcal: 332, protein: 77.1, fat: 2.9, carbs: 0.8, fibre: 0, tags: 'protein,japanese,condiment' },
  { name: 'Mentsuyu (straight)', name_ja: 'めんつゆ ストレート', basis: '100g', kcal: 44, protein: 2.2, fat: 0, carbs: 8.7, fibre: 0, tags: 'condiment,japanese' },
  { name: 'Custard pudding', name_ja: 'カスタードプリン', basis: '100g', kcal: 116, protein: 5.7, fat: 5.5, carbs: 14, fibre: 0, tags: 'treat,japanese' },
  { name: 'Daifuku mochi', name_ja: '大福もち', basis: '100g', kcal: 223, protein: 4.6, fat: 0.5, carbs: 53.2, fibre: 1.8, tags: 'treat,japanese' },
  { name: 'Dorayaki', name_ja: 'どら焼', basis: '100g', kcal: 292, protein: 6.6, fat: 3.2, carbs: 57.9, fibre: 1.9, tags: 'treat,japanese' },
  { name: 'Yokan', name_ja: '練りようかん', basis: '100g', kcal: 168, protein: 2.6, fat: 0.2, carbs: 39.9, fibre: 2.2, tags: 'treat,japanese' },
  { name: 'Matcha powder', name_ja: '抹茶', basis: '100g', kcal: 237, protein: 29.6, fat: 5.3, carbs: 39.5, fibre: 38.5, tags: 'drink,japanese' },
  { name: 'Lactic acid drink (Yakult type)', name_ja: '乳酸菌飲料', basis: 'ml', kcal: 64, protein: 1.1, fat: 0.1, carbs: 16.4, fibre: 0, tags: 'drink,japanese' },
  { name: 'Ginger (raw)', name_ja: 'しょうが 生', basis: '100g', kcal: 28, protein: 0.9, fat: 0.3, carbs: 6.6, fibre: 2.1, tags: 'veg,condiment,japanese' },
  { name: 'Daikon (boiled, peeled)', name_ja: 'だいこん ゆで', basis: '100g', kcal: 15, protein: 0.4, fat: 0, carbs: 4.5, fibre: 1.6, tags: 'veg,japanese' },
  { name: 'Spinach (boiled, Japanese)', name_ja: 'ほうれんそう ゆで', basis: '100g', kcal: 23, protein: 2.6, fat: 0.5, carbs: 4, fibre: 3.6, tags: 'veg,japanese' },
  { name: 'Hamburg steak (mixed mince)', name_ja: '合いびきハンバーグ', basis: '100g', kcal: 197, protein: 13.4, fat: 12.2, carbs: 10, fibre: 1.1, tags: 'protein,meal,japanese' },
  { name: 'Gyoza (prepared dish)', name_ja: 'ぎょうざ 調理済み', basis: '100g', kcal: 209, protein: 6.9, fat: 11.3, carbs: 22.3, fibre: 1.5, tags: 'meal,japanese' },
  { name: 'Shumai', name_ja: 'しゅうまい', basis: '100g', kcal: 191, protein: 9.1, fat: 9.2, carbs: 19.5, fibre: 1.7, tags: 'meal,japanese' },
  { name: 'Nikujaga', name_ja: '肉じゃが', basis: '100g', kcal: 78, protein: 4.3, fat: 1.3, carbs: 13, fibre: 1.3, tags: 'meal,japanese' },
  // 'Squid tempura' is deliberately absent: the figures available for it (73.4 g protein / 0.1 g
  // carbs per 100 g) came from the wrong MEXT column. Do not add it without re-sourcing.

  // --- Batch 6: eating out. Burger and pizza are USDA FNDDS 2021-2023 averages —
  // per 100 g on purpose, because a pub burger or a pizza slice can only ever be weighed by eye.
  // McDonald's rows are the official McDonald's JAPAN figures (mcdonalds.co.jp 栄養成分一覧表),
  // not the US menu — the Japanese portions are smaller. Japan publishes 炭水化物 only, so fibre
  // is recorded as 0 for those. ---
  // USDA FNDDS 2706901 "Cheeseburger, on white bun, 1 medium patty" — a proper burger, not a
  // fast-food one. The whole USDA family runs 291–299 kcal/100 g, so any decent burger is ~295.
  { name: 'Cheeseburger (restaurant / pub style)', name_ja: 'チーズバーガー 店', basis: '100g', kcal: 296, protein: 17.9, fat: 16.2, carbs: 18.7, fibre: 0.6, tags: 'meal,burger,cheeseburger,hamburger,eating-out' },
  // Mean of the five plain-cheese USDA FNDDS crust variants (thick, thin, stuffed, frozen thick,
  // frozen thin): 263–274 kcal/100 g. Toppings beyond cheese push it up, veg pulls it down.
  { name: 'Pizza (cheese, average)', name_ja: 'ピザ', basis: '100g', kcal: 269, protein: 11.6, fat: 11.3, carbs: 30.3, fibre: 2.2, tags: 'meal,pizza,eating-out' },
  // USDA portion weights: a slice off a medium (11–12") pizza is ~100 g, off a large (13–15") ~145 g.
  // 120 g splits them; log 1.2 units for a big NY-style slice, 0.8 for a small one.
  { name: 'Pizza slice (cheese)', name_ja: 'ピザ 1切れ', basis: 'unit', unit_label: '1 slice (~120 g)', kcal: 323, protein: 13.9, fat: 13.5, carbs: 36.4, fibre: 2.6, tags: 'meal,pizza,eating-out' },
  { name: "McDonald's Big Mac", name_ja: 'ビッグマック', basis: 'unit', unit_label: '1 burger', kcal: 525, protein: 26.1, fat: 28, carbs: 42.1, fibre: 0, tags: 'meal,burger,mcdonalds,マック,fast-food,eating-out' },
  { name: "McDonald's Double Cheeseburger", name_ja: 'ダブルチーズバーガー', basis: 'unit', unit_label: '1 burger', kcal: 459, protein: 26.4, fat: 25.1, carbs: 31.8, fibre: 0, tags: 'meal,burger,cheeseburger,mcdonalds,マック,fast-food,eating-out' },
  { name: "McDonald's fries (M)", name_ja: 'マックフライポテト M', basis: 'unit', unit_label: '1 medium', kcal: 410, protein: 5.5, fat: 20, carbs: 52.4, fibre: 0, tags: 'carb,fries,chips,mcdonalds,マック,fast-food,eating-out' },
  // Published as 262 / 15.3 / 15.9 / 14.4 for the 5-piece box; divided by five so any count works.
  { name: "McDonald's Chicken McNugget (1 piece)", name_ja: 'チキンマックナゲット 1個', basis: 'unit', unit_label: '1 nugget', kcal: 52, protein: 3.1, fat: 3.2, carbs: 2.9, fibre: 0, tags: 'protein,nuggets,mcdonalds,マック,fast-food,eating-out' },

  // --- Raw weights ---
  // Everything above weighs meat and fish COOKED. Most users weigh raw, and 100 g raw is not
  // 100 g cooked: water loss concentrates the cooked figures, so logging raw chicken
  // against the cooked row overstates protein by about 38%. USDA raw values.
  { name: 'Aji / horse mackerel (raw)', name_ja: null, basis: '100g', kcal: 126, protein: 20.7, fat: 4.5, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Beef liver (raw)', name_ja: null, basis: '100g', kcal: 135, protein: 20.4, fat: 3.6, carbs: 3.9, fibre: 0, tags: 'protein' },
  { name: 'Beef mince (raw, 95% lean)', name_ja: null, basis: '100g', kcal: 137, protein: 21.4, fat: 5, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Beef mince (raw, ~80/20)', name_ja: null, basis: '100g', kcal: 254, protein: 17.2, fat: 20, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Buri / yellowtail (raw)', name_ja: null, basis: '100g', kcal: 146, protein: 21, fat: 5.2, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Chicken breast (raw, skinless)', name_ja: null, basis: '100g', kcal: 120, protein: 22.5, fat: 2.6, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Chicken breast (raw, with skin)', name_ja: null, basis: '100g', kcal: 172, protein: 20.8, fat: 9.3, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Chicken mince (raw)', name_ja: null, basis: '100g', kcal: 143, protein: 17.4, fat: 8.1, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Chicken thigh (raw, skinless)', name_ja: null, basis: '100g', kcal: 121, protein: 19.7, fat: 4.1, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Chicken thigh (raw, with skin)', name_ja: null, basis: '100g', kcal: 211, protein: 16.6, fat: 15.5, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Crab (raw)', name_ja: null, basis: '100g', kcal: 84, protein: 18.1, fat: 1.1, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Eye of round (raw, lean)', name_ja: null, basis: '100g', kcal: 125, protein: 22, fat: 3.4, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Fillet steak (raw)', name_ja: null, basis: '100g', kcal: 179, protein: 20.8, fat: 10.3, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Flounder / karei (raw)', name_ja: null, basis: '100g', kcal: 91, protein: 19.1, fat: 1.2, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Halibut (raw)', name_ja: null, basis: '100g', kcal: 111, protein: 22.5, fat: 1.9, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Herring (raw)', name_ja: null, basis: '100g', kcal: 158, protein: 18, fat: 9, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Lamb leg (raw, lean)', name_ja: null, basis: '100g', kcal: 134, protein: 20.6, fat: 5.3, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Lean beef (raw, ~90/10)', name_ja: null, basis: '100g', kcal: 176, protein: 20, fat: 10, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Lobster (raw)', name_ja: null, basis: '100g', kcal: 77, protein: 16.5, fat: 0.7, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Mahi-mahi (raw)', name_ja: null, basis: '100g', kcal: 85, protein: 18.5, fat: 0.7, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'New York strip steak (raw)', name_ja: null, basis: '100g', kcal: 190, protein: 21, fat: 11.4, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Pork belly (raw)', name_ja: null, basis: '100g', kcal: 518, protein: 9.3, fat: 53, carbs: 0, fibre: 0, tags: 'protein,fat' },
  { name: 'Pork loin (raw)', name_ja: null, basis: '100g', kcal: 143, protein: 21.4, fat: 5.7, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Pork mince (raw)', name_ja: null, basis: '100g', kcal: 263, protein: 16.9, fat: 21.2, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Pork shoulder (raw)', name_ja: null, basis: '100g', kcal: 216, protein: 17.4, fat: 15.6, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Pork tenderloin (raw)', name_ja: null, basis: '100g', kcal: 109, protein: 20.9, fat: 2.2, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Prawns / shrimp (raw)', name_ja: null, basis: '100g', kcal: 85, protein: 20.1, fat: 0.5, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Red snapper (raw)', name_ja: null, basis: '100g', kcal: 100, protein: 20.5, fat: 1.3, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Ribeye steak (raw)', name_ja: null, basis: '100g', kcal: 291, protein: 16.9, fat: 24.6, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Saba / mackerel (raw)', name_ja: null, basis: '100g', kcal: 205, protein: 18.6, fat: 13.9, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Salmon (raw)', name_ja: null, basis: '100g', kcal: 208, protein: 20.4, fat: 13.4, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Sanma / pacific saury (raw)', name_ja: null, basis: '100g', kcal: 287, protein: 18.1, fat: 25.6, carbs: 0, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Scallops (raw)', name_ja: null, basis: '100g', kcal: 88, protein: 16.8, fat: 0.8, carbs: 2.4, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'Sirloin steak (raw)', name_ja: null, basis: '100g', kcal: 150, protein: 21.7, fat: 6.4, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Squid / ika (raw)', name_ja: null, basis: '100g', kcal: 92, protein: 15.6, fat: 1.4, carbs: 3.1, fibre: 0, tags: 'protein,fish,japanese' },
  { name: 'T-bone steak (raw)', name_ja: null, basis: '100g', kcal: 247, protein: 19, fat: 18.6, carbs: 0, fibre: 0, tags: 'protein,steak' },
  { name: 'Tilapia (raw)', name_ja: null, basis: '100g', kcal: 96, protein: 20.1, fat: 1.7, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Top round roast (raw, lean)', name_ja: null, basis: '100g', kcal: 129, protein: 22.5, fat: 3.6, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Trout (raw)', name_ja: null, basis: '100g', kcal: 141, protein: 20.5, fat: 6.2, carbs: 0, fibre: 0, tags: 'protein,fish' },
  { name: 'Turkey breast (raw, skinless)', name_ja: null, basis: '100g', kcal: 111, protein: 24.6, fat: 0.7, carbs: 0, fibre: 0, tags: 'protein' },
  { name: 'Turkey mince (raw, 93% lean)', name_ja: null, basis: '100g', kcal: 170, protein: 18.9, fat: 10.4, carbs: 0, fibre: 0, tags: 'protein' },

  // Korean label, 600 g tub, 40 g serving. The 16 g of carbohydrate includes 8.4 g
  // allulose, which carries almost no energy -- hence 124 kcal rather than the 159 that
  // 4/4/9 would give. Stored kcal is the label's, so totals come out right.
  { name: "Rionach's protein", name_ja: null, basis: 'unit', unit_label: '1 serving (40 g)', kcal: 124, protein: 20, fat: 1.7, carbs: 16, fibre: 0, tags: 'protein,powder,shake' }
];
