// app/page.tsx

import HomeContent from "@/components/home-content";
// Pastikan path ke supabase client benar
import { supabase } from "@/lib/supabase/client"; 

// Definisikan tipe di sini atau import dari file bersama
type FinanceTransaction = {
  id: string;
  occured_at: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  note: string | null;
  created_at: string;
};

// Fungsi pengambilan data di sisi server
async function getFinanceData() {
  const { data: transactions, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .order("occured_at", { ascending: false });

  if (error) {
    console.error("Supabase error fetching finance data:", error.message);
    // Kembalikan array kosong jika ada error agar build tidak gagal
    return { transactions: [], categories: [] };
  }

  // Gunakan fallback ke array kosong untuk mencegah error "not iterable"
  const safeTransactions = transactions || [];
  const categories = Array.from(new Set(safeTransactions.map(t => t.category)));

  return { transactions: safeTransactions, categories };
}

// Ubah komponen Page menjadi async untuk bisa menggunakan await
export default async function Page() {
  // Panggil fungsi pengambilan data di server
  const financeData = await getFinanceData();

  return (
    <main>
      {/* Teruskan data yang diambil sebagai props ke HomeContent */}
      <HomeContent 
        initialFinanceItems={financeData.transactions} 
        initialFinanceCategories={financeData.categories} 
      />
    </main>
  );
}
