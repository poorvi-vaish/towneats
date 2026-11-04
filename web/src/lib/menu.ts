import { z } from "zod";
import rawData from "../../data/restaurants.json";

// The menu lives in data/restaurants.json so a non-developer can edit it:
// change a price, set "available": false for the day, push to deploy.
// The file is validated at startup — a malformed edit fails the build
// instead of silently breaking checkout.

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  pricePaise: z.number().int().positive(),
  isVeg: z.boolean(),
  available: z.boolean().default(true),
});

const restaurantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  area: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/),
  active: z.boolean().default(true),
  items: z.array(itemSchema).min(1),
});

const menuSchema = z.object({
  restaurants: z.array(restaurantSchema).min(1),
});

export type MenuItemData = z.infer<typeof itemSchema>;
export type RestaurantData = z.infer<typeof restaurantSchema>;

const parsed = menuSchema.parse(rawData);

// Item ids must be unique across the whole menu — they are the order key.
const allIds = parsed.restaurants.flatMap((r) => r.items.map((i) => i.id));
if (new Set(allIds).size !== allIds.length) {
  throw new Error("data/restaurants.json contains duplicate item ids");
}

export const restaurants: RestaurantData[] = parsed.restaurants;

const itemIndex = new Map<string, { item: MenuItemData; restaurant: RestaurantData }>();
for (const r of parsed.restaurants) {
  for (const i of r.items) {
    itemIndex.set(i.id, { item: i, restaurant: r });
  }
}

export function activeRestaurants(): RestaurantData[] {
  return restaurants.filter((r) => r.active);
}

/** Look up orderable items by id. Returns null if any id is unknown or unavailable. */
export function getOrderableItems(ids: string[]): Map<string, { item: MenuItemData; restaurant: RestaurantData }> | null {
  const result = new Map<string, { item: MenuItemData; restaurant: RestaurantData }>();
  for (const id of ids) {
    const entry = itemIndex.get(id);
    if (!entry || !entry.item.available || !entry.restaurant.active) return null;
    result.set(id, entry);
  }
  return result;
}

export function getRestaurantByName(name: string): RestaurantData | undefined {
  return restaurants.find((r) => r.name === name);
}
