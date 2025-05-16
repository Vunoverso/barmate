import ProductManagement from "@/app/products/components/product-management";

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gerenciamento de Produtos</h1>
      </div>
      <ProductManagement />
    </div>
  );
}
