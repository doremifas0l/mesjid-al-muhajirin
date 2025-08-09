import HomeContent from "@/components/home-content"

export default function Page() {
  // Server Component wrapper; HomeContent is client-side for localStorage and interactivity.
  return (
    <main>
      <HomeContent />
    </main>
  )
}
