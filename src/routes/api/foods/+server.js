import { json } from '@sveltejs/kit';
import { searchFoods } from '$lib/server/repos/food.js';

export function GET({ url }) {
  const q = url.searchParams.get('q') ?? '';
  return json(searchFoods(q, 30));
}
