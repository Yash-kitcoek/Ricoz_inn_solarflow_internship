import { redirect } from 'next/navigation'

// Login page removed — admin has direct dashboard access.
// This redirect ensures any old bookmarks or links to /login still work.
export default function LoginRedirect() {
  redirect('/')
}
