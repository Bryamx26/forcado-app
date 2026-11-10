import { useBrand } from '../../brand.js';
import { formatTime } from '../../time.js';
import { ORDER_MODE } from '../../../shared/pickup.js';

// Où va la commande, pour le comptoir : « Table 4 » ou « À emporter · Ana · 10:45 ».
export function placeLabel(order, timeZone) {
  if (order.mode !== ORDER_MODE.TAKEAWAY) return `Table ${order.table}`;
  const pickup = order.pickupAt ? ` · retrait ${formatTime(order.pickupAt, timeZone)}` : '';
  return `À emporter · ${order.customerName}${pickup}`;
}

export function usePlaceLabel() {
  const { takeaway } = useBrand();
  return (order) => placeLabel(order, takeaway.timeZone);
}
