export default function LoginCard() {
  return (
    <section className="min-h-[80dvh] flex items-center">
      <div className="container-page max-w-md">
        <form
          className="space-y-6"
          action="/api/auth/callback/credentials"
          method="POST"
        >
          <h1 className="text-4xl tracking-tighter">Sign in</h1>
          <p className="text-ink-mute text-sm">
            Use the seeded admin credentials. Loss of password requires
            editing the SQLite users row manually.
          </p>
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="input-line"
            />
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
              Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="input-line"
            />
          </label>
          <input type="hidden" name="csrfToken" id="csrfToken" />
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
          <script
            // The credentials callback expects `csrfToken`. Pull from the cookie.
            dangerouslySetInnerHTML={{
              __html: `(function(){try{document.getElementById('csrfToken').value=decodeURIComponent((document.cookie.match(/next-auth.csrf-token=([^;]+)/)||[])[1]||'').split('%')[0];}catch(e){}})()`,
            }}
          />
        </form>
      </div>
    </section>
  );
}
