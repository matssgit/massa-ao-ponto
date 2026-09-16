export interface SpecialHour {
  id: string;
  restaurantId: string;
  date: string;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  label: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SpecialHourInput = Pick<SpecialHour, "date" | "closed" | "opensAt" | "closesAt" | "label">;

export interface SpecialHoursRepository {
  findByRestaurantId(restaurantId: string): Promise<SpecialHour[]>;
  findByIdAndRestaurantId(id: string, restaurantId: string): Promise<SpecialHour | null>;
  findByRestaurantIdAndDate(restaurantId: string, date: string): Promise<SpecialHour | null>;
  create(restaurantId: string, input: SpecialHourInput): Promise<SpecialHour>;
  update(id: string, restaurantId: string, input: Partial<SpecialHourInput>): Promise<SpecialHour | null>;
  delete(id: string, restaurantId: string): Promise<boolean>;
}
