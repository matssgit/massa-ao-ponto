import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth-state";
import type { RestaurantSummary } from "./auth-service";
import { RestaurantContext } from "./restaurant-state";

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { memberships, service } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [restaurantNames, setRestaurantNames] = useState<Record<string, string>>({});
  const membership =
    memberships.find((item) => item.restaurantId === selected) ??
    (memberships.length === 1 ? memberships[0] : null);

  useEffect(() => {
    let active = true;
    void service
      .restaurants()
      .then((items) => {
        if (active) setRestaurants(items);
      })
      .catch(() => {
        if (active) setRestaurants([]);
      });
    return () => {
      active = false;
    };
  }, [service]);

  function selectRestaurant(id: string) {
    if (!memberships.some((item) => item.restaurantId === id)) return;
    setSelected(id);
  }

  function updateRestaurantName(id: string, name: string) {
    if (!memberships.some((item) => item.restaurantId === id)) return;
    setRestaurantNames((current) => ({ ...current, [id]: name }));
  }

  return (
    <RestaurantContext.Provider
      value={{
        membership,
        restaurantId: membership?.restaurantId ?? null,
        restaurants: restaurants
          .filter((restaurant) =>
            memberships.some((item) => item.restaurantId === restaurant.id),
          )
          .map((restaurant) => ({
            ...restaurant,
            name: restaurantNames[restaurant.id] ?? restaurant.name,
          })),
        selectRestaurant,
        updateRestaurantName,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}
