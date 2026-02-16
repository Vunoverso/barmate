import MyOrderClient from './components/my-order-client';

export default function MyOrderPage({ params }: { params: { orderId: string } }) {
  return (
    <MyOrderClient orderId={params.orderId} />
  );
}
