import { useParams } from "react-router";
import { PublicReservationService } from "./service";
import { PublicRestaurantPage } from "./public-restaurant-page";
import { PublicReservationPage } from "./public-reservation-page";
import { PublicReservationDetailsPage } from "./public-reservation-details-page";
import { PublicCatalogPage } from "./public-catalog-page";
import { PublicOrderPage } from "./public-order-page";
import { PublicOrderDetailsPage } from "./public-order-details-page";
export function PublicRoute({ service, page }: { service: PublicReservationService; page: "restaurant" | "reserve" | "details" | "catalog" | "order" | "order-details" }) {
  const { slug = "", token = "" } = useParams();
  if (page === "details") return <PublicReservationDetailsPage key={token} service={service} token={token} />;
  if (page === "order-details") return <PublicOrderDetailsPage key={token} service={service} token={token} />;
  if (page === "order") return <PublicOrderPage key={slug} service={service} slug={slug} />;
  if (page === "catalog") return <PublicCatalogPage key={slug} service={service} slug={slug} />;
  if (page === "reserve") return <PublicReservationPage key={slug} service={service} slug={slug} />;
  return <PublicRestaurantPage key={slug} service={service} slug={slug} />;
}
