import { NextResponse } from "next/server"

// This is a placeholder GET function.
// It simulates fetching data from a database.
export async function GET(req: Request) {
  // We can read the 'range' parameter, but for now, we'll just return the same dummy data.
  const { searchParams } = new URL(req.url)
  const range = searchParams.get("range") // This will be 'monthly', 'yearly', or 'all'

  console.log(`API called with time range: ${range}`)

  // Dummy data that matches the structure our frontend component expects.
  const dummyData = {
    rekap: [
      { date: "2024-08-01", amount: 150000 },
      { date: "2024-08-02", amount: 200000 },
      { date: "2024-08-03", amount: 175000 },
      { date: "2024-08-04", amount: 300000 },
      { date: "2024-08-05", amount: 250000 },
      { date: "2024-08-06", amount: 450000 },
      { date: "2024-08-07", amount: 400000 },
    ],
    pemasukan: [
      { id: "1", label: "Donasi Hamba Allah", amount: 50000 },
      { id: "2", label: "Infaq Jumat", amount: 150000 },
      { id: "3", label: "Sewa Aula", amount: 300000 },
    ],
    pengeluaran: [
      { id: "4", label: "Bayar Listrik", amount: 75000 },
      { id: "5", label: "Perlengkapan Kebersihan", amount: 45000 },
    ],
  }

  // Wrap the data in a `data` object, just like our other APIs.
  return NextResponse.json({ data: dummyData })
}
