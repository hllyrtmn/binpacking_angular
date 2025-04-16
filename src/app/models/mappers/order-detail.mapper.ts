import { IInvoiceOrderDetail } from "../component-models/invoice-order-detail.interface";
import { OrderDetail } from "../order-detail.interface";

export const mapToOrderDetailDto = (orderDetail: OrderDetail): IInvoiceOrderDetail => {
  const width = Number(orderDetail.product.dimension.width);
  const depth = Number(orderDetail.product.dimension.depth);
  const count = Number(orderDetail.count);
  const meter = (depth * count ) / 1000; // Convert to square meters
  const type = orderDetail.product.product_type.type;
  const code = orderDetail.product.product_type.code;
  const id = orderDetail.id;
  return {
    id,
    type,
    code,
    width,
    depth,
    count,
    meter,
  };
};

export const mapToOrderDetailDtoList = (orderDetails: OrderDetail[]): IInvoiceOrderDetail[] =>
  orderDetails.map(mapToOrderDetailDto);
