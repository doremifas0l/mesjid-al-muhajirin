import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

/**
 * Seeds the admin password in Supabase as a bcrypt hash.
 * Default password: "muhajirin120"
 *
 * How to run:
 *  - Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in the environment.
 *  - Execute this script from the scripts runner.
 */
async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const password = "muhajirin120"
  const hash = await bcrypt.hash(password, 10)

  const { error } = await supabase.from("admin_auth").upsert(
    {
      id: 1,
      password_hash: hash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  )

  if (error) {
    console.error("Failed to seed admin password:", error)
    process.exit(1)
  }

  console.log("Admin password seeded/updated successfully.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
