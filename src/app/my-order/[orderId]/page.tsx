
import MyOrderClient from './components/my-order-client';

export default async function MyOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  
  return (
    <MyOrderClient orderId={orderId} />
  );
}
