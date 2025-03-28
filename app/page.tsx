import ReceiptScanner from "@/components/receipt-scanner"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Receipt OCR Scanner</h1>
      <ReceiptScanner />
    </main>
  )
}

